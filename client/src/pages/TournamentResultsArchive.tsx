import { Link, useParams } from "wouter";
import { Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import SectionHeading from "@/components/public/SectionHeading";
import {
  PublicErrorState,
  PublicNotFoundState,
} from "@/components/public/PublicStates";

export default function TournamentResultsArchive() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = Number(params.tournamentId);
  const query = trpc.communityTournaments.getResultsArchive.useQuery(
    { tournamentId },
    { enabled: Number.isFinite(tournamentId) && tournamentId > 0, retry: false }
  );

  return (
    <div className="container py-10 sm:py-16">
      <Link
        href="/tournaments"
        className="mb-6 inline-block font-mono text-sm text-[var(--mt-gold-bright)] hover:underline"
      >
        ← Results &amp; Archive
      </Link>

      {query.isLoading ? (
        <div className="mt-panel p-8 text-center font-mono text-sm uppercase tracking-widest text-[var(--mt-muted)]">
          Loading results…
        </div>
      ) : null}

      {query.error ? (
        query.error.data?.code === "NOT_FOUND" ? (
          <PublicNotFoundState
            title="Results not found"
            message="This tournament hasn't finalized results, or the link may be out of date."
          />
        ) : (
          <PublicErrorState
            title="Results unavailable"
            message={query.error.message}
          />
        )
      ) : null}

      {query.data ? (
        <div className="space-y-6">
          <section className="mt-panel-raised p-6">
            <SectionHeading
              level="h1"
              eyebrow="Finalized Results"
              title={query.data.tournament.name}
              description={
                query.data.tournament.finalizedAt
                  ? `Finalized ${new Date(query.data.tournament.finalizedAt).toLocaleString()}`
                  : undefined
              }
            />
            {(() => {
              const champion = query.data.results.find(
                row => row.isChampion === 1
              );
              return champion ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--mt-gold)] bg-[var(--mt-gold)]/15 px-4 py-2 font-mono text-sm font-black uppercase text-[var(--mt-gold-bright)]">
                  <Lock className="h-4 w-4" aria-hidden="true" /> Champion ·{" "}
                  {champion.teamNameSnapshot}
                </div>
              ) : null;
            })()}
          </section>

          <section className="mt-panel overflow-hidden">
            <div className="overflow-x-auto">
              <div className="grid min-w-[640px] grid-cols-7 gap-2 border-b border-[var(--mt-steel-line)] bg-[var(--mt-charcoal-raised)] px-4 py-3 font-mono text-xs uppercase text-[var(--mt-muted)]">
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
                  className="grid min-w-[640px] grid-cols-7 gap-2 border-b border-[var(--mt-steel-line)] px-4 py-3 text-sm text-[var(--mt-off-white)] last:border-0"
                >
                  <span className="col-span-2 font-semibold">
                    {row.teamNameSnapshot}{" "}
                    {row.isChampion === 1 ? (
                      <span className="ml-2 rounded bg-[var(--mt-gold)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--mt-gold-foreground)]">
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
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
