import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { Button } from "@/components/ui/button";
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

type DragPayload = { teamId: number; fromGameId?: number };
type GameStatus = "draft" | "ready" | "live" | "complete";
type GameType = "cashout" | "final_round";
type CanvasPoint = { x: number; y: number };
type NodeDragState = {
  gameId: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
};
type ConnectionDragState = {
  sourceGameId: number;
  sourcePoint: CanvasPoint;
  currentPoint: CanvasPoint;
};
type ControlTeamView = { id: number; name: string };
type ControlGameView = {
  id: number;
  tournamentId: number;
  gameType: GameType;
  status: GameStatus;
  displayLabel: string;
  canvasX: number;
  canvasY: number;
  privateLobbyCode?: string | null;
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
};
type DialogState =
  | { type: "create-team" }
  | { type: "rename"; gameId: number; currentValue: string }
  | { type: "lobby"; gameId: number; currentValue: string }
  | { type: "delete"; gameId: number; label: string }
  | null;

const statuses: GameStatus[] = ["draft", "ready", "live", "complete"];
const activeStatuses = new Set<GameStatus>(["draft", "ready", "live"]);
const minZoom = 0.55;
const maxZoom = 1.8;
const baseCanvasSize = { width: 2200, height: 1400 };
const nodeWidth = 320;

function parseDragPayload(value: string): DragPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<DragPayload>;
    if (typeof parsed.teamId !== "number" || !Number.isInteger(parsed.teamId)) {
      return null;
    }
    if (
      parsed.fromGameId !== undefined &&
      (typeof parsed.fromGameId !== "number" || !Number.isInteger(parsed.fromGameId))
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

function clampZoom(value: number) {
  return Math.min(maxZoom, Math.max(minZoom, Number(value.toFixed(2))));
}

function getNodeHeight(gameType: GameType, minimized: boolean) {
  if (minimized) return 132;
  return gameType === "cashout" ? 438 : 300;
}

function getConnectionPath(source: CanvasPoint, target: CanvasPoint) {
  const distance = Math.max(80, Math.abs(target.y - source.y) * 0.55);
  return `M ${source.x} ${source.y} C ${source.x} ${source.y + distance}, ${target.x} ${target.y - distance}, ${target.x} ${target.y}`;
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
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [nodeDrag, setNodeDrag] = useState<NodeDragState | null>(null);
  const [connectionDrag, setConnectionDrag] = useState<ConnectionDragState | null>(null);
  const [canvasMenuPosition, setCanvasMenuPosition] = useState({ x: 160, y: 120 });
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [formName, setFormName] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [minimizedGameIds, setMinimizedGameIds] = useState<Set<number>>(() => new Set());
  const [optimisticGamePositions, setOptimisticGamePositions] = useState<Map<number, CanvasPoint>>(
    () => new Map()
  );
  const [zoom, setZoom] = useState(1);

  const query = trpc.tournamentControl.get.useQuery(
    { tournamentId },
    {
      enabled: Number.isFinite(tournamentId) && auth.user?.loginMethod === "discord",
      retry: false,
    }
  );
  const invalidate = () => utils.tournamentControl.get.invalidate({ tournamentId });
  const mutationOptions = {
    onSuccess: invalidate,
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const createTeam = trpc.tournamentControl.createTeam.useMutation(mutationOptions);
  const createCashout = trpc.tournamentControl.createCashoutLobby.useMutation(mutationOptions);
  const createFinal = trpc.tournamentControl.createFinalRoundMatch.useMutation(mutationOptions);
  const moveGame = trpc.tournamentControl.moveGame.useMutation(mutationOptions);
  const connectGames = trpc.tournamentControl.connectGames.useMutation(mutationOptions);
  const deleteGameConnection = trpc.tournamentControl.deleteGameConnection.useMutation(mutationOptions);
  const renameGame = trpc.tournamentControl.renameGame.useMutation(mutationOptions);
  const setLobbyCode = trpc.tournamentControl.setLobbyCode.useMutation(mutationOptions);
  const updateStatus = trpc.tournamentControl.updateStatus.useMutation(mutationOptions);
  const setPlacement = trpc.tournamentControl.setAssignmentResultPlacement.useMutation(mutationOptions);
  const assignTeam = trpc.tournamentControl.assignTeam.useMutation(mutationOptions);
  const moveTeam = trpc.tournamentControl.moveTeam.useMutation(mutationOptions);
  const removeTeam = trpc.tournamentControl.removeTeam.useMutation(mutationOptions);
  const removeAssignedTeams = trpc.tournamentControl.removeAssignedTeams.useMutation(mutationOptions);
  const deleteGame = trpc.tournamentControl.deleteGame.useMutation(mutationOptions);

  const games = (query.data?.games ?? []) as ControlGameView[];
  const assignments = (query.data?.assignments ?? []) as AssignmentView[];
  const connections = (query.data?.connections ?? []) as ConnectionView[];

  const gamesById = useMemo(
    () => new Map<number, ControlGameView>(games.map(game => [game.id, game] as const)),
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
    () => new Map<number, ControlTeamView>(query.data?.teams.map(team => [team.id, team] as const) ?? []),
    [query.data]
  );
  const unassignedTeams =
    query.data?.teams.filter(team => !activeAssignedTeamIds.has(team.id)) ?? [];
  const logicalCanvasSize = useMemo(() => {
    return {
      width: Math.max(baseCanvasSize.width, ...games.map(game => game.canvasX + 520)),
      height: Math.max(baseCanvasSize.height, ...games.map(game => game.canvasY + 680)),
    };
  }, [games]);
  const selectedAssignmentContext = useMemo(() => {
    if (selectedAssignmentId === null) return null;
    const assignment = assignments.find(item => item.id === selectedAssignmentId);
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
      return optimisticGamePositions.get(game.id) ?? { x: game.canvasX, y: game.canvasY };
    },
    [nodeDrag, optimisticGamePositions]
  );

  const getPortPoint = useCallback(
    (game: ControlGameView, port: "top" | "bottom") => {
      const position = getVisualPosition(game);
      const minimized = minimizedGameIds.has(game.id);
      return {
        x: position.x + nodeWidth / 2,
        y: port === "top" ? position.y : position.y + getNodeHeight(game.gameType, minimized),
      };
    },
    [getVisualPosition, minimizedGameIds]
  );

  useEffect(() => {
    if (selectedAssignmentId === null) return;
    const assignmentExists = assignments.some(assignment => assignment.id === selectedAssignmentId);
    if (!assignmentExists) setSelectedAssignmentId(null);
  }, [assignments, selectedAssignmentId]);

  useEffect(() => {
    setOptimisticGamePositions(current => {
      if (current.size === 0) return current;
      const next = new Map(current);
      for (const game of games) {
        const optimistic = next.get(game.id);
        if (optimistic && optimistic.x === game.canvasX && optimistic.y === game.canvasY) {
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
  }, [selectedAssignmentContext, setPlacement]);

  const canvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      return {
        x: Math.max(
          0,
          Math.round(
            (clientX - (rect?.left ?? 0) + (canvasRef.current?.scrollLeft ?? 0)) / zoom
          )
        ),
        y: Math.max(
          0,
          Math.round(
            (clientY - (rect?.top ?? 0) + (canvasRef.current?.scrollTop ?? 0)) / zoom
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
      return {
        x: Math.max(0, Math.round(point.x - offsetX)),
        y: Math.max(0, Math.round(point.y - offsetY)),
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const position = getPosition(event.clientX, event.clientY);
      setNodeDrag(current =>
        current?.gameId === gameId ? { ...current, ...position } : current
      );
    };

    const finishDrag = (event: PointerEvent) => {
      const position = getPosition(event.clientX, event.clientY);
      setOptimisticGamePositions(current => new Map(current).set(gameId, position));
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
  }, [canvasPoint, moveGame, nodeDrag?.gameId, nodeDrag?.offsetX, nodeDrag?.offsetY]);

  useEffect(() => {
    if (!connectionDrag) return;

    const sourceGameId = connectionDrag.sourceGameId;
    const handlePointerMove = (event: PointerEvent) => {
      const currentPoint = canvasPoint(event.clientX, event.clientY);
      setConnectionDrag(current =>
        current?.sourceGameId === sourceGameId ? { ...current, currentPoint } : current
      );
    };

    const finishConnection = (event: PointerEvent) => {
      const target = event.target instanceof HTMLElement
        ? event.target.closest("[data-input-port-game-id]")
        : null;
      const targetGameId = target instanceof HTMLElement
        ? Number(target.dataset.inputPortGameId)
        : NaN;

      if (Number.isInteger(targetGameId) && targetGameId > 0 && targetGameId !== sourceGameId) {
        connectGames.mutate({ tournamentId, sourceGameId, targetGameId });
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
  }, [canvasPoint, connectGames, connectionDrag?.sourceGameId, tournamentId]);

  const openDialog = (state: Exclude<DialogState, null>, defaultValue = "") => {
    setDialogState(state);
    setFormName(defaultValue);
  };

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
  if (query.isLoading) return <ControlState title="Verifying Discord organizer roles…" />;
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
              {query.data.tournament.eventStatus} · {query.data.tournament.currentStage}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/tournaments/control"
              className="inline-flex rounded border border-[#FFD700]/70 bg-[#FFD700] px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-black shadow-[0_0_18px_rgba(255,215,0,0.22)] transition hover:bg-[#D4AF37]"
            >
              ← Tournament Rooms
            </Link>
            <div className="rounded border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/55">
              Click team + 1–4 score · drag lobby frame to move · drag bottom node to top node to connect
            </div>
          </div>
        </div>
      </header>
      <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 lg:grid-cols-[19rem_1fr]">
        <aside className="border-r border-white/10 bg-zinc-950/95 p-4">
          <h2 className="font-mono text-lg font-bold text-neon-gold">Available Teams</h2>
          <p className="mb-4 text-xs text-white/50">
            Teams assigned only to completed games remain available for new active games.
          </p>
          <div
            className="space-y-2"
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              const payload = parseDragPayload(event.dataTransfer.getData("application/json"));
              if (payload?.fromGameId) {
                removeTeam.mutate({ gameId: payload.fromGameId, teamId: payload.teamId });
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
                />
              ))
            )}
          </div>
        </aside>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <main
              ref={canvasRef}
              className="relative min-h-[720px] overflow-auto bg-[radial-gradient(circle_at_top,#4d39091a,transparent_32rem),linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:auto,40px_40px,40px_40px]"
              onWheel={event => {
                if (!event.shiftKey) return;
                event.preventDefault();
                const zoomDelta = event.deltaY > 0 ? -0.08 : 0.08;
                setZoom(current => clampZoom(current + zoomDelta));
              }}
              onContextMenu={event => {
                setCanvasMenuPosition(canvasPoint(event.clientX, event.clientY));
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
                >
                  <svg
                    className="absolute inset-0 z-0 overflow-visible"
                    width={logicalCanvasSize.width}
                    height={logicalCanvasSize.height}
                  >
                    <defs>
                      <marker
                        id="tournament-flow-arrow"
                        markerHeight="8"
                        markerWidth="8"
                        orient="auto"
                        refX="7"
                        refY="4"
                      >
                        <path d="M 0 0 L 8 4 L 0 8 z" fill="#FFD700" />
                      </marker>
                    </defs>
                    {connections.map(connection => {
                      const sourceGame = gamesById.get(connection.sourceGameId);
                      const targetGame = gamesById.get(connection.targetGameId);
                      if (!sourceGame || !targetGame) return null;
                      const source = getPortPoint(sourceGame, "bottom");
                      const target = getPortPoint(targetGame, "top");
                      return (
                        <path
                          key={connection.id}
                          d={getConnectionPath(source, target)}
                          fill="none"
                          markerEnd="url(#tournament-flow-arrow)"
                          stroke="#FFD700"
                          strokeOpacity="0.75"
                          strokeWidth="3"
                          style={{ pointerEvents: "stroke" }}
                          className="cursor-pointer transition hover:stroke-[4px]"
                          onDoubleClick={event => {
                            event.stopPropagation();
                            deleteGameConnection.mutate({ connectionId: connection.id });
                          }}
                        />
                      );
                    })}
                    {connectionDrag && (
                      <path
                        d={getConnectionPath(connectionDrag.sourcePoint, connectionDrag.currentPoint)}
                        fill="none"
                        stroke="#FFD700"
                        strokeDasharray="8 8"
                        strokeOpacity="0.85"
                        strokeWidth="3"
                      />
                    )}
                  </svg>
                  {games.length === 0 && (
                    <div className="absolute left-8 top-8 rounded border border-dashed border-neon-gold/40 bg-black/70 p-6">
                      <h3 className="font-mono text-xl font-bold text-neon-gold">Empty board</h3>
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

                    return (
                      <ContextMenu key={game.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            data-control-node="true"
                            onContextMenu={event => event.stopPropagation()}
                            onPointerDown={event => {
                              if (event.button !== 0 || shouldSkipNodeDrag(event.target)) return;
                              const point = canvasPoint(event.clientX, event.clientY);
                              setNodeDrag({
                                gameId: game.id,
                                offsetX: point.x - visualPosition.x,
                                offsetY: point.y - visualPosition.y,
                                x: visualPosition.x,
                                y: visualPosition.y,
                              });
                            }}
                            className={`absolute z-10 w-80 rounded-lg border bg-zinc-950/95 p-4 shadow-2xl ${
                              game.gameType === "cashout"
                                ? "border-neon-gold/60"
                                : "border-neon-magenta/60"
                            } ${nodeDrag?.gameId === game.id ? "z-50 cursor-grabbing ring-2 ring-[#FFD700]/60" : "cursor-grab"}`}
                            style={{ left: visualPosition.x, top: visualPosition.y }}
                          >
                            <button
                              type="button"
                              data-no-node-drag="true"
                              data-input-port-game-id={game.id}
                              title="Receive from previous lobby"
                              className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-[#FFD700] bg-black shadow-[0_0_14px_rgba(255,215,0,0.45)] transition hover:scale-110"
                            />
                            <button
                              type="button"
                              data-no-node-drag="true"
                              title="Drag to connect this lobby to another lobby"
                              className="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-[#FFD700] bg-[#FFD700] shadow-[0_0_14px_rgba(255,215,0,0.45)] transition hover:scale-110"
                              onPointerDown={event => {
                                if (event.button !== 0) return;
                                event.preventDefault();
                                event.stopPropagation();
                                const sourcePoint = getPortPoint(game, "bottom");
                                setConnectionDrag({
                                  sourceGameId: game.id,
                                  sourcePoint,
                                  currentPoint: sourcePoint,
                                });
                              }}
                            />
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <div>
                                <p className="font-mono text-xs uppercase tracking-widest text-white/45">
                                  {game.gameType === "cashout" ? "Cashout Lobby" : "Final Round"}
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
                                  title={isMinimized ? "Expand lobby" : "Minimize lobby"}
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
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <span className="inline-block rounded bg-white/10 px-2 py-1 font-mono text-xs uppercase">
                                {game.status}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                                {game.gameType === "cashout" ? "1st–4th" : "1st–2nd"}
                              </span>
                            </div>
                            {isMinimized ? (
                              <CompactResultList
                                assignments={gameAssignments}
                                selectedAssignmentId={selectedAssignmentId}
                                teamsById={teamsById}
                                onSelect={setSelectedAssignmentId}
                              />
                            ) : (
                              <div className="space-y-2">
                                {Array.from({ length: capacity }, (_, index) => {
                                  const slot = index + 1;
                                  const assignment = gameAssignments.find(item => item.slotIndex === slot);
                                  const team = assignment ? teamsById.get(assignment.teamId) : undefined;
                                  return (
                                    <div
                                      key={slot}
                                      data-no-node-drag="true"
                                      onDragOver={event => {
                                        if (!isComplete) event.preventDefault();
                                      }}
                                      onDrop={event => {
                                        if (isComplete) return;
                                        const payload =
                                          parseDragPayload(event.dataTransfer.getData("application/json")) ??
                                          dragPayload;
                                        if (!payload) return;
                                        if (payload.fromGameId) {
                                          moveTeam.mutate({
                                            gameId: payload.fromGameId,
                                            toGameId: game.id,
                                            teamId: payload.teamId,
                                            slotIndex: slot,
                                          });
                                        } else {
                                          assignTeam.mutate({
                                            gameId: game.id,
                                            teamId: payload.teamId,
                                            slotIndex: slot,
                                          });
                                        }
                                      }}
                                      className="min-h-12 rounded border border-white/10 bg-black/50 p-2"
                                    >
                                      <p className="mb-1 font-mono text-[10px] uppercase text-white/35">
                                        Slot {slot}
                                      </p>
                                      {team && assignment ? (
                                        <TeamCard
                                          team={team}
                                          fromGameId={isComplete ? undefined : game.id}
                                          disabled={isComplete}
                                          placement={assignment.resultPlacement ?? null}
                                          selected={selectedAssignmentId === assignment.id}
                                          onSelect={() => setSelectedAssignmentId(assignment.id)}
                                          onDragStart={() =>
                                            setDragPayload({ teamId: team.id, fromGameId: game.id })
                                          }
                                        />
                                      ) : (
                                        <p className="text-sm text-white/35">
                                          {isComplete ? "Empty historical slot" : "Drop team here"}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {!isComplete && !isMinimized && game.privateLobbyCode && (
                              <Button
                                data-no-node-drag="true"
                                className="mt-3 w-full"
                                variant="secondary"
                                onClick={() => navigator.clipboard.writeText(game.privateLobbyCode ?? "")}
                              >
                                Copy Lobby Code
                              </Button>
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
                                    onClick={() => updateStatus.mutate({ gameId: game.id, status })}
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
                                      currentValue: game.privateLobbyCode ?? "",
                                    },
                                    game.privateLobbyCode ?? ""
                                  )
                                }
                              >
                                Set/Clear Lobby Code
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              {statuses.map(status => (
                                <ContextMenuItem
                                  key={status}
                                  onClick={() => updateStatus.mutate({ gameId: game.id, status })}
                                >
                                  Mark {status}
                                </ContextMenuItem>
                              ))}
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() => removeAssignedTeams.mutate({ gameId: game.id })}
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
              <div className="pointer-events-none sticky bottom-4 left-4 z-[60] mb-4 ml-4 w-fit rounded border border-white/10 bg-black/80 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/50 shadow-xl">
                Zoom {Math.round(zoom * 100)}% · Shift + scroll · Double-click line to remove
                {selectedAssignmentContext?.team ? ` · Selected: ${selectedAssignmentContext.team.name}` : ""}
              </div>
            </main>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => openDialog({ type: "create-team" })}>
              Create Team
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => createCashout.mutate({ tournamentId, position: canvasMenuPosition })}
            >
              Create Cashout Lobby
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => createFinal.mutate({ tournamentId, position: canvasMenuPosition })}
            >
              Create Final Round Match
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      <Dialog
        open={
          dialogState?.type === "create-team" ||
          dialogState?.type === "rename" ||
          dialogState?.type === "lobby"
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
                  : "Set Lobby Code"}
            </DialogTitle>
            <DialogDescription>
              {dialogState?.type === "lobby"
                ? "Leave blank to clear the private lobby code."
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
                  renameGame.mutate({ gameId: dialogState.gameId, displayLabel: formName });
                }
                if (dialogState?.type === "lobby") {
                  setLobbyCode.mutate({
                    gameId: dialogState.gameId,
                    lobbyCode: formName.trim() ? formName.trim() : null,
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
              This deletes the lobby node, its assignments, and its flow connections. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dialogState?.type === "delete") {
                  deleteGame.mutate({ gameId: dialogState.gameId });
                }
                setDialogState(null);
              }}
            >
              Delete {dialogState?.type === "delete" ? dialogState.label : "lobby"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
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
              {assignment.resultPlacement ? formatPlacement(assignment.resultPlacement) : `Slot ${assignment.slotIndex}`}
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
}: {
  team: ControlTeamView;
  fromGameId?: number;
  onDragStart: () => void;
  disabled?: boolean;
  placement?: number | null;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      draggable={!disabled}
      data-no-node-drag="true"
      onClick={event => {
        event.stopPropagation();
        onSelect?.();
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
        <h1 className="font-mono text-2xl font-black text-neon-gold">{title}</h1>
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
