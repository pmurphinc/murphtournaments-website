import { useState } from "react";
import { Link, useParams } from "wouter";
import { Radio } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PageHero from "@/components/public/PageHero";
import SectionHeading from "@/components/public/SectionHeading";
import TournamentCard from "@/components/public/TournamentCard";
import StatusBadge from "@/components/public/StatusBadge";
import CtaButton from "@/components/public/CtaButton";
import {
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingCards,
  PublicNotFoundState,
} from "@/components/public/PublicStates";
import {
  getTournamentDiscoveryStatus,
  TOURNAMENT_STATUS_LABEL,
  useCommunityDirectory,
  type TournamentDiscoveryStatus,
} from "@/lib/communityDirectory";

const DISCORD_URL = "https://discord.gg/kcmdxmBgnC";

type FilterValue = "all" | TournamentDiscoveryStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  {
    value: "registration-open",
    label: TOURNAMENT_STATUS_LABEL["registration-open"],
  },
  { value: "live", label: TOURNAMENT_STATUS_LABEL.live },
  { value: "upcoming", label: TOURNAMENT_STATUS_LABEL.upcoming },
  { value: "completed", label: TOURNAMENT_STATUS_LABEL.completed },
];

const TAB_TRIGGER_CLASS =
  "min-h-10 px-3 py-2 font-mono text-xs uppercase tracking-widest data-[state=active]:bg-[var(--mt-gold)] data-[state=active]:text-[var(--mt-gold-foreground)]";

function TournamentDiscoveryList() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const directory = useCommunityDirectory();

  const filteredCards =
    filter === "all"
      ? directory.cards
      : directory.cards.filter(card => card.status === filter);

  return (
    <div>
      <PageHero>
        <SectionHeading
          level="h1"
          eyebrow="Browse"
          title="Tournament Discovery"
          description="Every published Murph Tournaments community event, filterable by status."
        />
        <Tabs
          value={filter}
          onValueChange={value => setFilter(value as FilterValue)}
        >
          <TabsList
            aria-label="Filter tournaments by status"
            className="flex h-auto w-full flex-wrap justify-start gap-1 bg-[var(--mt-charcoal-raised)] p-1 sm:w-fit"
          >
            {FILTERS.map(item => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className={TAB_TRIGGER_CLASS}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="container">
          {directory.isLoading ? (
            <PublicLoadingCards count={6} label="Loading tournaments" />
          ) : null}

          {directory.errorMessage ? (
            <PublicErrorState message={directory.errorMessage} />
          ) : null}

          {!directory.isLoading && !directory.errorMessage ? (
            directory.isEmpty ? (
              <PublicEmptyState
                title="No public tournaments are published yet"
                description="Check back soon, or join the Discord to hear about the next event first."
                action={
                  <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CtaButton tone="gold">Join Discord for Updates</CtaButton>
                  </a>
                }
              />
            ) : filteredCards.length === 0 ? (
              <PublicEmptyState
                title="No tournaments match this filter"
                description="Try a different status filter above."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCards.map(tournament => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            )
          ) : null}
        </div>
      </section>

      <section className="border-t border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <SectionHeading
            eyebrow="History"
            title="Past Murph Tournaments"
            description="Browse completed events, champions, and full results."
            action={
              <Link href="/tournaments">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)] hover:underline">
                  View Full Archive →
                </span>
              </Link>
            }
          />
        </div>
      </section>
    </div>
  );
}

function TournamentDiscoveryDetail({ slug }: { slug: string }) {
  const query = trpc.communityTournaments.getBySlug.useQuery(
    { slug },
    { retry: false }
  );

  return (
    <div className="container py-12 sm:py-16">
      {query.isLoading ? (
        <div className="mt-panel p-8 text-center font-mono text-sm uppercase tracking-widest text-[var(--mt-muted)]">
          Loading tournament…
        </div>
      ) : null}

      {query.error ? (
        query.error.data?.code === "NOT_FOUND" ? (
          <PublicNotFoundState
            title="Tournament not found"
            message="This tournament doesn't exist, isn't published, or the link may be out of date."
          />
        ) : (
          <PublicErrorState
            title="Tournament unavailable"
            message={query.error.message}
          />
        )
      ) : null}

      {query.data ? (
        <>
          <SectionHeading
            level="h1"
            eyebrow={`Organizer: ${query.data.organizer?.name ?? "Discord organizer"}`}
            title={query.data.tournament.name}
            description={query.data.tournament.eventNote ?? undefined}
          />
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <StatusBadge
              status={getTournamentDiscoveryStatus(query.data.tournament)}
            />
            <Badge
              variant="outline"
              className="border-[var(--mt-steel-line)] font-mono text-xs uppercase tracking-widest text-[var(--mt-off-white)]"
            >
              {query.data.approvedTeams.length}
              {query.data.tournament.maxTeams
                ? `/${query.data.tournament.maxTeams}`
                : ""}{" "}
              teams
            </Badge>
            {query.data.tournament.registrationOpen === 1 ? (
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
                <CtaButton tone="gold" className="h-8 px-4 text-[11px]">
                  Register — Join Discord
                </CtaButton>
              </a>
            ) : null}
            {query.data.tournament.eventStatus === "live" ? (
              <Link href="/watch">
                <CtaButton tone="outline" className="h-8 px-4 text-[11px]">
                  <Radio className="size-3.5" aria-hidden="true" />
                  Watch Live
                </CtaButton>
              </Link>
            ) : null}
          </div>

          <h2 className="mb-4 text-lg font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
            Approved Teams
          </h2>
          {query.data.approvedTeams.length === 0 ? (
            <PublicEmptyState title="No teams approved yet" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {query.data.approvedTeams.map(team => (
                <div
                  key={team.id}
                  className="mt-panel p-4 font-bold text-[var(--mt-off-white)]"
                >
                  {team.name}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default function CommunityTournaments() {
  const params = useParams<{ slug?: string }>();
  if (params.slug) return <TournamentDiscoveryDetail slug={params.slug} />;
  return <TournamentDiscoveryList />;
}
