import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useParams } from "wouter";
import { Lock, LockOpen, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getSafeTournamentControlErrorMessage } from "@/lib/tcrError";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { Button } from "@/components/ui/button";
import {
  baseCanvasSize,
  clampZoom,
  defaultZoom,
  getCanvasPanScroll,
  getCenterZoomView,
  getConnectionEndpoint,
  getConnectionPath,
  getConnectorCenter,
  getConnectorEndpoints,
  getInitialZoomPreference,
  getTranslatedMeasuredPortCenter,
  getFitToContentView,
  getNextRoundGroupSelection,
  getRoundGroupGameIds,
  getKeyboardPanVector,
  getRoundFrames,
  isRoundGroupSelected,
  isRoundFrameColorId,
  roundFrameColorIds,
  roundFrameThemes,
  getGroupDragPositionsFromStart,
  organizeGroupLobbyPositions,
  getMidpoint,
  getPointerDistance,
  hasPointerExceededDragThreshold,
  resolveConnectionDropTargetGameId,
  getViewportPreservingScroll,
  maxZoom,
  minZoom,
  nodeWidth,
  isKeyboardPanKeyCode,
  shouldCancelBoardDragsForPinch,
  isTeamEliminated,
  calculateTournamentScoreboard,
  shouldStartCanvasPan,
  snapCanvasPointToGrid,
  type CanvasPanStart,
  type CanvasPoint,
  type MeasuredConnectorPort,
  type ConnectionFlowType,
  type GameStatus,
  type GameType,
  type KeyboardPanKeyCode,
  type RoundFrame,
  type RoundFrameColorId,
} from "@/lib/tournamentControlBoard";
export { resolveConnectionDropTargetGameId } from "@/lib/tournamentControlBoard";
import { rebaseBoardUndoHistoryAfterRestore } from "@/lib/tournamentControlUndo";
import { useNowTick } from "@/hooks/useNowTick";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
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
import TcrTopBar from "@/components/tcr/TcrTopBar";
import TcrToolbar from "@/components/tcr/TcrToolbar";
import TcrTeamsPanel from "@/components/tcr/TcrTeamsPanel";
import TcrInspector, {
  type TcrInspectorTab,
} from "@/components/tcr/TcrInspector";
import TcrHelpDialog from "@/components/tcr/TcrHelpDialog";
import TcrLobbyNode from "@/components/tcr/TcrLobbyNode";
import {
  getLobbyCapacity,
  parseDragPayload,
  type AssignmentView,
  type ConnectionView,
  type ControlGameView,
  type ControlTeamView,
  type DragPayload,
  type InspectorSelection,
  type StaffMemberView,
} from "@/components/tcr/types";

type NodeDragState = {
  gameId: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
};
type GroupDragState = {
  groupId: string;
  pointerId: number;
  dragged: boolean;
};
type GroupDragSession = {
  groupId: string;
  pointerId: number;
  clientX: number;
  clientY: number;
  additiveSelection: boolean;
  dragged: boolean;
  persisted: boolean;
  startPositions: Map<number, CanvasPoint>;
};
type ConnectionDragState = {
  sourceGameId: number;
  flowType: ConnectionFlowType;
  sourcePoint: CanvasPoint;
  currentPoint: CanvasPoint;
};
type PinchZoomStart = {
  distance: number;
  zoom: number;
  focalClientX: number;
  focalClientY: number;
  focalCanvasX: number;
  focalCanvasY: number;
};
type BoardUndoSnapshot = {
  tournament: { name: string };
  expectedRevision: number;
  games: ControlGameView[];
  assignments: AssignmentView[];
  connections: ConnectionView[];
};
type UiUndoState = {
  selectedGameId: number | null;
  selectedAssignmentId: number | null;
  selectedConnectionId: number | null;
  selectedRoundGameIds: number[];
};
type UndoEntry =
  | { kind: "board"; snapshot: BoardUndoSnapshot; label: string }
  | { kind: "ui"; state: UiUndoState; label: string };
const undoHistoryLimit = 50;

type DialogState =
  | { type: "create-team" }
  | { type: "rename-tournament"; currentValue: string }
  | { type: "delete-team"; teamId: number; teamName: string }
  | { type: "rename"; gameId: number; currentValue: string }
  | { type: "lobby"; gameId: number; currentValue: string }
  | { type: "broadcast"; gameId: number; currentValue: string }
  | { type: "delete"; gameId: number; label: string }
  | {
      type: "round";
      mode: "create" | "rename" | "add";
      roundGroupId?: string;
      currentValue?: string;
    }
  | { type: "delete-round"; roundGroupId: string; label: string }
  | {
      type:
        | "bulk-delete-connections"
        | "bulk-return-teams"
        | "bulk-wipe-canvas";
    }
  | null;

const activeStatuses = new Set<GameStatus>(["draft", "ready", "live"]);

const controlRoomOverlayStorageKey = "murph:tournament-control-room:overlays";
const keyboardPanSpeedPixelsPerSecond = 520;

type ControlRoomOverlayPreferences = {
  zoom: number;
  teamsPanelOpen: boolean;
  inspectorOpen: boolean;
};

export function readControlRoomOverlayPreferences(): Partial<ControlRoomOverlayPreferences> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(controlRoomOverlayStorageKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const preferences = parsed as Partial<
      Record<keyof ControlRoomOverlayPreferences, unknown>
    >;
    return {
      zoom:
        typeof preferences.zoom === "number" &&
        Number.isFinite(preferences.zoom)
          ? getInitialZoomPreference(preferences.zoom)
          : undefined,
      teamsPanelOpen:
        typeof preferences.teamsPanelOpen === "boolean"
          ? preferences.teamsPanelOpen
          : undefined,
      inspectorOpen:
        typeof preferences.inspectorOpen === "boolean"
          ? preferences.inspectorOpen
          : undefined,
    };
  } catch {
    return {};
  }
}

export function writeControlRoomOverlayPreferences(
  preferences: Partial<ControlRoomOverlayPreferences>
) {
  if (typeof window === "undefined") return;
  try {
    const current = readControlRoomOverlayPreferences();
    window.localStorage.setItem(
      controlRoomOverlayStorageKey,
      JSON.stringify({ ...current, ...preferences })
    );
  } catch {
    // Ignore unavailable or full local storage so controls remain usable.
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

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 1024px)").matches
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) =>
      setIsDesktop(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export type TournamentControlRoomMode = "personal" | "discord-staff";

type TournamentControlRoomProps = {
  mode: TournamentControlRoomMode;
};

export default function TournamentControlRoom({
  mode,
}: TournamentControlRoomProps) {
  const params = useParams<{ tournamentId: string }>();
  const isPersonalTcr = mode === "personal";
  const controlApi =
    mode === "personal" ? trpc.personalTcr : trpc.tournamentControl;
  const tournamentId = Number(params.tournamentId);
  const auth = useAuth();
  const utils = trpc.useUtils();
  const isDesktop = useIsDesktop();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [nodeDrag, setNodeDrag] = useState<NodeDragState | null>(null);
  const [connectionDrag, setConnectionDrag] =
    useState<ConnectionDragState | null>(null);
  const [groupDrag, setGroupDrag] = useState<GroupDragState | null>(null);
  const groupDragRef = useRef<GroupDragSession | null>(null);
  const suppressGroupHeaderClickRef = useRef(false);
  const [canvasMenuPosition, setCanvasMenuPosition] = useState({
    x: 160,
    y: 120,
  });
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
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
  const [zoom, setZoom] = useState(
    () => readControlRoomOverlayPreferences().zoom ?? defaultZoom
  );
  const [isPanning, setIsPanning] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(
    () => readControlRoomOverlayPreferences().teamsPanelOpen ?? true
  );
  const [inspectorOpen, setInspectorOpen] = useState(
    () => readControlRoomOverlayPreferences().inspectorOpen ?? true
  );
  const [inspectorTab, setInspectorTab] = useState<TcrInspectorTab>("inspect");
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileTeamsOpen, setMobileTeamsOpen] = useState(false);
  const [mobileDockOpen, setMobileDockOpen] = useState(false);
  const suppressNextBoardUndoRef = useRef(0);
  const captureUndoSnapshotRef = useRef<(() => BoardUndoSnapshot) | null>(null);
  const [undoHistory, setUndoHistory] = useState<UndoEntry[]>([]);
  const canvasPanRef = useRef<
    (CanvasPanStart & { pointerId: number; dragged: boolean }) | null
  >(null);
  const touchPointersRef = useRef<Map<number, PointerEvent>>(new Map());
  const pinchStartRef = useRef<PinchZoomStart | null>(null);
  const isPinchingRef = useRef(false);
  const keyboardPanKeysRef = useRef<Set<KeyboardPanKeyCode>>(new Set());
  const keyboardPanAnimationRef = useRef<number | null>(null);
  const keyboardPanPreviousTimestampRef = useRef<number | null>(null);
  const [measuredPortCenters, setMeasuredPortCenters] = useState<
    Map<string, MeasuredConnectorPort>
  >(() => new Map());
  const [measuredNodeHeights, setMeasuredNodeHeights] = useState<
    Map<number, number>
  >(() => new Map());
  const [selectedRoundGameIds, setSelectedRoundGameIds] = useState<Set<number>>(
    () => new Set()
  );
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [regenerateViewerDialogOpen, setRegenerateViewerDialogOpen] =
    useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateVisibility, setTemplateVisibility] = useState<
    "private" | "public"
  >("private");

  const query = controlApi.get.useQuery(
    { tournamentId },
    {
      enabled:
        Number.isFinite(tournamentId) && auth.user?.loginMethod === "discord",
      retry: false,
    }
  );
  const canManageStaff = Boolean(
    isPersonalTcr &&
      auth.user &&
      query.data &&
      (auth.user.role === "admin" ||
        query.data.tournament.ownerUserId === auth.user.id)
  );
  const staffQuery = trpc.personalTcr.listStaff.useQuery(
    { tournamentId },
    { enabled: canManageStaff, retry: false }
  );
  const invalidate = () =>
    isPersonalTcr
      ? utils.personalTcr.get.invalidate({ tournamentId })
      : utils.tournamentControl.get.invalidate({ tournamentId });
  const mutationOptions = {
    onMutate: () => {
      if (suppressNextBoardUndoRef.current > 0) {
        suppressNextBoardUndoRef.current -= 1;
        return undefined;
      }
      return captureUndoSnapshot();
    },
    onSuccess: (
      data: { tournament?: { boardRevision?: number } } | unknown,
      _variables: unknown,
      snapshot?: BoardUndoSnapshot
    ) => {
      const boardRevision = (
        data as { tournament?: { boardRevision?: number } }
      )?.tournament?.boardRevision;
      if (snapshot && typeof boardRevision === "number")
        setUndoHistory(history =>
          [
            {
              kind: "board" as const,
              snapshot: { ...snapshot, expectedRevision: boardRevision },
              label: "Board change",
            },
            ...history,
          ].slice(0, undoHistoryLimit)
        );
      invalidate();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const renameTournament = controlApi.renameTournament.useMutation({
    onMutate: () => captureUndoSnapshot(),
    onSuccess: (
      data: { tournament?: { boardRevision?: number } } | unknown,
      _variables: unknown,
      snapshot?: BoardUndoSnapshot
    ) => {
      const boardRevision = (
        data as { tournament?: { boardRevision?: number } }
      )?.tournament?.boardRevision;
      if (snapshot && typeof boardRevision === "number")
        setUndoHistory(history =>
          [
            {
              kind: "board" as const,
              snapshot: { ...snapshot, expectedRevision: boardRevision },
              label: "Rename tournament",
            },
            ...history,
          ].slice(0, undoHistoryLimit)
        );
      setDialogState(null);
      setFormError(null);
      invalidate();
      toast.success("Tournament name updated");
    },
    onError: (error: { message: string }) => setFormError(error.message),
  });
  const createTeam = controlApi.createTeam.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(
        "Team created. Roster changes are not included in board Undo."
      );
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const createCashout =
    controlApi.createCashoutLobby.useMutation(mutationOptions);
  const createFinal =
    controlApi.createFinalRoundMatch.useMutation(mutationOptions);
  const moveGame = controlApi.moveGame.useMutation(mutationOptions);
  const moveGames = controlApi.moveGames.useMutation({
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const connectGames = controlApi.connectGames.useMutation(mutationOptions);
  const deleteGameConnection =
    controlApi.deleteGameConnection.useMutation(mutationOptions);
  const renameGame = controlApi.renameGame.useMutation(mutationOptions);
  const setLobbyCode = controlApi.setLobbyCode.useMutation(mutationOptions);
  const setGameMap = controlApi.setGameMap.useMutation(mutationOptions);
  const setBroadcastUrl =
    controlApi.setBroadcastUrl.useMutation(mutationOptions);
  const randomizeGameMap =
    controlApi.randomizeGameMap.useMutation(mutationOptions);
  const updateStatus = controlApi.updateStatus.useMutation(mutationOptions);
  const setPlacement =
    controlApi.setAssignmentResultPlacement.useMutation(mutationOptions);
  const assignTeam = controlApi.assignTeam.useMutation(mutationOptions);
  const moveTeam = controlApi.moveTeam.useMutation(mutationOptions);
  const removeTeam = controlApi.removeTeam.useMutation(mutationOptions);
  const removeAssignedTeams =
    controlApi.removeAssignedTeams.useMutation(mutationOptions);
  const autoFillLobby = controlApi.autoFillLobby.useMutation({
    onMutate: () => captureUndoSnapshot(),
    onSuccess: (result, _variables, snapshot?: BoardUndoSnapshot) => {
      const boardRevision = result.board.tournament.boardRevision;
      if (snapshot)
        setUndoHistory(history =>
          [
            {
              kind: "board" as const,
              snapshot: { ...snapshot, expectedRevision: boardRevision },
              label: "Auto-fill lobby",
            },
            ...history,
          ].slice(0, undoHistoryLimit)
        );
      invalidate();
      const partial =
        result.slotsOpen > 0
          ? ` (${result.slotsOpen} slot${result.slotsOpen === 1 ? "" : "s"} still open)`
          : "";
      toast.success(
        `Auto-filled ${result.assignedCount} team${result.assignedCount === 1 ? "" : "s"}${partial}`
      );
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const updateRoundGroup =
    controlApi.updateRoundGroup.useMutation(mutationOptions);
  const setRoundGroupLocked =
    controlApi.setRoundGroupLocked.useMutation(mutationOptions);
  const persistGroupPositions = useCallback(
    (positions: ReadonlyMap<number, CanvasPoint>) => {
      const entries = Array.from(positions.entries());
      if (entries.length === 0) return;
      const snapshot = captureUndoSnapshotRef.current?.();
      if (!snapshot) return;
      moveGames
        .mutateAsync({
          tournamentId,
          positions: entries.map(([gameId, position]) => ({
            gameId,
            position,
          })),
        })
        .then(result =>
          setUndoHistory(history =>
            [
              {
                kind: "board" as const,
                snapshot: {
                  ...snapshot,
                  expectedRevision: result.tournament.boardRevision,
                },
                label: "Move group",
              },
              ...history,
            ].slice(0, undoHistoryLimit)
          )
        )
        .catch(() => undefined);
    },
    [moveGames, tournamentId]
  );
  const deleteTeam = controlApi.deleteTeam.useMutation({
    onSuccess: () => {
      setDialogState(null);
      invalidate();
      toast.success(
        "Team deleted. Roster changes are not included in board Undo."
      );
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const deleteGame = controlApi.deleteGame.useMutation(mutationOptions);
  const clearTournamentConnections =
    controlApi.clearTournamentConnections.useMutation(mutationOptions);
  const returnTournamentTeamsToAvailable =
    controlApi.returnTournamentTeamsToAvailable.useMutation(mutationOptions);
  const clearTournamentCanvas =
    controlApi.clearTournamentCanvas.useMutation(mutationOptions);
  const restoreTournamentBoardSnapshot =
    controlApi.restoreTournamentBoardSnapshot.useMutation({
      onSuccess: data => {
        const boardRevision = data.tournament.boardRevision;
        setUndoHistory(history =>
          rebaseBoardUndoHistoryAfterRestore(history, boardRevision)
        );
        invalidate();
        toast.success("Undo applied");
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const setBestOf =
    controlApi.setFinalRoundSeriesBestOf.useMutation(mutationOptions);
  const saveAdminTemplate =
    trpc.tournamentControl.saveTemplateFromTournament.useMutation({
      onSuccess: () => toast.success("Template saved"),
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const savePersonalTemplate =
    trpc.personalTcr.saveTemplateFromTournament.useMutation({
      onSuccess: () => toast.success("Template saved"),
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const finalizeTournament = controlApi.finalizeTournament.useMutation({
    onSuccess: data => {
      invalidate();
      toast.success(
        data.champion
          ? `Tournament finalized. Champion: ${data.champion.teamName}`
          : "Tournament finalized"
      );
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const unlockTournamentForEditing =
    controlApi.unlockTournamentForEditing.useMutation({
      onSuccess: () => {
        invalidate();
        toast.success("Tournament unlocked for editing");
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const copyViewerLinkToClipboard = async (path: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success("Viewer link copied");
    } catch {
      toast.error(
        "Viewer link created, but clipboard copy failed. Please copy it manually from your browser."
      );
    }
  };
  const enableViewerLink = controlApi.enableViewerLink.useMutation({
    onSuccess: data => copyViewerLinkToClipboard(data.path),
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const regenerateViewerLink = controlApi.regenerateViewerLink.useMutation({
    onSuccess: data => {
      setRegenerateViewerDialogOpen(false);
      void copyViewerLinkToClipboard(data.path);
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const createStaffInviteLink = trpc.personalTcr.getStaffInviteLink.useMutation(
    {
      onSuccess: async data => {
        void utils.personalTcr.listStaff.invalidate({ tournamentId });
        if (!data.path) {
          toast.error("Regenerate the staff invite to copy a fresh link.");
          return;
        }
        try {
          await navigator.clipboard.writeText(
            `${window.location.origin}${data.path}`
          );
          toast.success("Staff invite link copied");
        } catch {
          toast.error("Staff invite was created, but copying failed.");
        }
      },
      onError: (error: { message: string }) => toast.error(error.message),
    }
  );
  const regenerateStaffInviteLink =
    trpc.personalTcr.regenerateStaffInviteLink.useMutation({
      onSuccess: async data => {
        void utils.personalTcr.listStaff.invalidate({ tournamentId });
        if (!data.path) {
          toast.error(
            "Staff invite regenerated, but no fresh link was returned."
          );
          return;
        }
        try {
          await navigator.clipboard.writeText(
            `${window.location.origin}${data.path}`
          );
          toast.success("Staff invite regenerated and copied");
        } catch {
          toast.error("Staff invite was regenerated, but copying failed.");
        }
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const revokeStaffInviteLink =
    trpc.personalTcr.revokeStaffInviteLink.useMutation({
      onSuccess: () => {
        void utils.personalTcr.listStaff.invalidate({ tournamentId });
        toast.success("Staff invite revoked");
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const removeStaffMember = trpc.personalTcr.removeStaffMember.useMutation({
    onSuccess: () => {
      void utils.personalTcr.listStaff.invalidate({ tournamentId });
      toast.success("Collaborator removed");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const createClaimLink = controlApi.createTeamClaimLink.useMutation({
    onSuccess: async data => {
      await navigator.clipboard.writeText(
        `${window.location.origin}${data.path}`
      );
      toast.success("Team claim link copied");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const sendLobbyCodeToTeamLeader =
    controlApi.sendLobbyCodeToTeamLeader.useMutation({
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
    controlApi.sendLobbyCodeToLobbyLeaders.useMutation({
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
  const tournamentName = query.data?.tournament.name ?? "";
  const hasLiveLobby = games.some(game => game.status === "live");
  const nowMs = useNowTick(hasLiveLobby);

  const captureUndoSnapshot = useCallback(
    (): BoardUndoSnapshot => ({
      tournament: { name: tournamentName },
      expectedRevision: query.data?.tournament.boardRevision ?? 0,
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
    [
      assignments,
      connections,
      games,
      query.data?.tournament.boardRevision,
      tournamentName,
    ]
  );

  captureUndoSnapshotRef.current = captureUndoSnapshot;

  const runDestructiveBoardAction = useCallback(
    (action: () => Promise<unknown>) => {
      const snapshot = captureUndoSnapshot();
      void action()
        .then(() =>
          setUndoHistory(history =>
            [
              { kind: "board" as const, snapshot, label: "Board change" },
              ...history,
            ].slice(0, undoHistoryLimit)
          )
        )
        .catch(() => undefined);
    },
    [captureUndoSnapshot]
  );

  const submitDialog = useCallback(() => {
    if (!dialogState) return;
    if (dialogState.type === "rename-tournament") {
      if (
        formName.trim().length < 2 ||
        renameTournament.isPending ||
        formName.trim() === dialogState.currentValue
      )
        return;
      renameTournament.mutate({ tournamentId, name: formName });
      return;
    }
    if (dialogState.type === "create-team") {
      createTeam.mutate({ tournamentId, name: formName, frp: 0 });
    }
    if (dialogState.type === "rename") {
      renameGame.mutate({ gameId: dialogState.gameId, displayLabel: formName });
    }
    if (dialogState.type === "lobby") {
      if (setLobbyCode.isPending) return;
      setLobbyCode.mutate({
        gameId: dialogState.gameId,
        lobbyCode: formName.trim() ? formName.trim() : null,
      });
    }
    if (dialogState.type === "broadcast") {
      setBroadcastUrl.mutate({
        gameId: dialogState.gameId,
        broadcastUrl: formName.trim() ? formName.trim() : null,
      });
    }
    if (dialogState.type === "round") {
      if (updateRoundGroup.isPending || formName.trim().length === 0) return;
      updateRoundGroup.mutate({
        tournamentId,
        gameIds: Array.from(selectedRoundGameIds),
        label: formName.trim(),
        roundGroupId: dialogState.roundGroupId,
        mode: dialogState.mode,
      });
    }
    setDialogState(null);
  }, [
    createTeam,
    dialogState,
    formName,
    renameGame,
    renameTournament,
    selectedRoundGameIds,
    setBroadcastUrl,
    setLobbyCode,
    tournamentId,
    updateRoundGroup,
  ]);

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
  const scoreboardRows = useMemo(
    () =>
      calculateTournamentScoreboard(
        query.data?.teams ?? [],
        games,
        assignments
      ),
    [assignments, games, query.data?.teams]
  );
  const gamesWithOutgoingLoserConnection = useMemo(
    () =>
      new Set(
        connections
          .filter(connection => connection.flowType === "loser")
          .map(connection => connection.sourceGameId)
      ),
    [connections]
  );
  useEffect(() => {
    setUndoHistory([]);
  }, [tournamentId]);

  useEffect(() => {
    writeControlRoomOverlayPreferences({ teamsPanelOpen: teamsOpen });
  }, [teamsOpen]);

  useEffect(() => {
    writeControlRoomOverlayPreferences({ inspectorOpen });
  }, [inspectorOpen]);

  const selectedAssignmentContext = useMemo(() => {
    if (selectedAssignmentId === null) return null;
    const assignment = assignments.find(
      item => item.id === selectedAssignmentId
    );
    if (!assignment) return null;
    const game = gamesById.get(assignment.gameId);
    if (!game) return null;
    const team = teamsById.get(assignment.teamId);
    const capacity = getLobbyCapacity(game.gameType);
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

  const roundFrames = useMemo(() => {
    const positions = new Map(
      games.map(game => [game.id, getVisualPosition(game)] as const)
    );
    return getRoundFrames(
      games,
      minimizedGameIds,
      positions,
      measuredNodeHeights
    );
  }, [games, getVisualPosition, measuredNodeHeights, minimizedGameIds]);

  const getPortCenter = useCallback(
    (
      game: ControlGameView,
      port: "top" | "bottom",
      flowType: ConnectionFlowType = "winner"
    ) => {
      const visualPosition = getVisualPosition(game);
      const measuredPort = measuredPortCenters.get(
        `${game.id}:${port}${port === "bottom" ? `:${flowType}` : ""}`
      );
      return measuredPort
        ? getTranslatedMeasuredPortCenter(measuredPort, visualPosition)
        : getConnectorCenter(
            game,
            port,
            minimizedGameIds.has(game.id),
            visualPosition,
            flowType
          );
    },
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
      const capacity = getLobbyCapacity(game.gameType);
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
        moveTeam.mutate(
          {
            gameId: payload.fromGameId,
            toGameId: game.id,
            teamId: payload.teamId,
            slotIndex,
          },
          { onSuccess: () => setDragPayload(null) }
        );
      } else {
        assignTeam.mutate(
          {
            gameId: game.id,
            teamId: payload.teamId,
            slotIndex,
          },
          { onSuccess: () => setDragPayload(null) }
        );
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
      const next = new Map<string, MeasuredConnectorPort>();
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
          const game = games.find(candidate => candidate.id === Number(gameId));
          if (!game) return;
          next.set(
            `${gameId}:${portName}${portName === "bottom" ? `:${flowType === "loser" ? "loser" : "winner"}` : ""}`,
            {
              center: {
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
              },
              measuredNodePosition: getVisualPosition(game),
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
              Math.abs(previous.center.x - value.center.x) < 0.5 &&
              Math.abs(previous.center.y - value.center.y) < 0.5 &&
              Math.abs(
                previous.measuredNodePosition.x - value.measuredNodePosition.x
              ) < 0.5 &&
              Math.abs(
                previous.measuredNodePosition.y - value.measuredNodePosition.y
              ) < 0.5
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
  }, [
    assignments,
    games,
    getVisualPosition,
    minimizedGameIds,
    nodeDrag,
    query.data,
    zoom,
  ]);

  useEffect(() => {
    writeControlRoomOverlayPreferences({ zoom });
  }, [zoom]);

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
    const stopKeyboardPan = () => {
      keyboardPanKeysRef.current.clear();
      keyboardPanPreviousTimestampRef.current = null;
      if (keyboardPanAnimationRef.current !== null) {
        window.cancelAnimationFrame(keyboardPanAnimationRef.current);
        keyboardPanAnimationRef.current = null;
      }
    };

    const stepKeyboardPan = (timestamp: number) => {
      const canvas = canvasRef.current;
      const vector = getKeyboardPanVector(keyboardPanKeysRef.current);
      const previousTimestamp = keyboardPanPreviousTimestampRef.current;
      keyboardPanPreviousTimestampRef.current = timestamp;

      if (!canvas || (vector.x === 0 && vector.y === 0)) {
        stopKeyboardPan();
        return;
      }

      if (previousTimestamp !== null) {
        const elapsedSeconds = Math.min(
          0.05,
          (timestamp - previousTimestamp) / 1000
        );
        const distance = keyboardPanSpeedPixelsPerSecond * elapsedSeconds;
        canvas.scrollLeft += vector.x * distance;
        canvas.scrollTop += vector.y * distance;
      }

      keyboardPanAnimationRef.current =
        window.requestAnimationFrame(stepKeyboardPan);
    };

    const startKeyboardPan = () => {
      if (keyboardPanAnimationRef.current === null) {
        keyboardPanPreviousTimestampRef.current = null;
        keyboardPanAnimationRef.current =
          window.requestAnimationFrame(stepKeyboardPan);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        dialogState !== null ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTypingTarget(event.target)
      ) {
        stopKeyboardPan();
        return;
      }
      if (!isKeyboardPanKeyCode(event.code)) return;

      event.preventDefault();
      keyboardPanKeysRef.current.add(event.code);
      startKeyboardPan();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isKeyboardPanKeyCode(event.code)) return;
      keyboardPanKeysRef.current.delete(event.code);
      if (keyboardPanKeysRef.current.size === 0) stopKeyboardPan();
    };

    if (dialogState !== null) stopKeyboardPan();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", stopKeyboardPan);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", stopKeyboardPan);
      stopKeyboardPan();
    };
  }, [dialogState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === "Escape") {
        setSelectedAssignmentId(null);
        setSelectedConnectionId(null);
        setSelectedGameId(null);
        setSelectedRoundGameIds(new Set());
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

  const selectRoundGroup = useCallback(
    (groupId: string, additive: boolean) => {
      const groupGameIds = getRoundGroupGameIds(games, groupId);
      setSelectedRoundGameIds(current =>
        getNextRoundGroupSelection(current, groupGameIds, additive)
      );
      setSelectedConnectionId(null);
      setSelectedGameId(null);
    },
    [games]
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

  const getGroupDragPositions = useCallback(
    (start: GroupDragSession, clientX: number, clientY: number) => {
      return getGroupDragPositionsFromStart(start, { clientX, clientY }, zoom);
    },
    [zoom]
  );

  const applyGroupDragPositions = useCallback(
    (positions: ReadonlyMap<number, CanvasPoint>) => {
      setOptimisticGamePositions(current => {
        const next = new Map(current);
        positions.forEach((position, gameId) => next.set(gameId, position));
        return next;
      });
    },
    []
  );

  const clearGroupDrag = useCallback((pointerTarget?: Element | null) => {
    const start = groupDragRef.current;
    if (start && pointerTarget instanceof HTMLElement) {
      try {
        pointerTarget.releasePointerCapture?.(start.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
    }
    groupDragRef.current = null;
    setGroupDrag(null);
  }, []);

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

  const getCanvasCenterPoint = useCallback(() => {
    const element = canvasRef.current;
    const point = element
      ? {
          x: Math.max(
            0,
            Math.round(
              (element.scrollLeft + element.clientWidth / 2) / zoom -
                nodeWidth / 2
            )
          ),
          y: Math.max(
            0,
            Math.round((element.scrollTop + element.clientHeight / 3) / zoom)
          ),
        }
      : { x: 200, y: 160 };
    return snapWindowsToGrid ? snapCanvasPointToGrid(point) : point;
  }, [snapWindowsToGrid, zoom]);

  const undoBoardAction = useCallback(() => {
    const entry = undoHistory[0];
    if (!entry || restoreTournamentBoardSnapshot.isPending) return;
    if (entry.kind === "ui") {
      setSelectedGameId(entry.state.selectedGameId);
      setSelectedAssignmentId(entry.state.selectedAssignmentId);
      setSelectedConnectionId(entry.state.selectedConnectionId);
      setSelectedRoundGameIds(new Set(entry.state.selectedRoundGameIds));
      setUndoHistory(history => history.slice(1));
      return;
    }
    restoreTournamentBoardSnapshot.mutate({
      tournamentId,
      snapshot: entry.snapshot,
    });
  }, [restoreTournamentBoardSnapshot, tournamentId, undoHistory]);

  const pushUiUndo = useCallback(
    (label: string) => {
      const state: UiUndoState = {
        selectedGameId,
        selectedAssignmentId,
        selectedConnectionId,
        selectedRoundGameIds: Array.from(selectedRoundGameIds),
      };
      setUndoHistory(history =>
        [{ kind: "ui" as const, state, label }, ...history].slice(
          0,
          undoHistoryLimit
        )
      );
    },
    [
      selectedAssignmentId,
      selectedConnectionId,
      selectedGameId,
      selectedRoundGameIds,
    ]
  );

  useEffect(() => {
    const isEditable = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest('input, textarea, select, [contenteditable="true"]')
      );
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "z" ||
        (!event.ctrlKey && !event.metaKey) ||
        event.shiftKey
      )
        return;
      if (
        isEditable(event.target) ||
        undoHistory.length === 0 ||
        restoreTournamentBoardSnapshot.isPending
      )
        return;
      event.preventDefault();
      undoBoardAction();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    restoreTournamentBoardSnapshot.isPending,
    undoBoardAction,
    undoHistory.length,
  ]);

  const openDialog = (state: Exclude<DialogState, null>, defaultValue = "") => {
    if (query.data?.tournament.finalizedAt) return;
    setDialogState(state);
    setFormName(defaultValue);
  };

  const cycleAssignmentPlacement = useCallback(
    (assignment: AssignmentView, capacity: number) => {
      if (query.data?.tournament.finalizedAt) return;
      setPlacement.mutate({
        assignmentId: assignment.id,
        resultPlacement: getNextPlacementValue(
          assignment.resultPlacement ?? null,
          capacity
        ),
      });
    },
    [query.data?.tournament.finalizedAt, setPlacement]
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

  const selectAssignment = useCallback(
    (assignmentId: number) => {
      pushUiUndo("Select assignment");
      setSelectedAssignmentId(assignmentId);
      setSelectedConnectionId(null);
      setSelectedGameId(null);
    },
    [pushUiUndo]
  );

  const isFinalizedLocked = Boolean(query.data?.tournament.finalizedAt);

  // Resolve the Inspector selection: assignment > connection > lobby > group.
  const selection: InspectorSelection = useMemo(() => {
    if (selectedAssignmentContext) {
      const { assignment, game, team, capacity } = selectedAssignmentContext;
      return {
        kind: "assignment",
        assignment,
        game,
        team: team ?? null,
        capacity,
        eliminated: isTeamEliminated({
          gameType: game.gameType,
          status: game.status,
          placement: assignment.resultPlacement,
          hasOutgoingLoserConnection: gamesWithOutgoingLoserConnection.has(
            game.id
          ),
        }),
      };
    }
    if (selectedConnectionId !== null) {
      const connection = connections.find(
        item => item.id === selectedConnectionId
      );
      if (connection) {
        return {
          kind: "connection",
          connection,
          sourceLabel:
            gamesById.get(connection.sourceGameId)?.displayLabel ??
            `Lobby ${connection.sourceGameId}`,
          targetLabel:
            gamesById.get(connection.targetGameId)?.displayLabel ??
            `Lobby ${connection.targetGameId}`,
        };
      }
    }
    if (selectedGameId !== null) {
      const game = gamesById.get(selectedGameId);
      if (game) {
        return {
          kind: "lobby",
          game,
          assignments: assignments.filter(
            assignment => assignment.gameId === game.id
          ),
          capacity: getLobbyCapacity(game.gameType),
        };
      }
    }
    if (selectedRoundGameIds.size > 0) {
      const firstGrouped = games.find(
        game => selectedRoundGameIds.has(game.id) && game.roundGroupId
      );
      const groupId = firstGrouped?.roundGroupId ?? null;
      return {
        kind: "group",
        gameIds: Array.from(selectedRoundGameIds),
        group: groupId
          ? {
              id: groupId,
              label: firstGrouped?.roundLabel ?? "Group",
              colorId: isRoundFrameColorId(firstGrouped?.roundColor)
                ? firstGrouped.roundColor
                : "gold",
              locked: games.some(
                game => game.roundGroupId === groupId && game.roundLocked === 1
              ),
            }
          : null,
      };
    }
    return { kind: "board" };
  }, [
    assignments,
    connections,
    games,
    gamesById,
    gamesWithOutgoingLoserConnection,
    selectedAssignmentContext,
    selectedConnectionId,
    selectedGameId,
    selectedRoundGameIds,
  ]);

  // On smaller screens, reveal the bottom dock when something gets selected
  // so its controls are within reach; the user can dismiss it at any time.
  const selectionKind = selection.kind;
  useEffect(() => {
    if (isDesktop || selectionKind === "board") return;
    setMobileDockOpen(true);
    setInspectorTab("inspect");
  }, [isDesktop, selectionKind]);

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
        description={getSafeTournamentControlErrorMessage(query.error.message)}
      />
    );
  }
  if (!query.data) return <ControlState title="Tournament not found" />;
  const championRow = scoreboardRows.find(row =>
    (
      query.data as {
        results?: Array<{ tournamentTeamId: number; isChampion: number }>;
      } & typeof query.data
    ).results?.some(
      result =>
        result.tournamentTeamId === row.teamId && result.isChampion === 1
    )
  );
  const canFinalizeTournament =
    auth.user.role === "admin" ||
    query.data.tournament.ownerUserId === auth.user.id;

  const groupSelectionForActions =
    selection.kind === "group" ? selection : null;

  const openGroupRenameDialog = () => {
    const game = games.find(
      item => selectedRoundGameIds.has(item.id) && item.roundGroupId
    );
    if (game?.roundGroupId)
      openDialog(
        {
          type: "round",
          mode: "rename",
          roundGroupId: game.roundGroupId,
          currentValue: game.roundLabel ?? "Group",
        },
        game.roundLabel ?? "Group"
      );
  };

  const addSelectedToGroup = () => {
    const roundGame = games.find(
      game => selectedRoundGameIds.has(game.id) && game.roundGroupId
    );
    if (!roundGame?.roundGroupId) return;
    updateRoundGroup.mutate({
      tournamentId,
      gameIds: Array.from(selectedRoundGameIds),
      mode: "add",
      roundGroupId: roundGame.roundGroupId,
      label: roundGame.roundLabel ?? "Group",
    });
  };

  const organizeGroup = (groupId: string) => {
    const positions = organizeGroupLobbyPositions(games, groupId);
    setOptimisticGamePositions(current => {
      const next = new Map(current);
      positions.forEach((position, gameId) => next.set(gameId, position));
      return next;
    });
    persistGroupPositions(positions);
  };

  const inspectorElement = (
    <TcrInspector
      selection={selection}
      isFinalized={isFinalizedLocked}
      tab={inspectorTab}
      onTabChange={setInspectorTab}
      scoreboardRows={scoreboardRows}
      championTeamId={championRow?.teamId ?? null}
      teamsById={teamsById}
      onCreateTeam={() => openDialog({ type: "create-team" })}
      onCreateCashoutLobby={() =>
        createCashout.mutate({
          tournamentId,
          position: getCanvasCenterPoint(),
        })
      }
      onCreateFinalRoundMatch={() =>
        createFinal.mutate({
          tournamentId,
          position: getCanvasCenterPoint(),
        })
      }
      onOpenHelp={() => setHelpOpen(true)}
      onRenameLobby={game =>
        openDialog(
          {
            type: "rename",
            gameId: game.id,
            currentValue: game.displayLabel,
          },
          game.displayLabel
        )
      }
      onSetStatus={(gameId, status) => updateStatus.mutate({ gameId, status })}
      onSetMap={(gameId, mapId) => setGameMap.mutate({ gameId, mapId })}
      onRandomizeMap={gameId => randomizeGameMap.mutate({ gameId })}
      onSetBestOf={(gameId, seriesBestOf) =>
        setBestOf.mutate({ gameId, seriesBestOf })
      }
      onEditLobbyCode={game =>
        openDialog(
          {
            type: "lobby",
            gameId: game.id,
            currentValue: game.privateLobbyCode ?? "",
          },
          game.privateLobbyCode ?? ""
        )
      }
      onEditBroadcast={game =>
        openDialog(
          {
            type: "broadcast",
            gameId: game.id,
            currentValue: game.broadcastUrl ?? "",
          },
          game.broadcastUrl ?? ""
        )
      }
      onAutoFill={gameId => autoFillLobby.mutate({ gameId })}
      autoFillPending={autoFillLobby.isPending}
      onRemoveAssignedTeams={gameId => removeAssignedTeams.mutate({ gameId })}
      onDeleteLobby={game =>
        setDialogState({
          type: "delete",
          gameId: game.id,
          label: game.displayLabel,
        })
      }
      onSelectAssignment={selectAssignment}
      onSetPlacement={(assignmentId, resultPlacement) => {
        if (isFinalizedLocked) return;
        setPlacement.mutate({ assignmentId, resultPlacement });
      }}
      onReturnTeamToAvailable={(gameId, teamId) =>
        removeTeam.mutate({ gameId, teamId })
      }
      onDeleteConnection={connectionId => {
        runDestructiveBoardAction(() =>
          deleteGameConnection.mutateAsync({ connectionId })
        );
        setSelectedConnectionId(null);
      }}
      onCreateGroup={() =>
        openDialog({ type: "round", mode: "create" }, "Group")
      }
      onRenameGroup={openGroupRenameDialog}
      onAddSelectedToGroup={addSelectedToGroup}
      onRemoveFromGroup={() =>
        updateRoundGroup.mutate({
          tournamentId,
          gameIds: Array.from(selectedRoundGameIds),
          mode: "remove",
        })
      }
      onClearGroupSelection={() => setSelectedRoundGameIds(new Set())}
      onSetGroupColor={colorId => {
        const group = groupSelectionForActions?.group;
        if (!group) return;
        updateRoundGroup.mutate({
          tournamentId,
          gameIds: games
            .filter(game => game.roundGroupId === group.id)
            .map(game => game.id),
          roundGroupId: group.id,
          color: colorId,
          mode: "color",
        });
      }}
      onToggleGroupLock={() => {
        const group = groupSelectionForActions?.group;
        if (!group) return;
        setRoundGroupLocked.mutate({
          tournamentId,
          roundGroupId: group.id,
          locked: !group.locked,
        });
      }}
      onOrganizeGroup={() => {
        const group = groupSelectionForActions?.group;
        if (group) organizeGroup(group.id);
      }}
      onDeleteGroup={() => {
        const group = groupSelectionForActions?.group;
        if (group)
          setDialogState({
            type: "delete-round",
            roundGroupId: group.id,
            label: group.label,
          });
      }}
    />
  );

  const teamsPanelElement = (
    <TcrTeamsPanel
      teams={unassignedTeams}
      isFinalized={isFinalizedLocked}
      deletePending={deleteTeam.isPending}
      onCreateTeam={() => openDialog({ type: "create-team" })}
      onTeamDragStart={teamId => setDragPayload({ teamId })}
      onTeamDragEnd={() => setDragPayload(null)}
      onCreateClaimLink={teamId => createClaimLink.mutate({ teamId })}
      onDeleteTeam={(teamId, teamName) =>
        setDialogState({ type: "delete-team", teamId, teamName })
      }
      onReturnDragOver={event => {
        const payload =
          parseDragPayload(event.dataTransfer.getData("application/json")) ??
          dragPayload;
        if (!payload?.fromGameId) return;
        const sourceGame = gamesById.get(payload.fromGameId);
        if (sourceGame?.status === "complete") return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onReturnDrop={event => {
        event.preventDefault();
        const payload =
          parseDragPayload(event.dataTransfer.getData("application/json")) ??
          dragPayload;
        if (!payload?.fromGameId) return;
        const sourceGame = gamesById.get(payload.fromGameId);
        if (sourceGame?.status === "complete") return;
        removeTeam.mutate(
          { gameId: payload.fromGameId, teamId: payload.teamId },
          { onSuccess: () => setDragPayload(null) }
        );
      }}
    />
  );

  return (
    <section className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col bg-zinc-950 text-zinc-100">
      <AlertDialog
        open={finalizeDialogOpen}
        onOpenChange={setFinalizeDialogOpen}
      >
        <AlertDialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize tournament?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Finalizing will save all team results, name the Champion, mark the
              tournament complete, freeze the TCR, and prevent further changes
              unless a site administrator unlocks it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={finalizeTournament.isPending}
              onClick={() => finalizeTournament.mutate({ tournamentId })}
            >
              Finalize Tournament
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={regenerateViewerDialogOpen}
        onOpenChange={setRegenerateViewerDialogOpen}
      >
        <AlertDialogContent className="border-red-300/30 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate viewer link?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              The current viewer link will stop working immediately. Anyone
              using the old link will need the new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={regenerateViewerLink.isPending}
              onClick={() => regenerateViewerLink.mutate({ tournamentId })}
            >
              Regenerate Viewer Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <AlertDialogContent className="border-red-300/30 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock tournament?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Archived results will temporarily be considered under correction
              until the tournament is finalized again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={unlockTournamentForEditing.isPending}
              onClick={() =>
                unlockTournamentForEditing.mutate({ tournamentId })
              }
            >
              Unlock for Editing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TcrHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <TcrTopBar
        tournamentName={query.data.tournament.name}
        eventStatus={query.data.tournament.eventStatus}
        currentStage={query.data.tournament.currentStage}
        backHref={isPersonalTcr ? "/TCR" : "/admin/tournaments/control"}
        isFinalized={isFinalizedLocked}
        finalizedAtLabel={
          query.data.tournament.finalizedAt
            ? new Date(query.data.tournament.finalizedAt).toLocaleString()
            : null
        }
        championName={championRow?.teamName ?? null}
        onRenameTournament={() => {
          if (isFinalizedLocked) return;
          setFormName(query.data.tournament.name);
          setFormError(null);
          setDialogState({
            type: "rename-tournament",
            currentValue: query.data.tournament.name,
          });
        }}
        viewerLinkPending={
          enableViewerLink.isPending || regenerateViewerLink.isPending
        }
        onCopyViewerLink={() => enableViewerLink.mutate({ tournamentId })}
        onRegenerateViewerLink={() => setRegenerateViewerDialogOpen(true)}
        onSaveTemplate={() => {
          setTemplateName(`${query.data.tournament.name} Template`);
          setTemplateVisibility("private");
          setSaveTemplateOpen(true);
        }}
        canFinalize={!isFinalizedLocked && canFinalizeTournament}
        finalizePending={finalizeTournament.isPending}
        onFinalize={() => setFinalizeDialogOpen(true)}
        canUnlock={isFinalizedLocked && auth.user.role === "admin"}
        unlockPending={unlockTournamentForEditing.isPending}
        onUnlock={() => setUnlockDialogOpen(true)}
        canManageStaff={canManageStaff}
        hasActiveStaffInvite={Boolean(staffQuery.data?.activeInvite)}
        staffMembers={(staffQuery.data?.members ?? []) as StaffMemberView[]}
        staffInvitePending={
          createStaffInviteLink.isPending ||
          regenerateStaffInviteLink.isPending ||
          revokeStaffInviteLink.isPending
        }
        onCreateStaffInvite={() =>
          createStaffInviteLink.mutate({ tournamentId })
        }
        onRegenerateStaffInvite={() =>
          regenerateStaffInviteLink.mutate({ tournamentId })
        }
        onRevokeStaffInvite={() =>
          revokeStaffInviteLink.mutate({ tournamentId })
        }
        removeStaffPending={removeStaffMember.isPending}
        onRemoveStaffMember={memberId =>
          removeStaffMember.mutate({ tournamentId, memberId })
        }
      />

      <div className="flex min-h-0 flex-1">
        {teamsOpen && (
          <aside
            aria-label={availableTeamsToggleLabel}
            className="hidden w-72 shrink-0 border-r border-white/10 bg-zinc-950 lg:block"
          >
            {teamsPanelElement}
          </aside>
        )}

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <TcrToolbar
            isFinalized={isFinalizedLocked}
            onCreateTeam={() => openDialog({ type: "create-team" })}
            onCreateCashoutLobby={() =>
              createCashout.mutate({
                tournamentId,
                position: getCanvasCenterPoint(),
              })
            }
            onCreateFinalRoundMatch={() =>
              createFinal.mutate({
                tournamentId,
                position: getCanvasCenterPoint(),
              })
            }
            canUndo={
              undoHistory.length > 0 &&
              !restoreTournamentBoardSnapshot.isPending
            }
            onUndo={undoBoardAction}
            zoomPercent={Math.round(zoom * 100)}
            canZoomIn={zoom < maxZoom}
            canZoomOut={zoom > minZoom}
            onZoomIn={() => zoomBoardFromCenter(0.1)}
            onZoomOut={() => zoomBoardFromCenter(-0.1)}
            onFitToContent={fitOrResetBoardView}
            fitLabel={
              games.length > 0 ? "Fit lobbies to view" : "Reset board view"
            }
            snapToGrid={snapWindowsToGrid}
            onToggleSnap={() => setSnapWindowsToGrid(current => !current)}
            onOpenHelp={() => setHelpOpen(true)}
            onBulkDeleteConnections={() =>
              setDialogState({ type: "bulk-delete-connections" })
            }
            onBulkReturnTeams={() =>
              setDialogState({ type: "bulk-return-teams" })
            }
            onBulkWipeCanvas={() =>
              setDialogState({ type: "bulk-wipe-canvas" })
            }
            teamCount={unassignedTeams.length}
            teamsOpen={isDesktop ? teamsOpen : mobileTeamsOpen}
            onToggleTeams={() =>
              isDesktop
                ? setTeamsOpen(current => !current)
                : setMobileTeamsOpen(current => !current)
            }
            inspectorOpen={isDesktop ? inspectorOpen : mobileDockOpen}
            onToggleInspector={() =>
              isDesktop
                ? setInspectorOpen(current => !current)
                : setMobileDockOpen(current => !current)
            }
          />

          {mobileTeamsOpen && (
            <div className="max-h-[32dvh] shrink-0 overflow-hidden border-b border-white/10 bg-zinc-950 lg:hidden">
              {teamsPanelElement}
            </div>
          )}

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <main
                  ref={canvasRef}
                  aria-label="Tournament board canvas"
                  className={`relative h-full min-h-0 touch-none overflow-auto overscroll-contain bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:40px_40px,40px_40px] ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
                  onWheel={event => {
                    if (!event.shiftKey) return;
                    event.preventDefault();
                    const element = canvasRef.current;
                    const rect = element?.getBoundingClientRect();
                    if (!element || !rect) return;
                    const focalCanvasPoint = {
                      x:
                        (event.clientX - rect.left + element.scrollLeft) / zoom,
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
                          const midpoint = getMidpoint(
                            pointers[0],
                            pointers[1]
                          );
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
                              (midpoint.y - rect.top + element.scrollTop) /
                              zoom,
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

                    if (
                      event.button !== 0 ||
                      !shouldStartCanvasPan(event.target)
                    )
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
                      dragged: false,
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
                    if (
                      hasPointerExceededDragThreshold(
                        panStart,
                        event.nativeEvent
                      )
                    ) {
                      panStart.dragged = true;
                    }
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
                    const panStart = canvasPanRef.current;
                    if (panStart?.pointerId === event.pointerId) {
                      const isBackgroundClick =
                        !panStart.dragged &&
                        !event.ctrlKey &&
                        !event.shiftKey &&
                        !hasPointerExceededDragThreshold(
                          panStart,
                          event.nativeEvent
                        );
                      canvasPanRef.current = null;
                      setIsPanning(false);
                      if (isBackgroundClick) {
                        setSelectedRoundGameIds(new Set());
                      }
                    }
                    if (
                      event.currentTarget.hasPointerCapture?.(event.pointerId)
                    ) {
                      event.currentTarget.releasePointerCapture(
                        event.pointerId
                      );
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
                    if (
                      event.target instanceof Element &&
                      event.target.closest('[data-round-group-header="true"]')
                    ) {
                      return;
                    }
                    setCanvasMenuPosition(
                      canvasPoint(event.clientX, event.clientY)
                    );
                  }}
                >
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
                      {roundFrames.map((frame: RoundFrame) => {
                        const groupGameIds = getRoundGroupGameIds(
                          games,
                          frame.groupId
                        );
                        const groupSelected = isRoundGroupSelected(
                          selectedRoundGameIds,
                          groupGameIds
                        );
                        return (
                          <div
                            key={`${frame.groupId}-frame`}
                            className={`pointer-events-none absolute z-0 rounded-xl border-2 ${frame.theme.frame} ${groupSelected ? "ring-2 ring-[#FFD700] ring-offset-2 ring-offset-black/80" : ""}`}
                            style={{
                              left: frame.x,
                              top: frame.y,
                              width: frame.width,
                              height: frame.height,
                            }}
                          />
                        );
                      })}
                      {roundFrames.map((frame: RoundFrame) => {
                        const groupGameIds = getRoundGroupGameIds(
                          games,
                          frame.groupId
                        );
                        const groupSelected = isRoundGroupSelected(
                          selectedRoundGameIds,
                          groupGameIds
                        );
                        return (
                          <ContextMenu key={`${frame.groupId}-header-menu`}>
                            <ContextMenuTrigger asChild>
                              <div
                                role="button"
                                tabIndex={0}
                                data-no-canvas-pan="true"
                                data-round-group-header="true"
                                className={`pointer-events-auto absolute z-[2] touch-none select-none rounded-md border-2 px-3 py-1.5 text-sm font-bold ${frame.theme.label} ${groupSelected ? "ring-4 ring-[#FFD700]/80" : ""} ${groupDrag?.groupId === frame.groupId ? "cursor-grabbing" : "cursor-grab"}`}
                                style={{
                                  left: frame.x + 20,
                                  top: frame.y - 28,
                                }}
                                aria-label={`${frame.label} group actions and drag handle`}
                                aria-pressed={groupSelected}
                                onContextMenu={event => {
                                  event.stopPropagation();
                                }}
                                onKeyDown={event => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    selectRoundGroup(
                                      frame.groupId,
                                      event.ctrlKey || event.shiftKey
                                    );
                                  }
                                }}
                                onPointerDown={event => {
                                  if (event.button !== 0 || frame.locked)
                                    return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  const startPositions = new Map(
                                    games
                                      .filter(
                                        game =>
                                          game.roundGroupId === frame.groupId
                                      )
                                      .map(
                                        game =>
                                          [
                                            game.id,
                                            getVisualPosition(game),
                                          ] as const
                                      )
                                  );
                                  if (startPositions.size === 0) return;
                                  event.currentTarget.setPointerCapture?.(
                                    event.pointerId
                                  );
                                  const nextGroupDrag: GroupDragSession = {
                                    groupId: frame.groupId,
                                    pointerId: event.pointerId,
                                    clientX: event.clientX,
                                    clientY: event.clientY,
                                    additiveSelection:
                                      event.ctrlKey || event.shiftKey,
                                    dragged: false,
                                    persisted: false,
                                    startPositions,
                                  };
                                  groupDragRef.current = nextGroupDrag;
                                  suppressGroupHeaderClickRef.current = false;
                                  setGroupDrag({
                                    groupId: frame.groupId,
                                    pointerId: event.pointerId,
                                    dragged: false,
                                  });
                                }}
                                onPointerMove={event => {
                                  const dragStart = groupDragRef.current;
                                  if (
                                    dragStart?.groupId !== frame.groupId ||
                                    dragStart.pointerId !== event.pointerId
                                  ) {
                                    return;
                                  }
                                  const dragged =
                                    dragStart.dragged ||
                                    hasPointerExceededDragThreshold(
                                      dragStart,
                                      event.nativeEvent
                                    );
                                  if (!dragged) return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  if (!dragStart.dragged) {
                                    dragStart.dragged = true;
                                    setGroupDrag(current =>
                                      current?.groupId === dragStart.groupId
                                        ? { ...current, dragged: true }
                                        : current
                                    );
                                  }
                                  applyGroupDragPositions(
                                    getGroupDragPositions(
                                      dragStart,
                                      event.clientX,
                                      event.clientY
                                    )
                                  );
                                }}
                                onPointerUp={event => {
                                  const dragStart = groupDragRef.current;
                                  if (
                                    dragStart?.groupId !== frame.groupId ||
                                    dragStart.pointerId !== event.pointerId
                                  ) {
                                    return;
                                  }
                                  event.preventDefault();
                                  event.stopPropagation();
                                  const dragged =
                                    dragStart.dragged ||
                                    hasPointerExceededDragThreshold(
                                      dragStart,
                                      event.nativeEvent
                                    );
                                  if (dragged) {
                                    const positions = getGroupDragPositions(
                                      dragStart,
                                      event.clientX,
                                      event.clientY
                                    );
                                    applyGroupDragPositions(positions);
                                    if (!dragStart.persisted) {
                                      dragStart.persisted = true;
                                      persistGroupPositions(positions);
                                    }
                                    suppressGroupHeaderClickRef.current = true;
                                  } else {
                                    selectRoundGroup(
                                      frame.groupId,
                                      dragStart.additiveSelection
                                    );
                                  }
                                  clearGroupDrag(event.currentTarget);
                                }}
                                onPointerCancel={event => {
                                  const dragStart = groupDragRef.current;
                                  if (
                                    dragStart?.groupId === frame.groupId &&
                                    dragStart.pointerId === event.pointerId
                                  ) {
                                    event.stopPropagation();
                                    clearGroupDrag(event.currentTarget);
                                  }
                                }}
                                onLostPointerCapture={event => {
                                  const dragStart = groupDragRef.current;
                                  if (
                                    dragStart?.groupId === frame.groupId &&
                                    dragStart.pointerId === event.pointerId
                                  ) {
                                    clearGroupDrag();
                                  }
                                }}
                                onClick={event => {
                                  if (!suppressGroupHeaderClickRef.current) {
                                    return;
                                  }
                                  event.preventDefault();
                                  event.stopPropagation();
                                  suppressGroupHeaderClickRef.current = false;
                                }}
                              >
                                <span>{frame.label}</span>
                                <button
                                  type="button"
                                  data-no-canvas-pan="true"
                                  aria-label={
                                    frame.locked
                                      ? "Unlock group positions"
                                      : "Lock group positions"
                                  }
                                  title={
                                    frame.locked
                                      ? "Unlock group positions"
                                      : "Lock group positions"
                                  }
                                  className="ml-2 inline-flex rounded border border-white/20 bg-black/30 p-0.5 align-middle"
                                  onPointerDown={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setRoundGroupLocked.mutate({
                                      tournamentId,
                                      roundGroupId: frame.groupId,
                                      locked: !frame.locked,
                                    });
                                  }}
                                >
                                  {frame.locked ? (
                                    <Lock size={14} />
                                  ) : (
                                    <LockOpen size={14} />
                                  )}
                                </button>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent
                              onPointerDown={event => event.stopPropagation()}
                            >
                              <ContextMenuLabel className="text-[#FFD700]">
                                Select Color
                              </ContextMenuLabel>
                              {roundFrameColorIds.map(colorId => (
                                <ContextMenuItem
                                  key={colorId}
                                  onClick={() =>
                                    updateRoundGroup.mutate({
                                      tournamentId,
                                      gameIds: games
                                        .filter(
                                          game =>
                                            game.roundGroupId === frame.groupId
                                        )
                                        .map(game => game.id),
                                      roundGroupId: frame.groupId,
                                      color: colorId,
                                      mode: "color",
                                    })
                                  }
                                >
                                  <span
                                    className={`mr-2 inline-block h-3 w-3 rounded-full border ${roundFrameThemes[colorId].label}`}
                                  />
                                  {colorId === frame.colorId ? "✓ " : ""}
                                  {colorId}
                                </ContextMenuItem>
                              ))}
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() => organizeGroup(frame.groupId)}
                              >
                                Organize Lobbies
                              </ContextMenuItem>
                              <ContextMenuItem
                                className="text-red-300"
                                onClick={() =>
                                  setDialogState({
                                    type: "delete-round",
                                    roundGroupId: frame.groupId,
                                    label: frame.label,
                                  })
                                }
                              >
                                Delete Group
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })}
                      <svg
                        className="absolute inset-0 z-[1] overflow-visible"
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
                                    strokeWidth={
                                      isSelectedConnection ? "7" : "6"
                                    }
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
                        <div className="absolute left-8 top-8 max-w-sm rounded-lg border border-dashed border-white/20 bg-zinc-950/85 p-5">
                          <h3 className="text-lg font-semibold text-zinc-50">
                            Empty board
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                            Use <span className="text-[#FFD700]">Add</span> in
                            the toolbar — or right-click the canvas — to create
                            a team or lobby.
                          </p>
                        </div>
                      )}
                      {games.map(game => {
                        const gameAssignments = assignments.filter(
                          assignment => assignment.gameId === game.id
                        );
                        const visualPosition = getVisualPosition(game);

                        const handleNodeClick = (
                          event: ReactMouseEvent<HTMLDivElement>
                        ) => {
                          event.stopPropagation();
                          if (event.ctrlKey || event.shiftKey) {
                            setSelectedRoundGameIds(current => {
                              const next = new Set(current);
                              if (next.has(game.id)) next.delete(game.id);
                              else next.add(game.id);
                              return next;
                            });
                            setSelectedGameId(null);
                            setSelectedConnectionId(null);
                            setSelectedAssignmentId(null);
                            return;
                          }
                          setSelectedGameId(game.id);
                          setSelectedConnectionId(null);
                          setSelectedAssignmentId(null);
                        };

                        const handleNodePointerDown = (
                          event: ReactPointerEvent<HTMLDivElement>
                        ) => {
                          if (
                            event.pointerType === "touch" ||
                            isPinchingRef.current ||
                            (game.roundGroupId && game.roundLocked === 1)
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
                        };

                        const handleConnectorPointerDown = (
                          flowType: ConnectionFlowType,
                          event: ReactPointerEvent<HTMLButtonElement>
                        ) => {
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
                        };

                        return (
                          <TcrLobbyNode
                            key={game.id}
                            game={game}
                            nowMs={nowMs}
                            assignments={gameAssignments}
                            teamsById={teamsById}
                            tournamentName={query.data.tournament.name}
                            discordConfigured={Boolean(
                              query.data.discordConfigured
                            )}
                            zoom={zoom}
                            isMinimized={minimizedGameIds.has(game.id)}
                            isSelected={selectedGameId === game.id}
                            isGroupSelected={selectedRoundGameIds.has(game.id)}
                            isDragging={nodeDrag?.gameId === game.id}
                            visualPosition={visualPosition}
                            selectedAssignmentId={selectedAssignmentId}
                            hasOutgoingLoserConnection={gamesWithOutgoingLoserConnection.has(
                              game.id
                            )}
                            dragPayload={dragPayload}
                            onNodeClick={handleNodeClick}
                            onNodePointerDown={handleNodePointerDown}
                            onConnectorPointerDown={handleConnectorPointerDown}
                            onDropTeam={(payload, preferredSlotIndex) =>
                              assignDroppedTeam(
                                game,
                                gameAssignments,
                                payload,
                                preferredSlotIndex
                              )
                            }
                            onToggleMinimize={() =>
                              toggleMinimizedGame(game.id)
                            }
                            onMeasureHeight={height =>
                              setMeasuredNodeHeights(current =>
                                current.get(game.id) === height
                                  ? current
                                  : new Map(current).set(game.id, height)
                              )
                            }
                            onSelectAssignment={selectAssignment}
                            onCyclePlacement={assignment =>
                              cycleAssignmentPlacement(
                                assignment,
                                getLobbyCapacity(game.gameType)
                              )
                            }
                            onTeamDragStart={teamId =>
                              setDragPayload({
                                teamId,
                                fromGameId: game.id,
                              })
                            }
                            onTeamDragEnd={() => setDragPayload(null)}
                            onRename={() =>
                              openDialog(
                                {
                                  type: "rename",
                                  gameId: game.id,
                                  currentValue: game.displayLabel,
                                },
                                game.displayLabel
                              )
                            }
                            onEditLobbyCode={() =>
                              openDialog(
                                {
                                  type: "lobby",
                                  gameId: game.id,
                                  currentValue: game.privateLobbyCode ?? "",
                                },
                                game.privateLobbyCode ?? ""
                              )
                            }
                            onEditBroadcast={() =>
                              openDialog(
                                {
                                  type: "broadcast",
                                  gameId: game.id,
                                  currentValue: game.broadcastUrl ?? "",
                                },
                                game.broadcastUrl ?? ""
                              )
                            }
                            onSetBestOf={seriesBestOf =>
                              setBestOf.mutate({
                                gameId: game.id,
                                seriesBestOf,
                              })
                            }
                            onUpdateStatus={status =>
                              updateStatus.mutate({ gameId: game.id, status })
                            }
                            onRemoveAssignedTeams={() =>
                              removeAssignedTeams.mutate({ gameId: game.id })
                            }
                            onRequestDelete={() =>
                              setDialogState({
                                type: "delete",
                                gameId: game.id,
                                label: game.displayLabel,
                              })
                            }
                            onAutoFill={() =>
                              autoFillLobby.mutate({ gameId: game.id })
                            }
                            autoFillPending={
                              autoFillLobby.isPending &&
                              autoFillLobby.variables?.gameId === game.id
                            }
                            onSetMap={mapId =>
                              setGameMap.mutate({ gameId: game.id, mapId })
                            }
                            onRandomizeMap={() =>
                              randomizeGameMap.mutate({ gameId: game.id })
                            }
                            sendingTeamId={
                              sendLobbyCodeToTeamLeader.variables?.teamId ??
                              null
                            }
                            sendingLobby={sendLobbyCodeToLobbyLeaders.isPending}
                            onSendTeamCode={teamId =>
                              sendLobbyCodeToTeamLeader.mutate({
                                gameId: game.id,
                                teamId,
                              })
                            }
                            onSendLobbyCodes={() =>
                              sendLobbyCodeToLobbyLeaders.mutate({
                                gameId: game.id,
                              })
                            }
                          />
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

            {mobileDockOpen && (
              <div
                className="absolute inset-x-0 bottom-0 z-[60] flex max-h-[45dvh] flex-col border-t border-white/10 bg-zinc-950 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] lg:hidden"
                role="region"
                aria-label="Selection details"
              >
                <div className="flex shrink-0 items-center justify-end border-b border-white/10 px-2 py-1">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70"
                    aria-label="Close selection details"
                    onClick={() => setMobileDockOpen(false)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {inspectorElement}
                </div>
              </div>
            )}
          </div>
        </div>

        {inspectorOpen && (
          <aside
            aria-label="Inspect and Scoreboard panel"
            className="hidden w-80 shrink-0 border-l border-white/10 bg-zinc-950 lg:block"
          >
            {inspectorElement}
          </aside>
        )}
      </div>

      <Dialog
        open={
          dialogState?.type === "create-team" ||
          dialogState?.type === "rename-tournament" ||
          dialogState?.type === "rename" ||
          dialogState?.type === "lobby" ||
          dialogState?.type === "broadcast" ||
          dialogState?.type === "round"
        }
        onOpenChange={open => !open && setDialogState(null)}
      >
        <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>
              {dialogState?.type === "create-team"
                ? "Create Team"
                : dialogState?.type === "rename-tournament"
                  ? "Edit Tournament Name"
                  : dialogState?.type === "rename"
                    ? "Rename Game"
                    : dialogState?.type === "broadcast"
                      ? "Set Broadcast Link"
                      : dialogState?.type === "round"
                        ? dialogState.mode === "rename"
                          ? "Rename Group"
                          : "Create Group From Selection"
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
          {formError && dialogState?.type === "rename-tournament" && (
            <p className="text-sm text-red-200">{formError}</p>
          )}
          <div className="space-y-3">
            <Input
              value={formName}
              onChange={event => {
                setFormName(event.target.value);
                setFormError(null);
              }}
              onKeyDown={event => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                event.stopPropagation();
                submitDialog();
              }}
              className="border-white/15 bg-black/60 text-white"
              placeholder={
                dialogState?.type === "create-team"
                  ? "Team name"
                  : dialogState?.type === "rename-tournament"
                    ? "Tournament name"
                    : dialogState?.type === "rename"
                      ? "Game label"
                      : dialogState?.type === "broadcast"
                        ? "https://twitch.tv/channel"
                        : dialogState?.type === "round"
                          ? "Group label"
                          : "Lobby code"
              }
            />
          </div>
          <DialogFooter>
            <Button
              className="border border-[#FFD700] bg-[#FFD700] text-black hover:bg-[#D4AF37]"
              disabled={
                dialogState?.type === "rename-tournament"
                  ? formName.trim().length < 2 ||
                    renameTournament.isPending ||
                    formName.trim() === dialogState.currentValue
                  : undefined
              }
              onClick={submitDialog}
            >
              {dialogState?.type === "rename-tournament" &&
              renameTournament.isPending
                ? "Saving…"
                : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription>
              Templates copy lobby layout, maps, rounds, and connections only.
              Assigned teams, private lobby codes, and private tournament
              details are not copied. Public templates can be used by other TCR
              users.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={templateName}
            onChange={event => setTemplateName(event.target.value)}
            placeholder="Template name"
            className="border-white/15 bg-black/60 text-white"
          />
          <select
            className="rounded-md border border-white/15 bg-black/60 px-3 py-2 text-white"
            value={templateVisibility}
            onChange={event =>
              setTemplateVisibility(event.target.value as "private" | "public")
            }
          >
            <option value="private">Private — only you can use it</option>
            <option value="public">Public — any TCR user can use it</option>
          </select>
          {(savePersonalTemplate.error || saveAdminTemplate.error) && (
            <p className="text-sm text-red-200">
              {(savePersonalTemplate.error || saveAdminTemplate.error)?.message}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => setSaveTemplateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="border border-[#FFD700] bg-[#FFD700] text-black hover:bg-[#D4AF37]"
              disabled={
                templateName.trim().length < 2 ||
                savePersonalTemplate.isPending ||
                saveAdminTemplate.isPending
              }
              onClick={() => {
                const input = {
                  tournamentId,
                  name: templateName,
                  visibility: templateVisibility,
                };
                const options = { onSuccess: () => setSaveTemplateOpen(false) };
                if (isPersonalTcr) savePersonalTemplate.mutate(input, options);
                else saveAdminTemplate.mutate(input, options);
              }}
            >
              {savePersonalTemplate.isPending || saveAdminTemplate.isPending
                ? "Saving…"
                : "Save Template"}
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
              connections. You can undo this once from the toolbar.
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
        open={dialogState?.type === "delete-round"}
        onOpenChange={open => !open && setDialogState(null)}
      >
        <AlertDialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {dialogState?.type === "delete-round"
                ? dialogState.label
                : "group"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This deletes only the visual group. Its lobbies remain on the
              canvas as ungrouped lobbies with teams, codes, statuses, maps, and
              connections unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-white/10 text-white hover:bg-white/15">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 font-semibold text-white hover:bg-red-500"
              onClick={() => {
                if (dialogState?.type === "delete-round") {
                  updateRoundGroup.mutate({
                    tournamentId,
                    gameIds: games
                      .filter(
                        game => game.roundGroupId === dialogState.roundGroupId
                      )
                      .map(game => game.id),
                    roundGroupId: dialogState.roundGroupId,
                    mode: "remove",
                  });
                }
                setDialogState(null);
              }}
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={dialogState?.type === "delete-team"}
        onOpenChange={open => !open && setDialogState(null)}
      >
        <AlertDialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {dialogState?.type === "delete-team"
                ? dialogState.teamName
                : "team"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This permanently deletes the team and clears its bracket
              assignments, claim links, and lobby-code delivery records.
              Tournament submissions for its managed team are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-white/10 text-white hover:bg-white/15">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteTeam.isPending}
              className="bg-red-600 font-semibold text-white hover:bg-red-500"
              onClick={() => {
                if (dialogState?.type === "delete-team")
                  deleteTeam.mutate({
                    tournamentId,
                    teamId: dialogState.teamId,
                  });
              }}
            >
              {deleteTeam.isPending ? "Deleting…" : "Delete Team"}
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
        <AlertDialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogState?.type === "bulk-delete-connections"
                ? "Delete all connections?"
                : dialogState?.type === "bulk-return-teams"
                  ? "Return all teams to available?"
                  : "Wipe canvas?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
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
              className="bg-[#FFD700] font-semibold text-black hover:bg-[#e6c200]"
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
    <section className="min-h-screen bg-zinc-950 px-6 py-20 text-zinc-100">
      <div className="mx-auto max-w-xl rounded-lg border border-white/10 bg-zinc-900/60 p-8">
        <h1 className="text-2xl font-bold text-[#FFD700]">{title}</h1>
        {description && <p className="mt-3 text-zinc-400">{description}</p>}
        {showDiscordSignIn && (
          <a
            href={getDiscordLoginUrl()}
            className="mt-6 inline-flex rounded-md border border-[#5865F2]/70 bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4752c4]"
          >
            Sign in with Discord
          </a>
        )}
      </div>
    </section>
  );
}
