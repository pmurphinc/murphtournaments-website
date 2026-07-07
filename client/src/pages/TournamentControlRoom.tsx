import { useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type DragPayload = { teamId: number; fromGameId?: number };
type GameStatus = "draft" | "ready" | "live" | "complete";
const statuses: GameStatus[] = ["draft", "ready", "live", "complete"];

export default function TournamentControlRoom() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = Number(params.tournamentId);
  const auth = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [canvasMenuPosition, setCanvasMenuPosition] = useState({
    x: 160,
    y: 120,
  });
  const query = trpc.tournamentControl.get.useQuery(
    { tournamentId },
    {
      enabled: Number.isFinite(tournamentId) && auth.user?.role === "admin",
      retry: false,
    }
  );
  const invalidate = () =>
    utils.tournamentControl.get.invalidate({ tournamentId });
  const mutationOptions = {
    onSuccess: invalidate,
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const createCashout =
    trpc.tournamentControl.createCashoutLobby.useMutation(mutationOptions);
  const createFinal =
    trpc.tournamentControl.createFinalRoundMatch.useMutation(mutationOptions);
  const moveGame = trpc.tournamentControl.moveGame.useMutation(mutationOptions);
  const renameGame =
    trpc.tournamentControl.renameGame.useMutation(mutationOptions);
  const setLobbyCode =
    trpc.tournamentControl.setLobbyCode.useMutation(mutationOptions);
  const updateStatus =
    trpc.tournamentControl.updateStatus.useMutation(mutationOptions);
  const assignTeam =
    trpc.tournamentControl.assignTeam.useMutation(mutationOptions);
  const removeTeam =
    trpc.tournamentControl.removeTeam.useMutation(mutationOptions);
  const removeAssignedTeams =
    trpc.tournamentControl.removeAssignedTeams.useMutation(mutationOptions);
  const deleteGame =
    trpc.tournamentControl.deleteGame.useMutation(mutationOptions);

  const assignedTeamIds = useMemo(
    () => new Set(query.data?.assignments.map(a => a.teamId) ?? []),
    [query.data]
  );
  const teamsById = useMemo(
    () => new Map(query.data?.teams.map(team => [team.id, team]) ?? []),
    [query.data]
  );
  const unassignedTeams =
    query.data?.teams.filter(team => !assignedTeamIds.has(team.id)) ?? [];

  if (auth.loading) return <ControlState title="Authenticating organizer…" />;
  if (auth.user?.role !== "admin")
    return (
      <ControlState
        title="Admin access required"
        description="Tournament control rooms are private organizer tools."
      />
    );
  if (query.isLoading) return <ControlState title="Loading control room…" />;
  if (query.error)
    return (
      <ControlState
        title="Could not load control room"
        description={query.error.message}
      />
    );
  if (!query.data) return <ControlState title="Tournament not found" />;

  const canvasPoint = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: Math.round(clientX - (rect?.left ?? 0)),
      y: Math.round(clientY - (rect?.top ?? 0)),
    };
  };

  return (
    <section className="min-h-screen bg-black text-white">
      <header className="border-b border-neon-gold/30 bg-zinc-950 px-6 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">
          Admin Tournament Control Room
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-mono text-3xl font-black uppercase">
              {query.data.tournament.name}
            </h1>
            <p className="text-sm text-white/60">
              {query.data.tournament.eventStatus} ·{" "}
              {query.data.tournament.currentStage}
            </p>
          </div>
          <div className="rounded border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/70">
            Phase 2 Discord bot contract is documented in{" "}
            <code>docs/tournament-control-discord-contract.md</code>.
          </div>
        </div>
      </header>
      <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 lg:grid-cols-[19rem_1fr]">
        <aside className="border-r border-white/10 bg-zinc-950/95 p-4">
          <h2 className="font-mono text-lg font-bold text-neon-gold">
            Unassigned Teams
          </h2>
          <p className="mb-4 text-xs text-white/50">
            Drag teams into lobby slots. Teams stay pooled here until placed.
          </p>
          <div
            className="space-y-2"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const payload = JSON.parse(
                e.dataTransfer.getData("application/json")
              ) as DragPayload;
              if (payload.fromGameId)
                removeTeam.mutate({
                  gameId: payload.fromGameId,
                  teamId: payload.teamId,
                });
            }}
          >
            {unassignedTeams.length === 0 ? (
              <p className="rounded border border-dashed border-white/15 p-4 text-sm text-white/50">
                All teams are assigned.
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
              onContextMenu={e =>
                setCanvasMenuPosition(canvasPoint(e.clientX, e.clientY))
              }
            >
              {query.data.games.length === 0 && (
                <div className="absolute left-8 top-8 rounded border border-dashed border-neon-gold/40 bg-black/70 p-6">
                  <h3 className="font-mono text-xl font-bold text-neon-gold">
                    Empty board
                  </h3>
                  <p className="text-sm text-white/60">
                    Right-click the canvas to create a Cashout Lobby or Final
                    Round Match.
                  </p>
                </div>
              )}
              {query.data.games.map(game => {
                const assignments = query.data.assignments.filter(
                  a => a.gameId === game.id
                );
                const capacity = game.gameType === "cashout" ? 4 : 2;
                return (
                  <ContextMenu key={game.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData("text/game", String(game.id));
                        }}
                        onDragEnd={e => {
                          const point = canvasPoint(e.clientX, e.clientY);
                          moveGame.mutate({ gameId: game.id, position: point });
                        }}
                        className={`absolute w-80 cursor-move rounded-lg border bg-zinc-950/95 p-4 shadow-2xl ${game.gameType === "cashout" ? "border-neon-gold/60" : "border-neon-magenta/60"}`}
                        style={{ left: game.canvasX, top: game.canvasY }}
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
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
                          <span className="rounded bg-white/10 px-2 py-1 font-mono text-xs uppercase">
                            {game.status}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {Array.from({ length: capacity }, (_, index) => {
                            const slot = index + 1;
                            const assignment = assignments.find(
                              a => a.slotIndex === slot
                            );
                            const team = assignment
                              ? teamsById.get(assignment.teamId)
                              : undefined;
                            return (
                              <div
                                key={slot}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => {
                                  const raw =
                                    e.dataTransfer.getData("application/json");
                                  const payload = raw
                                    ? (JSON.parse(raw) as DragPayload)
                                    : dragPayload;
                                  if (payload)
                                    assignTeam.mutate({
                                      gameId: game.id,
                                      teamId: payload.teamId,
                                      slotIndex: slot,
                                    });
                                }}
                                className="min-h-12 rounded border border-white/10 bg-black/50 p-2"
                              >
                                <p className="mb-1 font-mono text-[10px] uppercase text-white/35">
                                  Slot {slot}
                                </p>
                                {team ? (
                                  <TeamCard
                                    team={team}
                                    fromGameId={game.id}
                                    onDragStart={() =>
                                      setDragPayload({
                                        teamId: team.id,
                                        fromGameId: game.id,
                                      })
                                    }
                                  />
                                ) : (
                                  <p className="text-sm text-white/35">
                                    Drop team here
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {game.privateLobbyCode && (
                          <Button
                            className="mt-3 w-full"
                            variant="secondary"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                game.privateLobbyCode ?? ""
                              )
                            }
                          >
                            Copy Lobby Code
                          </Button>
                        )}
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => {
                          const displayLabel = prompt(
                            "Rename game",
                            game.displayLabel
                          );
                          if (displayLabel)
                            renameGame.mutate({
                              gameId: game.id,
                              displayLabel,
                            });
                        }}
                      >
                        Rename Game
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          const lobbyCode = prompt(
                            "Lobby code (blank clears)",
                            game.privateLobbyCode ?? ""
                          );
                          setLobbyCode.mutate({
                            gameId: game.id,
                            lobbyCode: lobbyCode?.trim()
                              ? lobbyCode.trim()
                              : null,
                          });
                        }}
                      >
                        Set Lobby Code
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      {statuses.map(status => (
                        <ContextMenuItem
                          key={status}
                          onClick={() =>
                            updateStatus.mutate({ gameId: game.id, status })
                          }
                        >
                          Mark {status}
                        </ContextMenuItem>
                      ))}
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() =>
                          removeAssignedTeams.mutate({ gameId: game.id })
                        }
                      >
                        Remove Assigned Teams
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="text-red-300"
                        onClick={() =>
                          confirm("Delete this game?") &&
                          deleteGame.mutate({ gameId: game.id })
                        }
                      >
                        Delete Game
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </main>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() =>
                createCashout.mutate({
                  tournamentId,
                  position: canvasMenuPosition,
                })
              }
            >
              Create Cashout Lobby
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                createFinal.mutate({
                  tournamentId,
                  position: canvasMenuPosition,
                })
              }
            >
              Create Final Round Match
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </section>
  );
}

function TeamCard({
  team,
  fromGameId,
  onDragStart,
}: {
  team: { id: number; name: string; frp: number };
  fromGameId?: number;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={e => {
        const payload: DragPayload = { teamId: team.id, fromGameId };
        e.dataTransfer.setData("application/json", JSON.stringify(payload));
        onDragStart();
      }}
      className="rounded border border-white/10 bg-white/10 px-3 py-2 shadow-lg"
    >
      <div className="font-mono text-sm font-bold text-white">{team.name}</div>
      <div className="text-xs text-neon-gold">{team.frp} FRP</div>
    </div>
  );
}

function ControlState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8">
        <h1 className="font-mono text-2xl font-black text-neon-gold">
          {title}
        </h1>
        {description && <p className="mt-3 text-white/60">{description}</p>}
        <Input className="mt-6 hidden" />
      </div>
    </section>
  );
}
