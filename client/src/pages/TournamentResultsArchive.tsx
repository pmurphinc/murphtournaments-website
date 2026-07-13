import { Link, useParams } from "wouter";
import { Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function TournamentResultsArchive() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = Number(params.tournamentId);
  const query = trpc.communityTournaments.getResultsArchive.useQuery(
    { tournamentId },
    { enabled: Number.isFinite(tournamentId) && tournamentId > 0 }
  );
  if (query.isLoading)
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        Loading results…
      </main>
    );
  if (query.error || !query.data)
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        Results not available.
      </main>
    );
  const champion = query.data.results.find(row => row.isChampion === 1);
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/tournaments" className="text-sm text-[#FFD700]">
          ← Community tournaments
        </Link>
        <section className="rounded-2xl border border-[#FFD700]/40 bg-zinc-950 p-6 shadow-[0_0_30px_rgba(255,215,0,0.12)]">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-[#FFD700]">
            Finalized Results
          </p>
          <h1 className="mt-2 font-mono text-4xl font-black uppercase">
            {query.data.tournament.name}
          </h1>
          <p className="mt-2 text-white/60">
            Finalized{" "}
            {query.data.tournament.finalizedAt
              ? new Date(query.data.tournament.finalizedAt).toLocaleString()
              : ""}
          </p>
          {champion ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#FFD700] bg-[#FFD700]/15 px-4 py-2 font-mono text-sm font-black uppercase text-[#FFD700]">
              <Lock className="h-4 w-4" /> Champion ·{" "}
              {champion.teamNameSnapshot}
            </div>
          ) : null}
        </section>
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
          <div className="grid grid-cols-7 gap-2 border-b border-white/10 bg-white/5 px-4 py-3 font-mono text-xs uppercase text-white/50">
            <span className="col-span-2">Team</span>
            <span>Score</span>
            <span>Overall</span>
            <span>Cashout</span>
            <span>Final</span>
            <span>Place</span>
          </div>
          {query.data.results.map(row => (
            <div
              key={row.id}
              className="grid grid-cols-7 gap-2 border-b border-white/5 px-4 py-3 text-sm text-white/80 last:border-0"
            >
              <span className="col-span-2 font-semibold text-white">
                {row.teamNameSnapshot}{" "}
                {row.isChampion === 1 ? (
                  <span className="ml-2 rounded bg-[#FFD700] px-2 py-0.5 font-mono text-[10px] uppercase text-black">
                    Champion
                  </span>
                ) : null}
              </span>
              <span>{row.scoreSnapshot}</span>
              <span>
                {row.totalWins}-{row.totalLosses}
              </span>
              <span>
                {row.cashoutWins}-{row.cashoutLosses}
              </span>
              <span>
                {row.finalRoundWins}-{row.finalRoundLosses}
              </span>
              <span>{row.finalPlacement ?? "—"}</span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
