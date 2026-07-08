import { useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";

export default function TournamentControlViewer() {
  const params = useParams<{ viewerToken: string }>();
  const query = trpc.tournamentControl.getViewer.useQuery({ token: params.viewerToken ?? "" }, { enabled: Boolean(params.viewerToken), retry: false });
  const teamsById = useMemo(() => new Map(query.data?.teams.map(team => [team.id, team] as const) ?? []), [query.data]);

  if (query.isLoading) return <ViewerState title="Loading bracket…" />;
  if (query.error) return <ViewerState title="Bracket unavailable" description={query.error.message} />;
  if (!query.data) return <ViewerState title="Bracket not found" />;

  return (
    <section className="min-h-screen bg-black text-white">
      <header className="border-b border-neon-gold/30 bg-zinc-950 px-6 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">Viewer Bracket</p>
        <h1 className="mt-2 font-mono text-3xl font-black uppercase">{query.data.tournament.name}</h1>
        <p className="text-sm text-white/60">{query.data.tournament.eventStatus} · {query.data.tournament.currentStage}</p>
      </header>
      <main className="overflow-auto bg-[radial-gradient(circle_at_top,#4d39091a,transparent_32rem),linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:auto,40px_40px,40px_40px] p-6">
        <div className="relative" style={{ width: Math.max(1800, ...query.data.games.map(game => game.canvasX + 420)), height: Math.max(1000, ...query.data.games.map(game => game.canvasY + 420)) }}>
          <svg className="absolute inset-0 overflow-visible">
            {query.data.connections.map(connection => {
              const source = query.data.games.find(game => game.id === connection.sourceGameId);
              const target = query.data.games.find(game => game.id === connection.targetGameId);
              if (!source || !target) return null;
              const sx = source.canvasX + 160;
              const sy = source.canvasY + (source.gameType === "cashout" ? 390 : 260);
              const tx = target.canvasX + 160;
              const ty = target.canvasY;
              const mid = Math.max(80, Math.abs(ty - sy) * 0.55);
              return <path key={connection.id} d={`M ${sx} ${sy} C ${sx} ${sy + mid}, ${tx} ${ty - mid}, ${tx} ${ty}`} stroke="#FFD700" strokeWidth="3" fill="none" opacity="0.75" />;
            })}
          </svg>
          {query.data.games.map(game => {
            const assignments = query.data.assignments.filter(assignment => assignment.gameId === game.id).sort((a, b) => a.slotIndex - b.slotIndex);
            const capacity = game.gameType === "cashout" ? 4 : 2;
            return (
              <article key={game.id} className="absolute w-80 rounded-lg border border-neon-gold/30 bg-zinc-950/95 p-4 shadow-2xl" style={{ left: game.canvasX, top: game.canvasY }}>
                <p className="font-mono text-xs uppercase tracking-widest text-white/45">{game.gameType === "cashout" ? "Cashout Lobby" : `Final Round · BO${game.seriesBestOf ?? 1}`}</p>
                <h2 className="mt-1 font-mono text-xl font-black text-white">{game.displayLabel}</h2>
                <p className="mt-2 inline-flex rounded border border-white/15 px-2 py-1 font-mono text-xs uppercase text-white/60">{game.status}</p>
                <div className="mt-3 space-y-2">
                  {Array.from({ length: capacity }, (_, index) => {
                    const slot = index + 1;
                    const assignment = assignments.find(item => item.slotIndex === slot);
                    const team = assignment ? teamsById.get(assignment.teamId) : null;
                    return <div key={slot} className="rounded border border-white/10 bg-black/50 p-2"><p className="font-mono text-[10px] uppercase text-white/35">Slot {slot}</p><p className="font-mono text-sm font-bold text-white">{team?.name ?? "TBD"}{assignment?.resultPlacement ? ` · ${assignment.resultPlacement}` : ""}</p></div>;
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </section>
  );
}

function ViewerState({ title, description }: { title: string; description?: string }) {
  return <section className="min-h-screen bg-black px-6 py-20 text-white"><div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8"><h1 className="font-mono text-2xl font-black text-neon-gold">{title}</h1>{description && <p className="mt-3 text-white/60">{description}</p>}</div></section>;
}
