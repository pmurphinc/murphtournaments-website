import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Link, useParams } from "wouter";
import { Grip, Maximize2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { Button } from "@/components/ui/button";
import {
  baseCanvasSize,
  clampZoom,
  connectorRadius,
  controlRoomGridSize,
  getBoundedControlKeyPosition,
  getCanvasPanScroll,
  getCenterZoomView,
  getConnectionEndpoint,
  getConnectionPath,
  getConnectorCenter,
  getConnectorEndpoints,
  getConnectorPoint,
  getEmptyBoardResetView,
  getFitToContentView,
  getMidpoint,
  getNodeHeight,
  getPointerDistance,
  hasPointerExceededDragThreshold,
  resolveConnectionDropTargetGameId,
  getViewportPreservingScroll,
  maxZoom,
  minZoom,
  nodeWidth,
  shouldCancelBoardDragsForPinch,
  shouldStartCanvasPan,
  snapCanvasPointToGrid,
  type CanvasPanStart,
  type CanvasPoint,
  type ConnectionFlowType,
  type GameType,
  type ViewportSize,
} from "@/lib/tournamentControlBoard";
export { resolveConnectionDropTargetGameId } from "@/lib/tournamentControlBoard";
import { THE_FINALS_MAPS } from "@/lib/finalsMaps";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

type DragPayload = { teamId: number; fromGameId?: number };
type GameStatus = "draft" | "ready" | "live" | "complete";
type NodeDragState = {
  gameId: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
};
type ConnectionDragState = {
  sourceGameId: number;
  flowType: ConnectionFlowType;
  sourcePoint: CanvasPoint;
  currentPoint: CanvasPoint;
};
type ControlTeamView = {
  id: number;
  name: string;
  managedTeamId?: number | null;
  captainUserId?: number | null;
  captainDiscordId?: string | null;
  captainDisplayName?: string | null;
};
type ControlGameView = {
  id: number;
  tournamentId: number;
  gameType: GameType;
  status: GameStatus;
  displayLabel: string;
  canvasX: number;
  canvasY: number;
  privateLobbyCode?: string | null;
  seriesBestOf?: 1 | 3 | 5;
  mapId?: string | null;
  broadcastUrl?: string | null;
};
type AssignmentView = {
  id: number;
  gameId: number;
  teamId: number;
  slotIndex: number;
  resultPlacement?: number | null;
};
type ConnectionView = {
  id: number;
  tournamentId: number;
  sourceGameId: number;
  targetGameId: number;
  flowType: ConnectionFlowType;
};
type GameStatusClasses = {
  nodeBorder: string;
  statusPill: string;
  accent: string;
};
type PinchZoomStart = {
  distance: number;
  zoom: number;
  focalClientX: number;
  focalClientY: number;
  focalCanvasX: number;
  focalCanvasY: number;
};
type ControlKeyDragStart = {
  pointerId: number;
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
};
type ZoomRailDragStart = {
  pointerId: number;
  clientX: number;
  clientY: number;
  startY: number;
  dragged: boolean;
};
type BoardUndoSnapshot = {
  games: ControlGameView[];
  assignments: AssignmentView[];
  connections: ConnectionView[];
};

type DialogState =
  | { type: "create-team" }
  | { type: "rename"; gameId: number; currentValue: string }
  | { type: "lobby"; gameId: number; currentValue: string }
  | { type: "broadcast"; gameId: number; currentValue: string }
  | { type: "delete"; gameId: number; label: string }
  | {
      type:
        | "bulk-delete-connections"
        | "bulk-return-teams"
        | "bulk-wipe-canvas";
    }
  | null;

const statuses: GameStatus[] = ["draft", "ready", "live", "complete"];
const activeStatuses = new Set<GameStatus>(["draft", "ready", "live"]);

const controlRoomOverlayStorageKey = "murph:tournament-control-room:overlays";
const defaultControlKeyPosition: CanvasPoint = { x: 16, y: 16 };
const defaultZoomRailY = 160;

type ControlRoomOverlayPreferences = {
  controlKeyPosition: CanvasPoint;
  zoomRailY: number;
};

function readControlRoomOverlayPreferences(): Partial<ControlRoomOverlayPreferences> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(controlRoomOverlayStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ControlRoomOverlayPreferences>;
    return {
      controlKeyPosition:
        typeof parsed.controlKeyPosition?.x === "number" &&
        typeof parsed.controlKeyPosition?.y === "number"
          ? parsed.controlKeyPosition
          : undefined,
      zoomRailY:
        typeof parsed.zoomRailY === "number" ? parsed.zoomRailY : undefined,
    };
  } catch {
    return {};
  }
}

function writeControlRoomOverlayPreferences(
  preferences: ControlRoomOverlayPreferences
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      controlRoomOverlayStorageKey,
      JSON.stringify(preferences)
    );
  } catch {
    // Ignore unavailable or full local storage so controls remain usable.
  }
}

function parseDragPayload(value: string): DragPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<DragPayload>;
    if (typeof parsed.teamId !== "number" || !Number.isInteger(parsed.teamId)) {
      return null;
    }
    if (
      parsed.fromGameId !== undefined &&
      (typeof parsed.fromGameId !== "number" ||
        !Number.isInteger(parsed.fromGameId))
    ) {
      return null;
    }
    return { teamId: parsed.teamId, fromGameId: parsed.fromGameId };
  } catch {
    return null;
  }
}

function formatPlacement(value: number) {
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
}

export function getGameStatusClasses(status: GameStatus): GameStatusClasses {
  switch (status) {
    case "draft":
      return {
        nodeBorder: "border-zinc-500/70",
        statusPill: "border-zinc-400/40 bg-zinc-500/15 text-zinc-200",
        accent: "shadow-[0_0_24px_rgba(113,113,122,0.14)]",
      };
    case "ready":
      return {
        nodeBorder: "border-yellow-300/80",
        statusPill: "border-yellow-300/50 bg-yellow-300/15 text-yellow-100",
        accent: "shadow-[0_0_26px_rgba(250,204,21,0.18)]",
      };
    case "live":
      return {
        nodeBorder: "border-emerald-400/80",
        statusPill: "border-emerald-400/50 bg-emerald-400/15 text-emerald-100",
        accent: "shadow-[0_0_26px_rgba(52,211,153,0.18)]",
      };
    case "complete":
      return {
        nodeBorder: "border-red-400/75",
        statusPill: "border-red-400/50 bg-red-500/15 text-red-100",
        accent: "shadow-[0_0_24px_rgba(248,113,113,0.14)]",
      };
  }
}

export function getNextAvailableSlot(
  assignments: Pick<AssignmentView, "slotIndex" | "teamId">[],
  capacity: number,
  preferredSlotIndex?: number,
  teamId?: number
) {
  if (
    teamId !== undefined &&
    assignments.some(assignment => assignment.teamId === teamId)
  )
    return null;
  const occupiedSlots = new Set(
    assignments.map(assignment => assignment.slotIndex)
  );
  const candidates = Array.from({ length: capacity }, (_, index) => index + 1);
  const orderedCandidates = preferredSlotIndex
    ? [
        preferredSlotIndex,
        ...candidates.filter(slot => slot !== preferredSlotIndex),
      ]
    : candidates;
  return (
    orderedCandidates.find(
      slot => slot >= 1 && slot <= capacity && !occupiedSlots.has(slot)
    ) ?? null
  );
}

export function getResolvedDropSlot(
  status: GameStatus,
  assignments: Pick<AssignmentView, "slotIndex" | "teamId">[],
  capacity: number,
  teamId: number,
  preferredSlotIndex?: number
) {
  if (status === "complete") return null;
  return getNextAvailableSlot(
    assignments,
    capacity,
    preferredSlotIndex,
    teamId
  );
}

export function getNextPlacementValue(
  currentPlacement: number | null | undefined,
  capacity: number
) {
  const current = currentPlacement ?? 0;
  if (current < 0 || current >= capacity) return null;
  return current + 1;
}

export function getAvailableTeamsToggleLabel(teamCount: number) {
  return `Available Teams (${teamCount})`;
}

export function getAdvancingPlacements(
  gameType: GameType,
  flowType: ConnectionFlowType = "winner"
) {
  if (gameType === "cashout") return flowType === "winner" ? [1, 2] : [3, 4];
  return flowType === "winner" ? [1] : [2];
}

function getLobbyCodeMessage(
  tournamentName: string,
  lobbyName: string,
  teamName: string,
  code: string
) {
  return `Murph Tournaments lobby code
Tournament: ${tournamentName}
Lobby: ${lobbyName}
Team: ${teamName}
Code: ${code}`;
}

function getRecipientWarning(team: ControlTeamView) {
  if (!team.managedTeamId)
    return "Manual team has no managed captain recipient.";
  if (!team.captainUserId) return "Managed team has no captain recipient.";
  if (!team.captainDiscordId) return "Captain has no Discord ID available.";
  return null;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function shouldSkipNodeDrag(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      '[data-no-node-drag="true"], button, a, input, select, textarea, [role="button"], [draggable="true"]'
    )
  );
}

export default function TournamentControlRoom() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = Number(params.tournamentId);
  const auth = useAuth();
  const utils = trpc.useUtils();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const controlKeyRef = useRef<HTMLDivElement | null>(null);
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [nodeDrag, setNodeDrag] = useState<NodeDragState | null>(null);
  const [connectionDrag, setConnectionDrag] =
    useState<ConnectionDragState | null>(null);
  const [canvasMenuPosition, setCanvasMenuPosition] = useState({
    x: 160,
    y: 120,
  });
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [formName, setFormName] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    number | null
  >(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    number | null
  >(null);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [snapWindowsToGrid, setSnapWindowsToGrid] = useState(true);
  const [minimizedGameIds, setMinimizedGameIds] = useState<Set<number>>(
    () => new Set()
  );
  const [optimisticGamePositions, setOptimisticGamePositions] = useState<
    Map<number, CanvasPoint>
  >(() => new Map());
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [controlKeyMinimized, setControlKeyMinimized] = useState(false);
  const [controlKeyLocked, setControlKeyLocked] = useState(true);
  const [mobileTeamsOpen, setMobileTeamsOpen] = useState(false);
  const [touchHelpOpen, setTouchHelpOpen] = useState(false);
  const [controlKeyPosition, setControlKeyPosition] = useState<CanvasPoint>(
    () =>
      readControlRoomOverlayPreferences().controlKeyPosition ??
      defaultControlKeyPosition
  );
  const [zoomRailY, setZoomRailY] = useState(
    () => readControlRoomOverlayPreferences().zoomRailY ?? defaultZoomRailY
  );
  const [zoomRailMenuOpen, setZoomRailMenuOpen] = useState(false);
  const suppressZoomRailClickRef = useRef(false);
  const [undoSnapshot, setUndoSnapshot] = useState<BoardUndoSnapshot | null>(
    null
  );
  const controlKeyDragRef = useRef<ControlKeyDragStart | null>(null);
  const zoomRailDragRef = useRef<ZoomRailDragStart | null>(null);
  const canvasPanRef = useRef<(CanvasPanStart & { pointerId: number }) | null>(
    null
  );
  const touchPointersRef = useRef<Map<number, PointerEvent>>(new Map());
  const pinchStartRef = useRef<PinchZoomStart | null>(null);
  const isPinchingRef = useRef(false);
  const [measuredPortCenters, setMeasuredPortCenters] = useState<
    Map<string, CanvasPoint>
  >(() => new Map());

  const query = trpc.tournamentControl.get.useQuery(
    { tournamentId },
    {
      enabled:
        Number.isFinite(tournamentId) && auth.user?.loginMethod === "discord",
      retry: false,
    }
  );
  const invalidate = () =>
    utils.tournamentControl.get.invalidate({ tournamentId });
  const mutationOptions = {
    onSuccess: invalidate,
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const createTeam =
    trpc.tournamentControl.createTeam.useMutation(mutationOptions);
  const createCashout =
    trpc.tournamentControl.createCashoutLobby.useMutation(mutationOptions);
  const createFinal =
    trpc.tournamentControl.createFinalRoundMatch.useMutation(mutationOptions);
  const moveGame = trpc.tournamentControl.moveGame.useMutation(mutationOptions);
  const connectGames =
    trpc.tournamentControl.connectGames.useMutation(mutationOptions);
  const deleteGameConnection =
    trpc.tournamentControl.deleteGameConnection.useMutation(mutationOptions);
  const renameGame =
    trpc.tournamentControl.renameGame.useMutation(mutationOptions);
  const setLobbyCode =
    trpc.tournamentControl.setLobbyCode.useMutation(mutationOptions);
  const setGameMap =
    trpc.tournamentControl.setGameMap.useMutation(mutationOptions);
  const setBroadcastUrl =
    trpc.tournamentControl.setBroadcastUrl.useMutation(mutationOptions);
  const randomizeGameMap =
    trpc.tournamentControl.randomizeGameMap.useMutation(mutationOptions);
  const updateStatus =
    trpc.tournamentControl.updateStatus.useMutation(mutationOptions);
  const setPlacement =
    trpc.tournamentControl.setAssignmentResultPlacement.useMutation(
      mutationOptions
    );
  const assignTeam =
    trpc.tournamentControl.assignTeam.useMutation(mutationOptions);
  const moveTeam = trpc.tournamentControl.moveTeam.useMutation(mutationOptions);
  const removeTeam =
    trpc.tournamentControl.removeTeam.useMutation(mutationOptions);
  const removeAssignedTeams =
    trpc.tournamentControl.removeAssignedTeams.useMutation(mutationOptions);
  const deleteGame =
    trpc.tournamentControl.deleteGame.useMutation(mutationOptions);
  const clearTournamentConnections =
    trpc.tournamentControl.clearTournamentConnections.useMutation(
      mutationOptions
    );
  const returnTournamentTeamsToAvailable =
    trpc.tournamentControl.returnTournamentTeamsToAvailable.useMutation(
      mutationOptions
    );
  const clearTournamentCanvas =
    trpc.tournamentControl.clearTournamentCanvas.useMutation(mutationOptions);
  const restoreTournamentBoardSnapshot =
    trpc.tournamentControl.restoreTournamentBoardSnapshot.useMutation({
      onSuccess: () => {
        setUndoSnapshot(null);
        invalidate();
        toast.success("Board restored");
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const setBestOf =
    trpc.tournamentControl.setFinalRoundSeriesBestOf.useMutation(
      mutationOptions
    );
  const saveTemplate =
    trpc.tournamentControl.saveTemplateFromTournament.useMutation({
      onSuccess: () => toast.success("Template saved"),
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const enableViewerLink = trpc.tournamentControl.enableViewerLink.useMutation({
    onSuccess: async data => {
      await navigator.clipboard.writeText(
        `${window.location.origin}${data.path}`
      );
      toast.success("Viewer link copied");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const createClaimLink =
    trpc.tournamentControl.createTeamClaimLink.useMutation({
      onSuccess: async data => {
        await navigator.clipboard.writeText(
          `${window.location.origin}${data.path}`
        );
        toast.success("Team claim link copied");
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const sendLobbyCodeToTeamLeader =
    trpc.tournamentControl.sendLobbyCodeToTeamLeader.useMutation({
      onSuccess: result => {
        for (const item of result.results) {
          if (item.status === "sent")
            toast.success(`Sent code to ${item.teamName}`);
          else toast.error(`${item.teamName}: ${item.message}`);
        }
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const sendLobbyCodeToLobbyLeaders =
    trpc.tournamentControl.sendLobbyCodeToLobbyLeaders.useMutation({
      onSuccess: result => {
        const sent = result.results.filter(
          item => item.status === "sent"
        ).length;
        const failed = result.results.length - sent;
        if (sent)
          toast.success(
            `Sent lobby code to ${sent} leader${sent === 1 ? "" : "s"}`
          );
        if (failed)
          toast.error(
            `${failed} leader${failed === 1 ? "" : "s"} could not be messaged`
          );
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });

  const games = (query.data?.games ?? []) as ControlGameView[];
  const assignments = (query.data?.assignments ?? []) as AssignmentView[];
  const connections = (query.data?.connections ?? []) as ConnectionView[];

  const captureUndoSnapshot = useCallback(
    (): BoardUndoSnapshot => ({
      games: games.map(game => ({
        ...game,
        seriesBestOf:
          game.seriesBestOf === 3 || game.seriesBestOf === 5
            ? game.seriesBestOf
            : 1,
      })),
      assignments: assignments.map(assignment => ({ ...assignment })),
      connections: connections.map(connection => ({ ...connection })),
    }),
    [assignments, connections, games]
  );

  const runDestructiveBoardAction = useCallback(
    (action: () => Promise<unknown>) => {
      const snapshot = captureUndoSnapshot();
      void action()
        .then(() => setUndoSnapshot(snapshot))
        .catch(() => undefined);
    },
    [captureUndoSnapshot]
  );

  const gamesById = useMemo(
    () =>
      new Map<number, ControlGameView>(
        games.map(game => [game.id, game] as const)
      ),
    [games]
  );
  const activeAssignedTeamIds = useMemo(() => {
    const activeGameIds = new Set(
      games.filter(game => activeStatuses.has(game.status)).map(game => game.id)
    );
    return new Set(
      assignments
        .filter(assignment => activeGameIds.has(assignment.gameId))
        .map(assignment => assignment.teamId)
    );
  }, [assignments, games]);
  const teamsById = useMemo(
    () =>
      new Map<number, ControlTeamView>(
        query.data?.teams.map(team => [team.id, team] as const) ?? []
      ),
    [query.data]
  );
  const unassignedTeams =
    query.data?.teams.filter(team => !activeAssignedTeamIds.has(team.id)) ?? [];
  const logicalCanvasSize = useMemo(() => {
    return {
      width: Math.max(
        baseCanvasSize.width,
        ...games.map(game => game.canvasX + 520)
      ),
      height: Math.max(
        baseCanvasSize.height,
        ...games.map(game => game.canvasY + 680)
      ),
    };
  }, [games]);
  const availableTeamsToggleLabel = getAvailableTeamsToggleLabel(
    unassignedTeams.length
  );

  const selectedAssignmentContext = useMemo(() => {
    if (selectedAssignmentId === null) return null;
    const assignment = assignments.find(
      item => item.id === selectedAssignmentId
    );
    if (!assignment) return null;
    const game = gamesById.get(assignment.gameId);
    if (!game) return null;
    const team = teamsById.get(assignment.teamId);
    const capacity = game.gameType === "cashout" ? 4 : 2;
    return { assignment, game, team, capacity };
  }, [assignments, gamesById, selectedAssignmentId, teamsById]);

  const getVisualPosition = useCallback(
    (game: ControlGameView) => {
      if (nodeDrag?.gameId === game.id) return { x: nodeDrag.x, y: nodeDrag.y };
      return (
        optimisticGamePositions.get(game.id) ?? {
          x: game.canvasX,
          y: game.canvasY,
        }
      );
    },
    [nodeDrag, optimisticGamePositions]
  );

  const getPortCenter = useCallback(
    (
      game: ControlGameView,
      port: "top" | "bottom",
      flowType: ConnectionFlowType = "winner"
    ) =>
      measuredPortCenters.get(
        `${game.id}:${port}${port === "bottom" ? `:${flowType}` : ""}`
      ) ??
      getConnectorCenter(
        game,
        port,
        minimizedGameIds.has(game.id),
        getVisualPosition(game),
        flowType
      ),
    [getVisualPosition, measuredPortCenters, minimizedGameIds]
  );

  const assignDroppedTeam = useCallback(
    (
      game: ControlGameView,
      gameAssignments: AssignmentView[],
      payload: DragPayload,
      preferredSlotIndex?: number
    ) => {
      if (game.status === "complete") return;
      if (
        payload.fromGameId === game.id &&
        gameAssignments.some(assignment => assignment.teamId === payload.teamId)
      ) {
        toast.error("That team is already assigned to this lobby.");
        return;
      }
      const capacity = game.gameType === "cashout" ? 4 : 2;
      const slotIndex = getResolvedDropSlot(
        game.status,
        gameAssignments,
        capacity,
        payload.teamId,
        preferredSlotIndex
      );
      if (slotIndex === null) {
        toast.error("This lobby has no open slots.");
        return;
      }
      if (payload.fromGameId) {
        moveTeam.mutate({
          gameId: payload.fromGameId,
          toGameId: game.id,
          teamId: payload.teamId,
          slotIndex,
        });
      } else {
        assignTeam.mutate({
          gameId: game.id,
          teamId: payload.teamId,
          slotIndex,
        });
      }
    },
    [assignTeam, moveTeam]
  );

  useEffect(() => {
    const measurePorts = () => {
      const canvas = canvasRef.current;
      const board = boardRef.current;
      if (!canvas || !board) return;
      const canvasRect = canvas.getBoundingClientRect();
      const next = new Map<string, CanvasPoint>();
      board
        .querySelectorAll<HTMLElement>(
          "[data-connector-port='true'][data-game-id][data-port]"
        )
        .forEach(port => {
          const gameId = port.dataset.gameId;
          const portName = port.dataset.port;
          const flowType = port.dataset.flowType;
          if (!gameId || (portName !== "top" && portName !== "bottom")) return;
          const rect = port.getBoundingClientRect();
          next.set(
            `${gameId}:${portName}${portName === "bottom" ? `:${flowType === "loser" ? "loser" : "winner"}` : ""}`,
            {
              x:
                (rect.left +
                  rect.width / 2 -
                  canvasRect.left +
                  canvas.scrollLeft) /
                zoom,
              y:
                (rect.top +
                  rect.height / 2 -
                  canvasRect.top +
                  canvas.scrollTop) /
                zoom,
            }
          );
        });
      setMeasuredPortCenters(current => {
        if (
          current.size === next.size &&
          Array.from(next).every(([key, value]) => {
            const previous = current.get(key);
            return (
              previous &&
              Math.abs(previous.x - value.x) < 0.5 &&
              Math.abs(previous.y - value.y) < 0.5
            );
          })
        )
          return current;
        return next;
      });
    };
    measurePorts();
    const observer = new ResizeObserver(measurePorts);
    if (boardRef.current) observer.observe(boardRef.current);
    boardRef.current
      ?.querySelectorAll("[data-control-node='true']")
      .forEach(node => observer.observe(node));
    window.addEventListener("resize", measurePorts);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measurePorts);
    };
  }, [assignments, games, minimizedGameIds, nodeDrag, query.data, zoom]);

  useEffect(() => {
    writeControlRoomOverlayPreferences({ controlKeyPosition, zoomRailY });
  }, [controlKeyPosition, zoomRailY]);

  useEffect(() => {
    if (selectedAssignmentId === null) return;
    const assignmentExists = assignments.some(
      assignment => assignment.id === selectedAssignmentId
    );
    if (!assignmentExists) setSelectedAssignmentId(null);
  }, [assignments, selectedAssignmentId]);

  useEffect(() => {
    if (selectedConnectionId === null) return;
    const connectionExists = connections.some(
      connection => connection.id === selectedConnectionId
    );
    if (!connectionExists) setSelectedConnectionId(null);
  }, [connections, selectedConnectionId]);

  useEffect(() => {
    if (selectedGameId === null) return;
    const gameExists = games.some(game => game.id === selectedGameId);
    if (!gameExists) setSelectedGameId(null);
  }, [games, selectedGameId]);

  useEffect(() => {
    setOptimisticGamePositions(current => {
      if (current.size === 0) return current;
      const next = new Map(current);
      for (const game of games) {
        const optimistic = next.get(game.id);
        if (
          optimistic &&
          optimistic.x === game.canvasX &&
          optimistic.y === game.canvasY
        ) {
          next.delete(game.id);
        }
      }
      return next.size === current.size ? current : next;
    });
  }, [games]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === "Escape") {
        setSelectedAssignmentId(null);
        setSelectedConnectionId(null);
        setSelectedGameId(null);
        return;
      }

      if (
        selectedConnectionId !== null &&
        ["Backspace", "Delete"].includes(event.key)
      ) {
        event.preventDefault();
        runDestructiveBoardAction(() =>
          deleteGameConnection.mutateAsync({
            connectionId: selectedConnectionId,
          })
        );
        setSelectedConnectionId(null);
        return;
      }

      if (
        selectedGameId !== null &&
        ["Backspace", "Delete"].includes(event.key)
      ) {
        event.preventDefault();
        runDestructiveBoardAction(() =>
          deleteGame.mutateAsync({ gameId: selectedGameId })
        );
        setSelectedGameId(null);
        return;
      }

      if (!selectedAssignmentContext) return;

      if (["0", "Backspace", "Delete"].includes(event.key)) {
        event.preventDefault();
        setPlacement.mutate({
          assignmentId: selectedAssignmentContext.assignment.id,
          resultPlacement: null,
        });
        return;
      }

      if (!/^[1-4]$/.test(event.key)) return;

      event.preventDefault();
      const resultPlacement = Number(event.key);
      if (resultPlacement > selectedAssignmentContext.capacity) {
        toast.error(
          selectedAssignmentContext.game.gameType === "final_round"
            ? "Final Round matches only support 1st and 2nd."
            : "That placement is not valid for this lobby."
        );
        return;
      }

      setPlacement.mutate({
        assignmentId: selectedAssignmentContext.assignment.id,
        resultPlacement,
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    deleteGame,
    deleteGameConnection,
    runDestructiveBoardAction,
    selectedAssignmentContext,
    selectedConnectionId,
    selectedGameId,
    setPlacement,
  ]);

  const canvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      return {
        x: Math.max(
          0,
          Math.round(
            (clientX -
              (rect?.left ?? 0) +
              (canvasRef.current?.scrollLeft ?? 0)) /
              zoom
          )
        ),
        y: Math.max(
          0,
          Math.round(
            (clientY - (rect?.top ?? 0) + (canvasRef.current?.scrollTop ?? 0)) /
              zoom
          )
        ),
      };
    },
    [zoom]
  );

  useEffect(() => {
    if (!nodeDrag) return;

    const { gameId, offsetX, offsetY } = nodeDrag;
    const getPosition = (clientX: number, clientY: number) => {
      const point = canvasPoint(clientX, clientY);
      const position = {
        x: Math.max(0, Math.round(point.x - offsetX)),
        y: Math.max(0, Math.round(point.y - offsetY)),
      };
      return snapWindowsToGrid ? snapCanvasPointToGrid(position) : position;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (isPinchingRef.current) return;
      const position = getPosition(event.clientX, event.clientY);
      setNodeDrag(current =>
        current?.gameId === gameId ? { ...current, ...position } : current
      );
    };

    const finishDrag = (event: PointerEvent) => {
      if (isPinchingRef.current) {
        setNodeDrag(null);
        return;
      }
      const position = getPosition(event.clientX, event.clientY);
      setOptimisticGamePositions(current =>
        new Map(current).set(gameId, position)
      );
      moveGame.mutate({ gameId, position });
      setNodeDrag(null);
    };

    const cancelDrag = () => setNodeDrag(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", cancelDrag, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", cancelDrag);
    };
  }, [
    canvasPoint,
    moveGame,
    nodeDrag?.gameId,
    nodeDrag?.offsetX,
    nodeDrag?.offsetY,
    snapWindowsToGrid,
  ]);

  useEffect(() => {
    if (!connectionDrag) return;

    const sourceGameId = connectionDrag.sourceGameId;
    const handlePointerMove = (event: PointerEvent) => {
      const currentPoint = canvasPoint(event.clientX, event.clientY);
      setConnectionDrag(current =>
        current?.sourceGameId === sourceGameId
          ? { ...current, currentPoint }
          : current
      );
    };

    const finishConnection = (event: PointerEvent) => {
      const targetGameId = resolveConnectionDropTargetGameId(
        event.target,
        sourceGameId
      );

      if (targetGameId !== null) {
        connectGames.mutate({
          tournamentId,
          sourceGameId,
          targetGameId,
          flowType: connectionDrag.flowType,
        });
      }
      setConnectionDrag(null);
    };

    const cancelConnection = () => setConnectionDrag(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishConnection, { once: true });
    window.addEventListener("pointercancel", cancelConnection, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishConnection);
      window.removeEventListener("pointercancel", cancelConnection);
    };
  }, [
    canvasPoint,
    connectGames,
    connectionDrag?.sourceGameId,
    connectionDrag?.flowType,
    tournamentId,
  ]);

  useEffect(() => {
    if (!isPanning) return;
    const handlePointerUp = () => setIsPanning(false);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isPanning]);

  const cancelBoardDragsForPinch = useCallback(() => {
    isPinchingRef.current = true;
    setNodeDrag(null);
    setConnectionDrag(null);
    setDragPayload(null);
    canvasPanRef.current = null;
    setIsPanning(false);
  }, []);

  const applyBoardView = useCallback(
    (view: { zoom: number; scrollLeft: number; scrollTop: number }) => {
      const element = canvasRef.current;
      if (!element) return;
      setZoom(view.zoom);
      requestAnimationFrame(() => {
        element.scrollLeft = view.scrollLeft;
        element.scrollTop = view.scrollTop;
      });
    },
    []
  );

  const zoomBoardFromCenter = useCallback(
    (zoomDelta: number) => {
      const element = canvasRef.current;
      if (!element) return;
      const nextView = getCenterZoomView(
        { width: element.clientWidth, height: element.clientHeight },
        { scrollLeft: element.scrollLeft, scrollTop: element.scrollTop },
        zoom,
        zoom + zoomDelta
      );
      applyBoardView(nextView);
    },
    [applyBoardView, zoom]
  );

  const fitOrResetBoardView = useCallback(() => {
    const element = canvasRef.current;
    if (!element) return;
    applyBoardView(
      getFitToContentView(games, minimizedGameIds, {
        width: element.clientWidth,
        height: element.clientHeight,
      })
    );
  }, [applyBoardView, games, minimizedGameIds]);

  const clampZoomRailY = useCallback((value: number) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const railHeight = 250;
    const viewportHeight = canvasRect?.height ?? window.innerHeight;
    return Math.min(
      Math.max(8, value),
      Math.max(8, viewportHeight - railHeight - 8)
    );
  }, []);

  const startZoomRailDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      setZoomRailMenuOpen(false);
      zoomRailDragRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        startY: zoomRailY,
        dragged: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [zoomRailY]
  );

  const dragZoomRail = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const dragStart = zoomRailDragRef.current;
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - dragStart.clientX;
      const deltaY = event.clientY - dragStart.clientY;
      if (hasPointerExceededDragThreshold(dragStart, event)) {
        dragStart.dragged = true;
        suppressZoomRailClickRef.current = true;
        setZoomRailMenuOpen(false);
      }
      if (!dragStart.dragged) return;
      event.preventDefault();
      event.stopPropagation();
      setZoomRailY(clampZoomRailY(dragStart.startY + deltaY));
    },
    [clampZoomRailY]
  );

  const finishZoomRailDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const dragStart = zoomRailDragRef.current;
      if (dragStart?.pointerId !== event.pointerId) return;
      event.stopPropagation();
      if (dragStart.dragged) {
        suppressZoomRailClickRef.current = true;
      }
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      zoomRailDragRef.current = null;
    },
    []
  );

  const handleZoomRailGripClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (suppressZoomRailClickRef.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressZoomRailClickRef.current = false;
        return;
      }
      setZoomRailMenuOpen(open => !open);
    },
    []
  );

  const undoBoardAction = useCallback(() => {
    if (!undoSnapshot) return;
    restoreTournamentBoardSnapshot.mutate({
      tournamentId,
      snapshot: undoSnapshot,
    });
  }, [restoreTournamentBoardSnapshot, tournamentId, undoSnapshot]);

  const openDialog = (state: Exclude<DialogState, null>, defaultValue = "") => {
    setDialogState(state);
    setFormName(defaultValue);
  };

  const cycleAssignmentPlacement = useCallback(
    (assignment: AssignmentView, capacity: number) => {
      setPlacement.mutate({
        assignmentId: assignment.id,
        resultPlacement: getNextPlacementValue(
          assignment.resultPlacement ?? null,
          capacity
        ),
      });
    },
    [setPlacement]
  );

  const startControlKeyDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (controlKeyLocked || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      controlKeyDragRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        startX: controlKeyPosition.x,
        startY: controlKeyPosition.y,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [controlKeyLocked, controlKeyPosition.x, controlKeyPosition.y]
  );

  const dragControlKey = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const dragStart = controlKeyDragRef.current;
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const keyRect = controlKeyRef.current?.getBoundingClientRect();
      const nextPosition = {
        x: dragStart.startX + event.clientX - dragStart.clientX,
        y: dragStart.startY + event.clientY - dragStart.clientY,
      };
      setControlKeyPosition(
        canvasRect && keyRect
          ? getBoundedControlKeyPosition(
              nextPosition,
              { width: canvasRect.width, height: canvasRect.height },
              { width: keyRect.width, height: keyRect.height }
            )
          : nextPosition
      );
    },
    []
  );

  const finishControlKeyDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (controlKeyDragRef.current?.pointerId !== event.pointerId) return;
      controlKeyDragRef.current = null;
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    []
  );

  const toggleMinimizedGame = (gameId: number) => {
    setMinimizedGameIds(current => {
      const next = new Set(current);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  if (auth.loading) return <ControlState title="Authenticating organizer…" />;
  if (!auth.user) {
    return (
      <ControlState
        title="Organizer Discord sign-in required"
        description="Sign in with Discord to open Tournament Control Room tools."
        showDiscordSignIn
      />
    );
  }
  if (auth.user.loginMethod !== "discord") {
    return (
      <ControlState
        title="Organizer Discord sign-in required"
        description="Tournament Control uses Discord identity. Sign in with Discord to continue."
        showDiscordSignIn
      />
    );
  }
  if (query.isLoading)
    return <ControlState title="Verifying Discord organizer roles…" />;
  if (query.error) {
    return (
      <ControlState
        title={
          query.error.message.includes("configuration")
            ? "Discord role configuration error"
            : query.error.message.includes("Unable to verify")
              ? "Discord service verification failed"
              : "Tournament Control role required"
        }
        description={query.error.message}
      />
    );
  }
  if (!query.data) return <ControlState title="Tournament not found" />;

  return (
    <section className="min-h-screen bg-black text-white">
      <header className="border-b border-neon-gold/30 bg-zinc-950 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">
              Admin Tournament Control Room
            </p>
            <h1 className="mt-2 font-mono text-3xl font-black uppercase">
              {query.data.tournament.name}
            </h1>
            <p className="text-sm text-white/60">
              {query.data.tournament.eventStatus} ·{" "}
              {query.data.tournament.currentStage}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="border-neon-gold/40 text-neon-gold hover:bg-neon-gold/10"
              onClick={() => enableViewerLink.mutate({ tournamentId })}
            >
              Copy Viewer Link
            </Button>
            <Button
              variant="outline"
              className="border-neon-gold/40 text-neon-gold hover:bg-neon-gold/10"
              onClick={() => {
                const name = window.prompt(
                  "Template name",
                  `${query.data.tournament.name} Template`
                );
                if (!name) return;
                const visibility = window.confirm("Make this template public?")
                  ? "public"
                  : "private";
                saveTemplate.mutate({ tournamentId, name, visibility });
              }}
            >
              Save Template
            </Button>
            <Link
              href="/admin/tournaments/control"
              className="inline-flex rounded border border-[#FFD700]/70 bg-[#FFD700] px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-black shadow-[0_0_18px_rgba(255,215,0,0.22)] transition hover:bg-[#D4AF37]"
            >
              ← Tournament Rooms
            </Link>
            <div className="rounded border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/55">
              Click team + 1–4 score · drag lobby frame to move · drag bottom
              node onto a lobby to connect
            </div>
          </div>
        </div>
      </header>
      <div className="grid h-[calc(100dvh-8.5rem)] min-h-0 grid-cols-1 grid-rows-[auto_1fr] overflow-hidden lg:grid-cols-[19rem_1fr] lg:grid-rows-1">
        <aside className="border-b border-white/10 bg-zinc-950/95 p-3 lg:min-h-0 lg:overflow-auto lg:border-b-0 lg:border-r lg:p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-neon-gold/35 bg-neon-gold/10 px-3 py-2 font-mono text-sm font-black uppercase tracking-wider text-neon-gold transition hover:bg-neon-gold/15 lg:hidden"
            aria-expanded={mobileTeamsOpen}
            onClick={() => setMobileTeamsOpen(open => !open)}
          >
            <span>{availableTeamsToggleLabel}</span>
            <span className="text-lg leading-none">
              {mobileTeamsOpen ? "−" : "+"}
            </span>
          </button>
          <h2 className="hidden font-mono text-lg font-bold text-neon-gold lg:block">
            Available Teams
          </h2>
          <div
            className={`${mobileTeamsOpen ? "block" : "hidden"} mt-3 max-h-[24dvh] overflow-auto pr-1 lg:mt-0 lg:block lg:max-h-none lg:overflow-visible lg:pr-0`}
          >
            <p className="mb-3 text-xs text-white/50 lg:mb-4">
              Teams assigned only to completed games remain available for new
              active games.
            </p>
            <div
              className="space-y-2"
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                const payload = parseDragPayload(
                  event.dataTransfer.getData("application/json")
                );
                if (payload?.fromGameId) {
                  removeTeam.mutate({
                    gameId: payload.fromGameId,
                    teamId: payload.teamId,
                  });
                }
              }}
            >
              {unassignedTeams.length === 0 ? (
                <p className="rounded border border-dashed border-white/15 p-4 text-sm text-white/50">
                  No available teams.
                </p>
              ) : (
                unassignedTeams.map(team => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onDragStart={() => setDragPayload({ teamId: team.id })}
                    onCreateClaimLink={
                      !team.managedTeamId
                        ? () => createClaimLink.mutate({ teamId: team.id })
                        : undefined
                    }
                  />
                ))
              )}
            </div>
          </div>
        </aside>
        <div className="relative min-h-0 overflow-hidden">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <main
                ref={canvasRef}
                className={`relative h-full min-h-0 touch-none overflow-auto overscroll-contain bg-[radial-gradient(circle_at_top,#4d39091a,transparent_32rem),linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:auto,40px_40px,40px_40px] ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
                onWheel={event => {
                  if (!event.shiftKey) return;
                  event.preventDefault();
                  const element = canvasRef.current;
                  const rect = element?.getBoundingClientRect();
                  if (!element || !rect) return;
                  const focalCanvasPoint = {
                    x: (event.clientX - rect.left + element.scrollLeft) / zoom,
                    y: (event.clientY - rect.top + element.scrollTop) / zoom,
                  };
                  const zoomDelta = event.deltaY > 0 ? -0.08 : 0.08;
                  const nextZoom = clampZoom(zoom + zoomDelta);
                  const nextScroll = getViewportPreservingScroll(
                    focalCanvasPoint,
                    { x: event.clientX, y: event.clientY },
                    rect,
                    nextZoom
                  );
                  setZoom(nextZoom);
                  requestAnimationFrame(() => {
                    element.scrollLeft = nextScroll.scrollLeft;
                    element.scrollTop = nextScroll.scrollTop;
                  });
                }}
                onPointerDown={event => {
                  if (event.pointerType === "touch") {
                    touchPointersRef.current.set(
                      event.pointerId,
                      event.nativeEvent
                    );
                    if (event.currentTarget.setPointerCapture) {
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }
                    if (
                      shouldCancelBoardDragsForPinch(
                        touchPointersRef.current.size
                      )
                    ) {
                      cancelBoardDragsForPinch();
                      const element = canvasRef.current;
                      const rect = element?.getBoundingClientRect();
                      const pointers = Array.from(
                        touchPointersRef.current.values()
                      );
                      if (element && rect && pointers[0] && pointers[1]) {
                        const midpoint = getMidpoint(pointers[0], pointers[1]);
                        pinchStartRef.current = {
                          distance: getPointerDistance(
                            pointers[0],
                            pointers[1]
                          ),
                          zoom,
                          focalClientX: midpoint.x,
                          focalClientY: midpoint.y,
                          focalCanvasX:
                            (midpoint.x - rect.left + element.scrollLeft) /
                            zoom,
                          focalCanvasY:
                            (midpoint.y - rect.top + element.scrollTop) / zoom,
                        };
                        canvasPanRef.current = null;
                        setIsPanning(false);
                      }
                      event.preventDefault();
                      return;
                    }
                  }

                  if (event.pointerType === "touch" && isPinchingRef.current)
                    return;

                  if (event.button !== 0 || !shouldStartCanvasPan(event.target))
                    return;
                  const element = canvasRef.current;
                  if (!element) return;
                  event.preventDefault();
                  canvasPanRef.current = {
                    pointerId: event.pointerId,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    scrollLeft: element.scrollLeft,
                    scrollTop: element.scrollTop,
                  };
                  if (event.currentTarget.setPointerCapture) {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }
                  setIsPanning(true);
                }}
                onPointerMove={event => {
                  if (
                    event.pointerType === "touch" &&
                    touchPointersRef.current.has(event.pointerId)
                  ) {
                    touchPointersRef.current.set(
                      event.pointerId,
                      event.nativeEvent
                    );
                    if (
                      touchPointersRef.current.size >= 2 &&
                      pinchStartRef.current
                    ) {
                      const element = canvasRef.current;
                      const rect = element?.getBoundingClientRect();
                      const pointers = Array.from(
                        touchPointersRef.current.values()
                      );
                      if (!element || !rect || !pointers[0] || !pointers[1])
                        return;
                      event.preventDefault();
                      const nextDistance = getPointerDistance(
                        pointers[0],
                        pointers[1]
                      );
                      if (pinchStartRef.current.distance <= 0) return;
                      const nextZoom = clampZoom(
                        pinchStartRef.current.zoom *
                          (nextDistance / pinchStartRef.current.distance)
                      );
                      const nextScroll = getViewportPreservingScroll(
                        {
                          x: pinchStartRef.current.focalCanvasX,
                          y: pinchStartRef.current.focalCanvasY,
                        },
                        {
                          x: pinchStartRef.current.focalClientX,
                          y: pinchStartRef.current.focalClientY,
                        },
                        rect,
                        nextZoom
                      );
                      setZoom(nextZoom);
                      element.scrollLeft = nextScroll.scrollLeft;
                      element.scrollTop = nextScroll.scrollTop;
                      return;
                    }
                  }

                  const panStart = canvasPanRef.current;
                  if (!panStart || panStart.pointerId !== event.pointerId)
                    return;
                  const element = canvasRef.current;
                  if (!element) return;
                  event.preventDefault();
                  const nextScroll = getCanvasPanScroll(
                    panStart,
                    event.clientX,
                    event.clientY
                  );
                  element.scrollLeft = nextScroll.scrollLeft;
                  element.scrollTop = nextScroll.scrollTop;
                }}
                onPointerUp={event => {
                  if (event.pointerType === "touch") {
                    touchPointersRef.current.delete(event.pointerId);
                    if (touchPointersRef.current.size < 2)
                      pinchStartRef.current = null;
                    if (touchPointersRef.current.size === 0)
                      isPinchingRef.current = false;
                  }
                  if (canvasPanRef.current?.pointerId === event.pointerId) {
                    canvasPanRef.current = null;
                    setIsPanning(false);
                  }
                  if (
                    event.currentTarget.hasPointerCapture?.(event.pointerId)
                  ) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={event => {
                  if (event.pointerType === "touch") {
                    touchPointersRef.current.delete(event.pointerId);
                    if (touchPointersRef.current.size < 2)
                      pinchStartRef.current = null;
                    if (touchPointersRef.current.size === 0)
                      isPinchingRef.current = false;
                  }
                  if (canvasPanRef.current?.pointerId === event.pointerId) {
                    canvasPanRef.current = null;
                    setIsPanning(false);
                  }
                }}
                onContextMenu={event => {
                  setCanvasMenuPosition(
                    canvasPoint(event.clientX, event.clientY)
                  );
                }}
              >
                <div className="pointer-events-none sticky left-3 top-0 z-[65] h-0 w-0 sm:left-4">
                  <div
                    data-no-canvas-pan="true"
                    className="pointer-events-auto flex w-20 flex-col items-center overflow-hidden rounded-xl sm:w-24 border border-[#FFD700]/35 bg-zinc-950/95 font-mono text-white shadow-[0_0_24px_rgba(255,215,0,0.14)] backdrop-blur"
                    style={{ transform: `translateY(${zoomRailY}px)` }}
                    onContextMenu={event => event.stopPropagation()}
                  >
                    <DropdownMenu
                      open={zoomRailMenuOpen}
                      onOpenChange={setZoomRailMenuOpen}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          data-no-canvas-pan="true"
                          className="flex min-h-12 w-full touch-none flex-col items-center justify-center gap-0.5 border-b border-white/10 text-white/45 transition hover:bg-[#FFD700]/10 hover:text-[#FFD700]"
                          title="Board options · drag to move zoom controls"
                          aria-label="Board options and draggable zoom controls"
                          onPointerDownCapture={event => event.preventDefault()}
                          onPointerDown={startZoomRailDrag}
                          onPointerMove={dragZoomRail}
                          onPointerUp={finishZoomRailDrag}
                          onPointerCancel={finishZoomRailDrag}
                          onClick={handleZoomRailGripClick}
                        >
                          <Grip className="h-4 w-4" aria-hidden="true" />
                          <span className="text-[9px] font-black uppercase leading-none tracking-tight">
                            Options
                          </span>
                          <span className="text-[8px] uppercase leading-none text-white/40">
                            Move
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        side="right"
                        className="border-[#FFD700]/35 bg-black/95 font-mono text-yellow-50 shadow-[0_0_24px_rgba(255,215,0,0.16)]"
                      >
                        <DropdownMenuItem
                          className="flex cursor-pointer items-center justify-between gap-3 focus:bg-[#FFD700]/15 focus:text-[#FFD700]"
                          onSelect={event => event.preventDefault()}
                          onClick={() =>
                            setSnapWindowsToGrid(current => !current)
                          }
                        >
                          <span>Snap to Grid</span>
                          <Switch
                            checked={snapWindowsToGrid}
                            onCheckedChange={setSnapWindowsToGrid}
                            onClick={event => event.stopPropagation()}
                            aria-label="Toggle snap to grid"
                            className="border-[#FFD700]/40 bg-zinc-800 data-[state=checked]:bg-[#FFD700]"
                          />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-200 focus:bg-red-950/60 focus:text-red-100"
                          onClick={() =>
                            setDialogState({ type: "bulk-delete-connections" })
                          }
                        >
                          Delete All Connections
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-200 focus:bg-red-950/60 focus:text-red-100"
                          onClick={() =>
                            setDialogState({ type: "bulk-return-teams" })
                          }
                        >
                          Return All Teams to Available
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-200 focus:bg-red-950/60 focus:text-red-100"
                          onClick={() =>
                            setDialogState({ type: "bulk-wipe-canvas" })
                          }
                        >
                          Wipe Canvas
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      type="button"
                      data-no-canvas-pan="true"
                      disabled={
                        !undoSnapshot ||
                        restoreTournamentBoardSnapshot.isPending
                      }
                      className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 border-b border-white/10 text-white/70 transition hover:bg-[#FFD700]/10 hover:text-[#FFD700] disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent"
                      title="Undo last destructive board action"
                      aria-label="Undo last destructive board action"
                      onPointerDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation();
                        undoBoardAction();
                      }}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span className="text-[9px] font-black uppercase leading-none">
                        Undo
                      </span>
                    </button>
                    <button
                      type="button"
                      data-no-canvas-pan="true"
                      disabled={zoom >= maxZoom}
                      className="flex min-h-12 w-full flex-col items-center justify-center border-b border-white/10 text-lg font-black leading-none text-white/80 transition hover:bg-[#FFD700]/10 hover:text-[#FFD700] disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent"
                      title={`Zoom in · ${Math.round(zoom * 100)}%`}
                      aria-label="Zoom in"
                      onPointerDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation();
                        zoomBoardFromCenter(0.1);
                      }}
                    >
                      +
                      <span className="text-[9px] font-black uppercase leading-none">
                        Zoom In
                      </span>
                    </button>
                    <button
                      type="button"
                      data-no-canvas-pan="true"
                      disabled={zoom <= minZoom}
                      className="flex min-h-12 w-full flex-col items-center justify-center border-b border-white/10 text-xl font-black leading-none text-white/80 transition hover:bg-[#FFD700]/10 hover:text-[#FFD700] disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:bg-transparent"
                      title={`Zoom out · ${Math.round(zoom * 100)}%`}
                      aria-label="Zoom out"
                      onPointerDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation();
                        zoomBoardFromCenter(-0.1);
                      }}
                    >
                      −
                      <span className="text-[9px] font-black uppercase leading-none">
                        Zoom Out
                      </span>
                    </button>
                    <button
                      type="button"
                      data-no-canvas-pan="true"
                      className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 border-b border-white/10 text-white/70 transition hover:bg-[#FFD700]/10 hover:text-[#FFD700]"
                      title={
                        games.length > 0
                          ? "Fit lobbies to view"
                          : "Reset board view"
                      }
                      aria-label={
                        games.length > 0
                          ? "Fit lobbies to view"
                          : "Reset board view"
                      }
                      onPointerDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation();
                        fitOrResetBoardView();
                      }}
                    >
                      <Maximize2 className="h-4 w-4" aria-hidden="true" />
                      <span className="text-[9px] font-black uppercase leading-none">
                        Fit
                      </span>
                    </button>
                    <div className="w-full bg-black/70 px-1 py-1.5 text-center text-[10px] font-black leading-none tracking-tight text-[#FFD700]">
                      {Math.round(zoom * 100)}%
                    </div>
                    <div
                      aria-label="Admin connector legend"
                      className="w-full border-t border-white/10 bg-black/60 px-1.5 py-1 text-[9px] leading-snug text-white/60"
                    >
                      <p>
                        <span className="font-black text-[#FFD700]">W</span> —
                        Winners
                      </p>
                      <p>
                        <span className="font-black text-slate-100">L</span> —
                        Losers
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none sticky left-0 top-0 z-[55] hidden h-0 w-0 lg:block">
                  <div
                    ref={controlKeyRef}
                    data-no-canvas-pan="true"
                    className={`pointer-events-none absolute rounded-xl border bg-black/90 font-mono shadow-[0_0_28px_rgba(255,215,0,0.16)] backdrop-blur ${
                      controlKeyMinimized
                        ? "w-max border-[#FFD700]/50"
                        : "w-[min(26rem,calc(100vw-2rem))] border-[#FFD700]/35 p-4"
                    }`}
                    style={{
                      transform: `translate(${controlKeyPosition.x}px, ${controlKeyPosition.y}px)`,
                    }}
                    onContextMenu={event => event.stopPropagation()}
                  >
                    {controlKeyMinimized ? (
                      <button
                        type="button"
                        data-no-canvas-pan="true"
                        className="pointer-events-auto flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#FFD700] transition hover:bg-[#FFD700]/10"
                        onClick={event => {
                          event.stopPropagation();
                          setControlKeyMinimized(false);
                        }}
                      >
                        <span className="h-2 w-2 rounded-full bg-[#FFD700] shadow-[0_0_12px_#FFD700]" />
                        Controls · {Math.round(zoom * 100)}%
                      </button>
                    ) : (
                      <>
                        <div
                          data-no-canvas-pan="true"
                          className="pointer-events-auto mb-3 flex items-center justify-between gap-3 rounded border border-white/10 bg-white/5 px-2 py-2"
                        >
                          <div
                            data-no-canvas-pan="true"
                            data-control-key-drag-handle="true"
                            className={`flex min-w-0 flex-1 items-center gap-2 ${
                              controlKeyLocked
                                ? "cursor-default"
                                : "cursor-grab active:cursor-grabbing"
                            }`}
                            onPointerDown={startControlKeyDrag}
                            onPointerMove={dragControlKey}
                            onPointerUp={finishControlKeyDrag}
                            onPointerCancel={finishControlKeyDrag}
                          >
                            <span className="h-2 w-2 rounded-full bg-[#FFD700] shadow-[0_0_12px_#FFD700]" />
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#FFD700]">
                                PC Controls
                              </p>
                              <p className="text-[10px] uppercase tracking-wider text-white/45">
                                {controlKeyLocked
                                  ? "Locked — click Unlock to reposition"
                                  : "Unlocked — drag this header to reposition"}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              data-no-canvas-pan="true"
                              data-control-key-action="true"
                              className={`rounded border px-2 py-1 text-[10px] font-black uppercase transition ${
                                controlKeyLocked
                                  ? "border-[#FFD700]/50 bg-[#FFD700]/15 text-[#FFD700]"
                                  : "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                              }`}
                              onPointerDown={event => event.stopPropagation()}
                              onClick={event => {
                                event.stopPropagation();
                                setControlKeyLocked(current => !current);
                              }}
                            >
                              {controlKeyLocked ? "Unlock" : "Lock"}
                            </button>
                            <button
                              type="button"
                              data-no-canvas-pan="true"
                              data-control-key-action="true"
                              className="rounded border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/70 transition hover:border-[#FFD700]/60 hover:text-[#FFD700]"
                              onPointerDown={event => event.stopPropagation()}
                              onClick={event => {
                                event.stopPropagation();
                                setControlKeyMinimized(true);
                              }}
                            >
                              Min
                            </button>
                          </div>
                        </div>
                        <div className="grid gap-2 text-[11px] text-white/75 sm:grid-cols-2">
                          {(
                            [
                              [
                                "bg-cyan-400/15 text-cyan-100 border-cyan-300/30",
                                "Drag empty board",
                                "Pan around the bracket",
                              ],
                              [
                                "bg-fuchsia-400/15 text-fuchsia-100 border-fuchsia-300/30",
                                "+ / − or Shift + wheel",
                                "Zoom in and out",
                              ],
                              [
                                "bg-emerald-400/15 text-emerald-100 border-emerald-300/30",
                                "Right-click empty board",
                                "Add a team or lobby",
                              ],
                              [
                                "bg-orange-400/15 text-orange-100 border-orange-300/30",
                                "Drag lobby header",
                                "Reposition a lobby",
                              ],
                              [
                                "bg-sky-400/15 text-sky-100 border-sky-300/30",
                                "Drag a team card",
                                "Place or move a team",
                              ],
                              [
                                "bg-lime-400/15 text-lime-100 border-lime-300/30",
                                "Select team, press 1–4",
                                "Set final placement",
                              ],
                              [
                                "bg-purple-400/15 text-purple-100 border-purple-300/30",
                                "Mobile: double-tap team",
                                "Cycle placement",
                              ],
                              [
                                "bg-yellow-300/15 text-yellow-100 border-yellow-200/40",
                                "Drag W / L connector",
                                <span>
                                  <span className="font-black text-[#FFD700]">
                                    W
                                  </span>{" "}
                                  — Winners ·{" "}
                                  <span className="font-black text-slate-100">
                                    L
                                  </span>{" "}
                                  — Losers
                                </span>,
                              ],
                              [
                                "bg-red-400/15 text-red-100 border-red-300/30",
                                "Select connection, press Del",
                                "Remove connection",
                              ],
                            ] satisfies [string, string, ReactNode][]
                          ).map(([classes, action, detail]) => (
                            <div
                              key={action}
                              className={`rounded border px-2.5 py-2 ${classes}`}
                            >
                              <span className="block text-[10px] font-black uppercase tracking-wider">
                                {action}
                              </span>
                              <span className="text-white/65">{detail}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="pointer-events-none sticky left-2 top-2 z-[54] h-0 w-0 lg:hidden">
                  {touchHelpOpen ? (
                    <div
                      className="pointer-events-auto ml-2 mt-2 max-h-[38dvh] w-[min(18rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-cyan-300/25 bg-zinc-950/90 p-3 shadow-[0_0_24px_rgba(34,211,238,0.12)] backdrop-blur"
                      data-no-canvas-pan="true"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-cyan-100">
                          Touch Ops
                        </p>
                        <button
                          type="button"
                          className="rounded border border-white/15 bg-white/10 px-2 py-1 font-mono text-[10px] font-black uppercase text-white/70 transition hover:border-cyan-200/60 hover:text-cyan-100"
                          onClick={() => setTouchHelpOpen(false)}
                        >
                          Close
                        </button>
                      </div>
                      <ul className="mt-2 space-y-1.5 font-mono text-[11px] text-white/70">
                        <li>• Long-press teams/lobbies to open options.</li>
                        <li>• Drag teams into lobbies or exact slots.</li>
                        <li>
                          • Double-tap an assigned team to cycle placement.
                        </li>
                        <li>• Drag the empty grid background to pan.</li>
                        <li>• Pinch with two fingers to zoom the board.</li>
                      </ul>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-no-canvas-pan="true"
                      className="pointer-events-auto ml-2 mt-2 rounded-full border border-cyan-300/40 bg-zinc-950/90 px-3 py-2 font-mono text-[11px] font-black uppercase tracking-wider text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)] backdrop-blur transition hover:bg-cyan-300/10"
                      onClick={() => setTouchHelpOpen(true)}
                    >
                      Touch Help
                    </button>
                  )}
                </div>
                <div
                  className="relative"
                  style={{
                    width: logicalCanvasSize.width * zoom,
                    height: logicalCanvasSize.height * zoom,
                  }}
                >
                  <div
                    className="absolute left-0 top-0"
                    style={{
                      width: logicalCanvasSize.width,
                      height: logicalCanvasSize.height,
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                    }}
                    ref={boardRef}
                  >
                    <svg
                      className="absolute inset-0 z-0 overflow-visible"
                      width={logicalCanvasSize.width}
                      height={logicalCanvasSize.height}
                    >
                      {connections.map(connection => {
                        const sourceGame = gamesById.get(
                          connection.sourceGameId
                        );
                        const targetGame = gamesById.get(
                          connection.targetGameId
                        );
                        if (!sourceGame || !targetGame) return null;
                        const endpoints = getConnectorEndpoints(
                          getPortCenter(
                            sourceGame,
                            "bottom",
                            connection.flowType
                          ),
                          getPortCenter(targetGame, "top")
                        );
                        const source = endpoints.source;
                        const target = endpoints.target;
                        const isSelectedConnection =
                          selectedConnectionId === connection.id;
                        const connectionPath = getConnectionPath(
                          source,
                          target
                        );
                        const isLoserConnection =
                          connection.flowType === "loser";
                        const baseStroke = isLoserConnection
                          ? "#F8FAFC"
                          : "#FFD700";
                        const selectedStroke = isLoserConnection
                          ? "#FFFFFF"
                          : "#FFF3A3";
                        const selectedGlow = isLoserConnection
                          ? "#CBD5E1"
                          : "#FFF3A3";
                        const connectionLabel = isLoserConnection
                          ? "Loser"
                          : "Winner";
                        const selectConnection = () => {
                          setSelectedConnectionId(connection.id);
                          setSelectedAssignmentId(null);
                          setSelectedGameId(null);
                        };
                        const deleteConnection = () => {
                          runDestructiveBoardAction(() =>
                            deleteGameConnection.mutateAsync({
                              connectionId: connection.id,
                            })
                          );
                          setSelectedConnectionId(current =>
                            current === connection.id ? null : current
                          );
                        };
                        return (
                          <ContextMenu key={connection.id}>
                            <ContextMenuTrigger asChild>
                              <g
                                data-connection-line="true"
                                className="cursor-pointer"
                                onPointerDown={event => {
                                  event.stopPropagation();
                                }}
                                onClick={event => {
                                  event.stopPropagation();
                                  selectConnection();
                                }}
                                onDoubleClick={event => {
                                  event.stopPropagation();
                                  deleteConnection();
                                }}
                                onContextMenu={event => {
                                  event.stopPropagation();
                                  selectConnection();
                                }}
                              >
                                <path
                                  d={connectionPath}
                                  fill="none"
                                  stroke="transparent"
                                  strokeWidth="18"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ pointerEvents: "stroke" }}
                                />
                                {isSelectedConnection && (
                                  <path
                                    d={connectionPath}
                                    fill="none"
                                    stroke={selectedGlow}
                                    strokeOpacity={
                                      isLoserConnection ? "0.5" : "0.55"
                                    }
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ pointerEvents: "none" }}
                                  />
                                )}
                                <path
                                  d={connectionPath}
                                  fill="none"
                                  stroke={
                                    isSelectedConnection
                                      ? selectedStroke
                                      : baseStroke
                                  }
                                  strokeOpacity={
                                    isSelectedConnection ? "1" : "0.82"
                                  }
                                  strokeWidth={isSelectedConnection ? "7" : "6"}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ pointerEvents: "none" }}
                                />
                              </g>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem onClick={selectConnection}>
                                Select {connectionLabel} Connection
                              </ContextMenuItem>
                              <ContextMenuItem
                                className="text-red-300"
                                onClick={deleteConnection}
                              >
                                Delete Connection
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })}
                      {connectionDrag && (
                        <path
                          d={getConnectionPath(
                            connectionDrag.sourcePoint,
                            connectionDrag.currentPoint
                          )}
                          fill="none"
                          stroke={
                            connectionDrag.flowType === "loser"
                              ? "#F8FAFC"
                              : "#FFD700"
                          }
                          strokeDasharray="8 8"
                          strokeOpacity="0.85"
                          strokeWidth="6"
                        />
                      )}
                    </svg>
                    {games.length === 0 && (
                      <div className="absolute left-8 top-8 rounded border border-dashed border-neon-gold/40 bg-black/70 p-6">
                        <h3 className="font-mono text-xl font-bold text-neon-gold">
                          Empty board
                        </h3>
                        <p className="text-sm text-white/60">
                          Right-click the canvas to create a team or lobby.
                        </p>
                      </div>
                    )}
                    {games.map(game => {
                      const gameAssignments = assignments.filter(
                        assignment => assignment.gameId === game.id
                      );
                      const capacity = game.gameType === "cashout" ? 4 : 2;
                      const isComplete = game.status === "complete";
                      const isMinimized = minimizedGameIds.has(game.id);
                      const visualPosition = getVisualPosition(game);
                      const statusClasses = getGameStatusClasses(game.status);

                      return (
                        <ContextMenu key={game.id}>
                          <ContextMenuTrigger asChild>
                            <div
                              data-control-node="true"
                              onContextMenu={event => event.stopPropagation()}
                              onClick={event => {
                                event.stopPropagation();
                                setSelectedGameId(game.id);
                                setSelectedConnectionId(null);
                                setSelectedAssignmentId(null);
                              }}
                              onPointerDown={event => {
                                if (
                                  event.pointerType === "touch" ||
                                  isPinchingRef.current
                                )
                                  return;
                                if (
                                  event.button !== 0 ||
                                  shouldSkipNodeDrag(event.target)
                                )
                                  return;
                                const handle =
                                  event.target instanceof HTMLElement
                                    ? event.target.closest(
                                        "[data-node-drag-handle='true']"
                                      )
                                    : null;
                                if (!handle) return;
                                const point = canvasPoint(
                                  event.clientX,
                                  event.clientY
                                );
                                setNodeDrag({
                                  gameId: game.id,
                                  offsetX: point.x - visualPosition.x,
                                  offsetY: point.y - visualPosition.y,
                                  x: visualPosition.x,
                                  y: visualPosition.y,
                                });
                              }}
                              onDragOver={event => {
                                if (!isComplete) event.preventDefault();
                              }}
                              onDrop={event => {
                                if (isComplete) return;
                                const payload =
                                  parseDragPayload(
                                    event.dataTransfer.getData(
                                      "application/json"
                                    )
                                  ) ?? dragPayload;
                                if (!payload) return;
                                assignDroppedTeam(
                                  game,
                                  gameAssignments,
                                  payload
                                );
                              }}
                              data-connection-target-game-id={game.id}
                              className={`absolute z-10 w-80 cursor-default rounded-lg border bg-zinc-950/95 p-4 shadow-2xl ${statusClasses.nodeBorder} ${statusClasses.accent} ${nodeDrag?.gameId === game.id || selectedGameId === game.id ? "z-50 ring-2 ring-[#FFD700]/80 shadow-[0_0_28px_rgba(255,215,0,0.22)]" : ""}`}
                              style={{
                                left: visualPosition.x,
                                top: visualPosition.y,
                              }}
                            >
                              <button
                                type="button"
                                data-no-node-drag="true"
                                data-input-port-game-id={game.id}
                                title="Receive from previous lobby"
                                data-connector-port="true"
                                data-game-id={game.id}
                                data-port="top"
                                className="absolute -top-3 left-1/2 z-20 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-[#FFD700] bg-black shadow-[0_0_14px_rgba(255,215,0,0.45)] transition hover:scale-110"
                              />
                              {(["winner", "loser"] as const).map(flowType => (
                                <button
                                  key={flowType}
                                  type="button"
                                  data-no-node-drag="true"
                                  title={`Drag to connect ${flowType === "winner" ? "winners" : "losers"} from this lobby`}
                                  data-connector-port="true"
                                  data-game-id={game.id}
                                  data-port="bottom"
                                  data-flow-type={flowType}
                                  className={`absolute -bottom-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 font-mono text-[11px] font-black leading-none transition hover:scale-110 ${
                                    flowType === "winner"
                                      ? "left-[calc(50%-44px)] -translate-x-1/2 border-[#FFD700] bg-[#FFD700] text-black shadow-[0_0_14px_rgba(255,215,0,0.45)]"
                                      : "left-[calc(50%+44px)] -translate-x-1/2 border-slate-100 bg-slate-100 text-black shadow-[0_0_14px_rgba(226,232,240,0.45)]"
                                  }`}
                                  onPointerDown={event => {
                                    if (
                                      event.pointerType === "touch" ||
                                      isPinchingRef.current
                                    )
                                      return;
                                    if (event.button !== 0) return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const sourceCenter = getPortCenter(
                                      game,
                                      "bottom",
                                      flowType
                                    );
                                    const sourcePoint = getConnectionEndpoint(
                                      sourceCenter,
                                      "bottom"
                                    );
                                    setConnectionDrag({
                                      sourceGameId: game.id,
                                      flowType,
                                      sourcePoint,
                                      currentPoint: sourcePoint,
                                    });
                                  }}
                                >
                                  {flowType === "winner" ? "W" : "L"}
                                </button>
                              ))}
                              <div
                                data-node-drag-handle="true"
                                className="mb-3 flex cursor-grab items-start justify-between gap-2 active:cursor-grabbing"
                              >
                                <div>
                                  <p className="font-mono text-xs uppercase tracking-widest text-white/45">
                                    {game.gameType === "cashout"
                                      ? "Cashout Lobby"
                                      : "Final Round"}
                                  </p>
                                  <h3 className="font-mono text-xl font-black text-white">
                                    {game.displayLabel}
                                  </h3>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <button
                                    type="button"
                                    data-no-node-drag="true"
                                    className="rounded border border-white/15 bg-white/10 px-2 py-1 font-mono text-xs uppercase text-white/70 transition hover:border-[#FFD700]/60 hover:text-[#FFD700]"
                                    onClick={event => {
                                      event.stopPropagation();
                                      toggleMinimizedGame(game.id);
                                    }}
                                    title={
                                      isMinimized
                                        ? "Expand lobby"
                                        : "Minimize lobby"
                                    }
                                  >
                                    {isMinimized ? "+" : "−"}
                                  </button>
                                  {!isComplete && (
                                    <button
                                      type="button"
                                      data-no-node-drag="true"
                                      className="rounded border border-red-400/30 bg-red-950/40 px-2 py-1 font-mono text-xs uppercase text-red-200 transition hover:border-red-300 hover:bg-red-900/70"
                                      onClick={event => {
                                        event.stopPropagation();
                                        setDialogState({
                                          type: "delete",
                                          gameId: game.id,
                                          label: game.displayLabel,
                                        });
                                      }}
                                      title="Delete lobby"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="mb-3 space-y-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={`inline-block shrink-0 rounded border px-2 py-1 font-mono text-xs uppercase ${statusClasses.statusPill}`}
                                  >
                                    {game.status}
                                  </span>
                                  <select
                                    data-no-node-drag="true"
                                    className="min-w-0 flex-1 rounded border border-[#FFD700]/30 bg-black px-2 py-1 font-mono text-[10px] uppercase text-yellow-100 outline-none hover:border-[#FFD700]"
                                    value={game.mapId ?? ""}
                                    title="Select map"
                                    onChange={event => {
                                      event.stopPropagation();
                                      const value = event.target.value;
                                      if (value === "__random") {
                                        randomizeGameMap.mutate({
                                          gameId: game.id,
                                        });
                                        return;
                                      }
                                      setGameMap.mutate({
                                        gameId: game.id,
                                        mapId: value || null,
                                      });
                                    }}
                                  >
                                    <option value="">Map: TBD</option>
                                    <option value="__random">
                                      Randomize Map
                                    </option>
                                    {THE_FINALS_MAPS.map(map => (
                                      <option key={map.id} value={map.id}>
                                        {map.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex min-w-0 items-center justify-between gap-2">
                                  {game.broadcastUrl && (
                                    <span className="shrink-0 whitespace-nowrap rounded border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 font-mono text-[10px] uppercase text-cyan-100">
                                      Broadcast Link Set
                                    </span>
                                  )}
                                  <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-widest text-white/35">
                                    {game.gameType === "cashout"
                                      ? "1st–4th"
                                      : `1st–2nd · BO${game.seriesBestOf ?? 1}`}
                                  </span>
                                </div>
                              </div>
                              {isMinimized ? (
                                <CompactResultList
                                  assignments={gameAssignments}
                                  selectedAssignmentId={selectedAssignmentId}
                                  teamsById={teamsById}
                                  onSelect={assignmentId => {
                                    setSelectedAssignmentId(assignmentId);
                                    setSelectedConnectionId(null);
                                    setSelectedGameId(null);
                                  }}
                                />
                              ) : (
                                <div
                                  className="space-y-2"
                                  data-no-node-drag="true"
                                  onDragOver={event => {
                                    if (!isComplete) event.preventDefault();
                                  }}
                                  onDrop={event => {
                                    if (isComplete) return;
                                    const payload =
                                      parseDragPayload(
                                        event.dataTransfer.getData(
                                          "application/json"
                                        )
                                      ) ?? dragPayload;
                                    if (!payload) return;
                                    assignDroppedTeam(
                                      game,
                                      gameAssignments,
                                      payload
                                    );
                                  }}
                                >
                                  {Array.from(
                                    { length: capacity },
                                    (_, index) => {
                                      const slot = index + 1;
                                      const assignment = gameAssignments.find(
                                        item => item.slotIndex === slot
                                      );
                                      const team = assignment
                                        ? teamsById.get(assignment.teamId)
                                        : undefined;
                                      return (
                                        <div
                                          key={slot}
                                          data-no-node-drag="true"
                                          onDragOver={event => {
                                            if (!isComplete)
                                              event.preventDefault();
                                          }}
                                          onDrop={event => {
                                            if (isComplete) return;
                                            event.stopPropagation();
                                            const payload =
                                              parseDragPayload(
                                                event.dataTransfer.getData(
                                                  "application/json"
                                                )
                                              ) ?? dragPayload;
                                            if (!payload) return;
                                            assignDroppedTeam(
                                              game,
                                              gameAssignments,
                                              payload,
                                              slot
                                            );
                                          }}
                                          className="min-h-12 rounded border border-white/10 bg-black/50 p-2"
                                        >
                                          <p className="mb-1 font-mono text-[10px] uppercase text-white/35">
                                            Slot {slot}
                                          </p>
                                          {team && assignment ? (
                                            <TeamCard
                                              team={team}
                                              fromGameId={
                                                isComplete ? undefined : game.id
                                              }
                                              disabled={isComplete}
                                              placement={
                                                assignment.resultPlacement ??
                                                null
                                              }
                                              selected={
                                                selectedAssignmentId ===
                                                assignment.id
                                              }
                                              onSelect={() => {
                                                setSelectedAssignmentId(
                                                  assignment.id
                                                );
                                                setSelectedConnectionId(null);
                                                setSelectedGameId(null);
                                              }}
                                              onCyclePlacement={() =>
                                                cycleAssignmentPlacement(
                                                  assignment,
                                                  capacity
                                                )
                                              }
                                              onDragStart={() =>
                                                setDragPayload({
                                                  teamId: team.id,
                                                  fromGameId: game.id,
                                                })
                                              }
                                            />
                                          ) : (
                                            <p className="text-sm text-white/35">
                                              {isComplete
                                                ? "Empty historical slot"
                                                : "Drop team here"}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                              {!isMinimized && (
                                <LobbyCodeTools
                                  tournamentName={query.data.tournament.name}
                                  game={game}
                                  assignments={gameAssignments}
                                  teamsById={teamsById}
                                  discordConfigured={Boolean(
                                    query.data.discordConfigured
                                  )}
                                  sendingTeamId={
                                    sendLobbyCodeToTeamLeader.variables
                                      ?.teamId ?? null
                                  }
                                  sendingLobby={
                                    sendLobbyCodeToLobbyLeaders.isPending
                                  }
                                  onSendTeam={teamId =>
                                    sendLobbyCodeToTeamLeader.mutate({
                                      gameId: game.id,
                                      teamId,
                                    })
                                  }
                                  onSendLobby={() =>
                                    sendLobbyCodeToLobbyLeaders.mutate({
                                      gameId: game.id,
                                    })
                                  }
                                />
                              )}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            {isComplete ? (
                              <>
                                {statuses
                                  .filter(status => status !== "complete")
                                  .map(status => (
                                    <ContextMenuItem
                                      key={status}
                                      onClick={() =>
                                        updateStatus.mutate({
                                          gameId: game.id,
                                          status,
                                        })
                                      }
                                    >
                                      Reopen Game as {status}
                                    </ContextMenuItem>
                                  ))}
                              </>
                            ) : (
                              <>
                                <ContextMenuItem
                                  onClick={() =>
                                    openDialog(
                                      {
                                        type: "rename",
                                        gameId: game.id,
                                        currentValue: game.displayLabel,
                                      },
                                      game.displayLabel
                                    )
                                  }
                                >
                                  Rename Game
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onClick={() =>
                                    openDialog(
                                      {
                                        type: "lobby",
                                        gameId: game.id,
                                        currentValue:
                                          game.privateLobbyCode ?? "",
                                      },
                                      game.privateLobbyCode ?? ""
                                    )
                                  }
                                >
                                  Set/Clear Lobby Code
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onClick={() =>
                                    openDialog(
                                      {
                                        type: "broadcast",
                                        gameId: game.id,
                                        currentValue: game.broadcastUrl ?? "",
                                      },
                                      game.broadcastUrl ?? ""
                                    )
                                  }
                                >
                                  Set/Clear Broadcast Link
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                {game.gameType === "final_round" && (
                                  <>
                                    {[1, 3, 5].map(value => (
                                      <ContextMenuItem
                                        key={value}
                                        onClick={() =>
                                          setBestOf.mutate({
                                            gameId: game.id,
                                            seriesBestOf: value as 1 | 3 | 5,
                                          })
                                        }
                                      >
                                        Set Final Round BO{value}
                                      </ContextMenuItem>
                                    ))}
                                    <ContextMenuSeparator />
                                  </>
                                )}
                                {statuses.map(status => (
                                  <ContextMenuItem
                                    key={status}
                                    onClick={() =>
                                      updateStatus.mutate({
                                        gameId: game.id,
                                        status,
                                      })
                                    }
                                  >
                                    Mark {status}
                                  </ContextMenuItem>
                                ))}
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  onClick={() =>
                                    removeAssignedTeams.mutate({
                                      gameId: game.id,
                                    })
                                  }
                                >
                                  Remove Assigned Teams
                                </ContextMenuItem>
                                <ContextMenuItem
                                  className="text-red-300"
                                  onClick={() =>
                                    setDialogState({
                                      type: "delete",
                                      gameId: game.id,
                                      label: game.displayLabel,
                                    })
                                  }
                                >
                                  Delete Game
                                </ContextMenuItem>
                              </>
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                  </div>
                </div>
              </main>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onClick={() => openDialog({ type: "create-team" })}
              >
                Create Team
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() =>
                  createCashout.mutate({
                    tournamentId,
                    position: snapWindowsToGrid
                      ? snapCanvasPointToGrid(canvasMenuPosition)
                      : canvasMenuPosition,
                  })
                }
              >
                Create Cashout Lobby
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() =>
                  createFinal.mutate({
                    tournamentId,
                    position: snapWindowsToGrid
                      ? snapCanvasPointToGrid(canvasMenuPosition)
                      : canvasMenuPosition,
                  })
                }
              >
                Create Final Round Match
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
      <Dialog
        open={
          dialogState?.type === "create-team" ||
          dialogState?.type === "rename" ||
          dialogState?.type === "lobby" ||
          dialogState?.type === "broadcast"
        }
        onOpenChange={open => !open && setDialogState(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState?.type === "create-team"
                ? "Create Team"
                : dialogState?.type === "rename"
                  ? "Rename Game"
                  : dialogState?.type === "broadcast"
                    ? "Set Broadcast Link"
                    : "Set Lobby Code"}
            </DialogTitle>
            <DialogDescription>
              {dialogState?.type === "lobby"
                ? "Leave blank to clear the private lobby code."
                : dialogState?.type === "broadcast"
                  ? "Leave blank to clear the public broadcast link."
                  : "Changes persist immediately to the control room."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={formName}
              onChange={event => setFormName(event.target.value)}
              placeholder={
                dialogState?.type === "create-team"
                  ? "Team name"
                  : dialogState?.type === "rename"
                    ? "Game label"
                    : dialogState?.type === "broadcast"
                      ? "https://twitch.tv/channel"
                      : "Lobby code"
              }
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (dialogState?.type === "create-team") {
                  createTeam.mutate({ tournamentId, name: formName, frp: 0 });
                }
                if (dialogState?.type === "rename") {
                  renameGame.mutate({
                    gameId: dialogState.gameId,
                    displayLabel: formName,
                  });
                }
                if (dialogState?.type === "lobby") {
                  setLobbyCode.mutate({
                    gameId: dialogState.gameId,
                    lobbyCode: formName.trim() ? formName.trim() : null,
                  });
                }
                if (dialogState?.type === "broadcast") {
                  setBroadcastUrl.mutate({
                    gameId: dialogState.gameId,
                    broadcastUrl: formName.trim() ? formName.trim() : null,
                  });
                }
                setDialogState(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={dialogState?.type === "delete"}
        onOpenChange={open => !open && setDialogState(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lobby?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the lobby node, its assignments, and its flow
              connections. You can undo this once from the zoom rail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dialogState?.type === "delete") {
                  runDestructiveBoardAction(() =>
                    deleteGame.mutateAsync({ gameId: dialogState.gameId })
                  );
                }
                setDialogState(null);
              }}
            >
              Delete{" "}
              {dialogState?.type === "delete" ? dialogState.label : "lobby"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={
          dialogState?.type === "bulk-delete-connections" ||
          dialogState?.type === "bulk-return-teams" ||
          dialogState?.type === "bulk-wipe-canvas"
        }
        onOpenChange={open => !open && setDialogState(null)}
      >
        <AlertDialogContent className="border-[#FFD700]/35 bg-black text-white shadow-[0_0_30px_rgba(255,215,0,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-[#FFD700]">
              {dialogState?.type === "bulk-delete-connections"
                ? "Delete all connections?"
                : dialogState?.type === "bulk-return-teams"
                  ? "Return all teams to available?"
                  : "Wipe canvas?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/65">
              {dialogState?.type === "bulk-delete-connections"
                ? "This removes every lobby connection for this tournament and leaves lobbies, teams, assignments, submissions, and viewer links intact."
                : dialogState?.type === "bulk-return-teams"
                  ? "This removes every team assignment from the current lobbies without deleting teams, lobbies, or connections."
                  : "This deletes every lobby on the canvas. Existing cascade cleanup removes their assignments and connections while preserving teams, submissions, viewer links, and the tournament."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-white/10 text-white hover:bg-white/15">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#FFD700] font-mono font-black uppercase text-black hover:bg-[#e6c200]"
              onClick={() => {
                if (dialogState?.type === "bulk-delete-connections") {
                  runDestructiveBoardAction(() =>
                    clearTournamentConnections.mutateAsync({ tournamentId })
                  );
                }
                if (dialogState?.type === "bulk-return-teams") {
                  runDestructiveBoardAction(() =>
                    returnTournamentTeamsToAvailable.mutateAsync({
                      tournamentId,
                    })
                  );
                }
                if (dialogState?.type === "bulk-wipe-canvas") {
                  runDestructiveBoardAction(() =>
                    clearTournamentCanvas.mutateAsync({ tournamentId })
                  );
                }
                setSelectedAssignmentId(null);
                setSelectedConnectionId(null);
                setSelectedGameId(null);
                setDialogState(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function LobbyCodeTools({
  tournamentName,
  game,
  assignments,
  teamsById,
  discordConfigured,
  sendingTeamId,
  sendingLobby,
  onSendTeam,
  onSendLobby,
}: {
  tournamentName: string;
  game: ControlGameView;
  assignments: AssignmentView[];
  teamsById: Map<number, ControlTeamView>;
  discordConfigured: boolean;
  sendingTeamId: number | null;
  sendingLobby: boolean;
  onSendTeam: (teamId: number) => void;
  onSendLobby: () => void;
}) {
  const hasCode = Boolean(game.privateLobbyCode?.trim());
  const assignedTeams = assignments
    .map(assignment => teamsById.get(assignment.teamId))
    .filter((team): team is ControlTeamView => Boolean(team));
  const sendableTeams = assignedTeams.filter(
    team => !getRecipientWarning(team)
  );
  const sendDisabledReason = !hasCode
    ? "Set a lobby code before sending."
    : !discordConfigured
      ? "Discord sending is not configured on the server. Use Copy Message."
      : sendableTeams.length === 0
        ? "No assigned captains can receive Discord DMs."
        : null;
  const lobbyMessage = assignedTeams
    .map(team =>
      getLobbyCodeMessage(
        tournamentName,
        game.displayLabel,
        team.name,
        game.privateLobbyCode ?? ""
      )
    )
    .join("\n\n---\n\n");
  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Lobby code message copied");
  };

  return (
    <div
      data-no-node-drag="true"
      data-no-canvas-pan="true"
      className="mt-3 rounded border border-[#FFD700]/20 bg-black/45 p-2"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#FFD700]">
          Lobby code DMs
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2 font-mono text-[10px] uppercase"
          disabled={Boolean(sendDisabledReason) || sendingLobby}
          onClick={onSendLobby}
          title={sendDisabledReason ?? "Send to all assigned team captains."}
        >
          {sendingLobby ? "Sending…" : "Send Code to Lobby"}
        </Button>
      </div>
      {sendDisabledReason && (
        <p className="mb-2 text-[11px] text-amber-200/80">
          {sendDisabledReason}
        </p>
      )}
      {assignedTeams.length > 0 && hasCode && (
        <button
          type="button"
          className="mb-2 rounded border border-white/15 px-2 py-1 font-mono text-[10px] uppercase text-white/65 transition hover:border-[#FFD700]/60 hover:text-[#FFD700]"
          onClick={() => copyText(lobbyMessage)}
        >
          Copy Lobby Messages
        </button>
      )}
      <div className="space-y-1.5">
        {assignedTeams.length === 0 ? (
          <p className="text-[11px] text-white/40">
            Assign teams to send or copy lobby-code messages.
          </p>
        ) : (
          assignedTeams.map(team => {
            const warning = getRecipientWarning(team);
            const message = getLobbyCodeMessage(
              tournamentName,
              game.displayLabel,
              team.name,
              game.privateLobbyCode ?? ""
            );
            return (
              <div
                key={team.id}
                className="rounded border border-white/10 bg-zinc-950/80 p-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-mono text-[11px] text-white/80">
                    {team.name}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[9px] uppercase text-white/65 hover:border-[#FFD700]/60 hover:text-[#FFD700]"
                      disabled={!hasCode}
                      onClick={() => copyText(message)}
                    >
                      Copy Message
                    </button>
                    <button
                      type="button"
                      className="rounded border border-[#FFD700]/40 bg-[#FFD700]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#FFD700] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                      disabled={
                        !hasCode ||
                        !discordConfigured ||
                        Boolean(warning) ||
                        sendingTeamId === team.id
                      }
                      onClick={() => onSendTeam(team.id)}
                      title={
                        !discordConfigured
                          ? "Discord sending is not configured on the server. Use Copy Message."
                          : (warning ?? "Send code to this team's captain.")
                      }
                    >
                      {sendingTeamId === team.id ? "Sending…" : "Send Code"}
                    </button>
                  </div>
                </div>
                {(warning || !hasCode || !discordConfigured) && (
                  <p className="mt-1 text-[10px] text-amber-200/75">
                    {!hasCode
                      ? "No lobby code set."
                      : !discordConfigured
                        ? "Discord sending not configured; use Copy Message."
                        : warning}
                  </p>
                )}
                {!warning && team.captainDisplayName && (
                  <p className="mt-1 text-[10px] text-white/35">
                    Captain: {team.captainDisplayName}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CompactResultList({
  assignments,
  selectedAssignmentId,
  teamsById,
  onSelect,
}: {
  assignments: AssignmentView[];
  selectedAssignmentId: number | null;
  teamsById: Map<number, ControlTeamView>;
  onSelect: (assignmentId: number) => void;
}) {
  const sortedAssignments = [...assignments].sort((a, b) => {
    const aPlacement = a.resultPlacement ?? 99;
    const bPlacement = b.resultPlacement ?? 99;
    if (aPlacement !== bPlacement) return aPlacement - bPlacement;
    return a.slotIndex - b.slotIndex;
  });

  if (sortedAssignments.length === 0) {
    return (
      <p className="rounded border border-dashed border-white/15 p-3 text-sm text-white/35">
        No teams assigned.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {sortedAssignments.map(assignment => {
        const team = teamsById.get(assignment.teamId);
        return (
          <button
            key={assignment.id}
            type="button"
            data-no-node-drag="true"
            onClick={event => {
              event.stopPropagation();
              onSelect(assignment.id);
            }}
            className={`flex w-full items-center justify-between gap-2 rounded border px-2 py-1.5 text-left transition ${
              selectedAssignmentId === assignment.id
                ? "border-[#FFD700] bg-[#FFD700]/15"
                : "border-white/10 bg-black/45 hover:border-[#FFD700]/50"
            }`}
          >
            <span className="min-w-0 truncate font-mono text-xs font-bold text-white">
              {team?.name ?? "Unknown team"}
            </span>
            <span className="shrink-0 font-mono text-[10px] uppercase text-white/45">
              {assignment.resultPlacement
                ? formatPlacement(assignment.resultPlacement)
                : `Slot ${assignment.slotIndex}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TeamCard({
  team,
  fromGameId,
  onDragStart,
  disabled,
  placement,
  selected,
  onSelect,
  onCyclePlacement,
  onCreateClaimLink,
}: {
  team: ControlTeamView;
  fromGameId?: number;
  onDragStart: () => void;
  disabled?: boolean;
  placement?: number | null;
  selected?: boolean;
  onSelect?: () => void;
  onCyclePlacement?: () => void;
  onCreateClaimLink?: () => void;
}) {
  const lastTouchTapRef = useRef<{ time: number; x: number; y: number } | null>(
    null
  );

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      draggable={!disabled}
      data-no-node-drag="true"
      data-team-card="true"
      onClick={event => {
        event.stopPropagation();
        onSelect?.();
      }}
      onTouchEnd={event => {
        if (!onCyclePlacement || disabled) return;
        const touch = event.changedTouches.item(0);
        if (!touch) return;
        const now = window.performance.now();
        const previous = lastTouchTapRef.current;
        lastTouchTapRef.current = {
          time: now,
          x: touch.clientX,
          y: touch.clientY,
        };
        if (
          previous &&
          now - previous.time <= 320 &&
          Math.hypot(touch.clientX - previous.x, touch.clientY - previous.y) <=
            24
        ) {
          event.preventDefault();
          event.stopPropagation();
          lastTouchTapRef.current = null;
          onSelect?.();
          onCyclePlacement();
        }
      }}
      onKeyDown={event => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      onDragStart={event => {
        event.stopPropagation();
        if (disabled) return;
        const payload: DragPayload = { teamId: team.id, fromGameId };
        event.dataTransfer.setData("application/json", JSON.stringify(payload));
        onDragStart();
      }}
      onDragEnd={event => event.stopPropagation()}
      className={`rounded border bg-white/10 px-3 py-2 shadow-lg transition ${
        selected
          ? "border-[#FFD700] ring-2 ring-[#FFD700]/50"
          : "border-white/10"
      } ${disabled ? "opacity-80" : onSelect ? "cursor-pointer" : "cursor-grab"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 truncate font-mono text-sm font-bold text-white">
          {team.name}
        </div>
        {onCreateClaimLink ? (
          <button
            type="button"
            className="shrink-0 rounded border border-[#FFD700]/40 px-2 py-0.5 font-mono text-[10px] uppercase text-[#FFD700]"
            onClick={event => {
              event.stopPropagation();
              onCreateClaimLink();
            }}
          >
            Claim Link
          </button>
        ) : null}
        {placement ? (
          <span className="shrink-0 rounded bg-[#FFD700] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-black">
            {formatPlacement(placement)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ControlState({
  title,
  description,
  showDiscordSignIn,
}: {
  title: string;
  description?: string;
  showDiscordSignIn?: boolean;
}) {
  return (
    <section className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8">
        <h1 className="font-mono text-2xl font-black text-neon-gold">
          {title}
        </h1>
        {description && <p className="mt-3 text-white/60">{description}</p>}
        {showDiscordSignIn && (
          <a
            href={getDiscordLoginUrl()}
            className="mt-6 inline-flex rounded border border-[#5865F2]/70 bg-[#5865F2] px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white hover:border-neon-gold"
          >
            Sign in with Discord
          </a>
        )}
      </div>
    </section>
  );
}
