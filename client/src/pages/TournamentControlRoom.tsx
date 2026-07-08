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
type NodeDragState = {
  gameId: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
};
type DialogState =
  | { type: "create-team" }
  | { type: "rename"; gameId: number; currentValue: string }
  | { type: "lobby"; gameId: number; currentValue: string }
  | { type: "delete"; gameId: number; label: string }
  | null;

const statuses: GameStatus[] = ["draft", "ready", "live", "complete"];
const activeStatuses = new Set<GameStatus>(["draft", "ready", "live"]);

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

export default function TournamentControlRoom() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = Number(params.tournamentId);
  const auth = useAuth();
  const utils = trpc.useUtils();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [nodeDrag, setNodeDrag] = useState<NodeDragState | null>(null);
  const [canvasMenuPosition, setCanvasMenuPosition] = useState({ x: 160, y: 120 });
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [formName, setFormName] = useState("");

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
  const renameGame = trpc.tournamentControl.renameGame.useMutation(mutationOptions);
  const setLobbyCode = trpc.tournamentControl.setLobbyCode.useMutation(mutationOptions);
  const updateStatus = trpc.tournamentControl.updateStatus.useMutation(mutationOptions);
  const setPlacement = trpc.tournamentControl.setAssignmentResultPlacement.useMutation(mutationOptions);
  const assignTeam = trpc.tournamentControl.assignTeam.useMutation(mutationOptions);
  const moveTeam = trpc.tournamentControl.moveTeam.useMutation(mutationOptions);
  const removeTeam = trpc.tournamentControl.removeTeam.useMutation(mutationOptions);
  const removeAssignedTeams = trpc.tournamentControl.removeAssignedTeams.useMutation(mutationOptions);
  const deleteGame = trpc.tournamentControl.deleteGame.useMutation(mutationOptions);

  const activeAssignedTeamIds = useMemo(() => {
    const activeGameIds = new Set(
      query.data?.games
        .filter(game => activeStatuses.has(game.status))
        .map(game => game.id) ?? []
    );
    return new Set(
      query.data?.assignments
        .filter(assignment => activeGameIds.has(assignment.gameId))
        .map(assignment => assignment.teamId) ?? []
    );
  }, [query.data]);
  const teamsById = useMemo(
    () => new Map(query.data?.teams.map(team => [team.id, team]) ?? []),
    [query.data]
  );
  const unassignedTeams =
    query.data?.teams.filter(team => !activeAssignedTeamIds.has(team.id)) ?? [];

  const canvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.round(clientX - (rect?.left ?? 0) + (canvasRef.current?.scrollLeft ?? 0))
      ),
      y: Math.max(
        0,
        Math.round(clientY - (rect?.top ?? 0) + (canvasRef.current?.scrollTop ?? 0))
      ),
    };
  }, []);

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

  const openDialog = (state: Exclude<DialogState, null>, defaultValue = "") => {
    setDialogState(state);
    setFormName(defaultValue);
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
            <div className="rounded border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/70">
              Phase 2 Discord bot contract is documented in{" "}
              <code>docs/tournament-control-discord-contract.md</code>.
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
              onContextMenu={event => {
                if (event.target === event.currentTarget) {
                  setCanvasMenuPosition(canvasPoint(event.clientX, event.clientY));
                }
              }}
            >
              {query.data.games.length === 0 && (
                <div className="absolute left-8 top-8 rounded border border-dashed border-neon-gold/40 bg-black/70 p-6">
                  <h3 className="font-mono text-xl font-bold text-neon-gold">Empty board</h3>
                  <p className="text-sm text-white/60">
                    Right-click the canvas to create a team or lobby.
                  </p>
                </div>
              )}
              {query.data.games.map(game => {
                const assignments = query.data.assignments.filter(
                  assignment => assignment.gameId === game.id
                );
                const capacity = game.gameType === "cashout" ? 4 : 2;
                const isComplete = game.status === "complete";
                const visualPosition =
                  nodeDrag?.gameId === game.id
                    ? { x: nodeDrag.x, y: nodeDrag.y }
                    : { x: game.canvasX, y: game.canvasY };

                return (
                  <ContextMenu key={game.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        onContextMenu={event => event.stopPropagation()}
                        className={`absolute w-80 rounded-lg border bg-zinc-950/95 p-4 shadow-2xl ${
                          game.gameType === "cashout"
                            ? "border-neon-gold/60"
                            : "border-neon-magenta/60"
                        } ${nodeDrag?.gameId === game.id ? "z-50 cursor-grabbing ring-2 ring-[#FFD700]/60" : ""}`}
                        style={{ left: visualPosition.x, top: visualPosition.y }}
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs uppercase tracking-widest text-white/45">
                              {game.gameType === "cashout" ? "Cashout Lobby" : "Final Round"}
                            </p>
                            <h3 className="font-mono text-xl font-black text-white">
                              {game.displayLabel}
                            </h3>
                          </div>
                          {!isComplete && (
                            <button
                              type="button"
                              className="touch-none rounded border border-white/15 bg-white/10 px-2 py-1 font-mono text-xs uppercase text-neon-gold cursor-grab active:cursor-grabbing"
                              onPointerDown={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                const point = canvasPoint(event.clientX, event.clientY);
                                setNodeDrag({
                                  gameId: game.id,
                                  offsetX: point.x - game.canvasX,
                                  offsetY: point.y - game.canvasY,
                                  x: game.canvasX,
                                  y: game.canvasY,
                                });
                              }}
                            >
                              Move
                            </button>
                          )}
                        </div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="inline-block rounded bg-white/10 px-2 py-1 font-mono text-xs uppercase">
                            {game.status}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                            Results: {game.gameType === "cashout" ? "1st–4th" : "1st–2nd"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {Array.from({ length: capacity }, (_, index) => {
                            const slot = index + 1;
                            const assignment = assignments.find(item => item.slotIndex === slot);
                            const team = assignment ? teamsById.get(assignment.teamId) : undefined;
                            return (
                              <div
                                key={slot}
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
                                  <div className="space-y-2">
                                    <TeamCard
                                      team={team}
                                      fromGameId={isComplete ? undefined : game.id}
                                      disabled={isComplete}
                                      placement={assignment.resultPlacement ?? null}
                                      onDragStart={() =>
                                        setDragPayload({ teamId: team.id, fromGameId: game.id })
                                      }
                                    />
                                    <ResultPlacementControl
                                      capacity={capacity}
                                      placement={assignment.resultPlacement ?? null}
                                      disabled={setPlacement.isPending}
                                      onChange={resultPlacement =>
                                        setPlacement.mutate({
                                          assignmentId: assignment.id,
                                          resultPlacement,
                                        })
                                      }
                                    />
                                  </div>
                                ) : (
                                  <p className="text-sm text-white/35">
                                    {isComplete ? "Empty historical slot" : "Drop team here"}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {!isComplete && game.privateLobbyCode && (
                          <Button
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
            <AlertDialogTitle>Delete game?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the game node and its assignments. This cannot be undone.
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
              Delete {dialogState?.type === "delete" ? dialogState.label : "game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function ResultPlacementControl({
  capacity,
  placement,
  disabled,
  onChange,
}: {
  capacity: number;
  placement: number | null;
  disabled?: boolean;
  onChange: (placement: number | null) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded border border-white/10 bg-zinc-950/80 px-2 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/45">
        Result
      </span>
      <select
        value={placement ?? ""}
        disabled={disabled}
        onPointerDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()}
        onChange={event => {
          const value = event.target.value;
          onChange(value ? Number(value) : null);
        }}
        className="rounded border border-[#FFD700]/30 bg-black px-2 py-1 font-mono text-xs font-bold text-[#FFD700] outline-none transition focus:border-[#FFD700] disabled:opacity-50"
      >
        <option value="">Pending</option>
        {Array.from({ length: capacity }, (_, index) => index + 1).map(value => (
          <option key={value} value={value}>
            {formatPlacement(value)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TeamCard({
  team,
  fromGameId,
  onDragStart,
  disabled,
  placement,
}: {
  team: { id: number; name: string };
  fromGameId?: number;
  onDragStart: () => void;
  disabled?: boolean;
  placement?: number | null;
}) {
  return (
    <div
      draggable={!disabled}
      onDragStart={event => {
        event.stopPropagation();
        if (disabled) return;
        const payload: DragPayload = { teamId: team.id, fromGameId };
        event.dataTransfer.setData("application/json", JSON.stringify(payload));
        onDragStart();
      }}
      onDragEnd={event => event.stopPropagation()}
      className={`rounded border border-white/10 bg-white/10 px-3 py-2 shadow-lg ${
        disabled ? "opacity-70" : "cursor-grab"
      }`}
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
