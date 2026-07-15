import { PlayCircle, Radio, Shuffle, Swords, Trophy, Video } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCommunityDirectory } from "@/lib/communityDirectory";
import Hero from "@/components/public/Hero";
import CtaButton from "@/components/public/CtaButton";
import SectionHeading from "@/components/public/SectionHeading";
import StatDisplay from "@/components/public/StatDisplay";
import TournamentCard from "@/components/public/TournamentCard";
import MediaCard from "@/components/public/MediaCard";
import {
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingCards,
} from "@/components/public/PublicStates";

const DISCORD_URL = "https://discord.gg/kcmdxmBgnC";

/**
 * Murph Tournaments homepage.
 * Real data sources: `communityTournaments.list` (live/upcoming directory),
 * `patchNotes.getAll` (news). Champion callout, About stats, and media links
 * are the site's existing published content (previously hardcoded in this
 * same file), just restyled — not new or sample data.
 */
export default function Home() {
  const directory = useCommunityDirectory();
  const newsQuery = trpc.patchNotes.getAll.useQuery();

  return (
    <div>
      <Hero
        eyebrow="Murph Tournaments"
        title={
          <>
            Competitive <span className="mt-gold-text">THE FINALS</span>{" "}
            tournaments
          </>
        }
        description="Built by players, for players. Tournament production, live brackets, and a competitive community hub for THE FINALS esports scene."
        actions={
          <>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
              <CtaButton tone="gold">Join Discord</CtaButton>
            </a>
            <a href="/watch">
              <CtaButton tone="outline">Watch Live</CtaButton>
            </a>
          </>
        }
      />

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <SectionHeading eyebrow="Player Tools" title="Prep for Your Next Match" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <a
              href="/maprng"
              className="mt-panel mt-hover-lift group flex items-start gap-4 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
            >
              <div
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded border border-[var(--mt-steel-line)] bg-[var(--mt-black)] text-[var(--mt-gold-bright)]"
              >
                <Shuffle className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--mt-off-white)] group-hover:text-[var(--mt-gold-bright)]">
                  Map Randomizer
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--mt-muted)]">
                  Draw random competitive maps for scrims and practice, with
                  presets for main arenas, compact modes, and training.
                </p>
              </div>
            </a>
            <a
              href="/balance-archive"
              className="mt-panel mt-hover-lift group flex items-start gap-4 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
            >
              <div
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded border border-[var(--mt-steel-line)] bg-[var(--mt-black)] text-[var(--mt-gold-bright)]"
              >
                <Swords className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--mt-off-white)] group-hover:text-[var(--mt-gold-bright)]">
                  Weapon Archive
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--mt-muted)]">
                  Track buffs, nerfs, and balance changes for every weapon,
                  gadget, and specialization across patches.
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Highest-priority content: what's happening now, is registration open, where to browse. */}
      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <SectionHeading
            eyebrow="Right Now"
            title="Live &amp; Upcoming Tournaments"
            description="The public tournament directory: registration status, format, and team caps per event."
            action={
              <a href="/tournaments/community">
                <CtaButton tone="outline">Browse All Tournaments</CtaButton>
              </a>
            }
          />

          {directory.isLoading ? (
            <PublicLoadingCards label="Loading tournaments" />
          ) : null}

          {directory.errorMessage ? (
            <PublicErrorState message={directory.errorMessage} />
          ) : null}

          {!directory.isLoading && !directory.errorMessage ? (
            directory.isEmpty ? (
              <PublicEmptyState
                title="No tournaments are open or upcoming right now"
                description="Join the Discord to hear about the next Murph Tournaments event as soon as it's announced."
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
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {directory.cards.slice(0, 3).map(tournament => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            )
          ) : null}
        </div>
      </section>

      <section className="border-b border-[var(--mt-steel-line)] py-8 sm:py-10">
        <div className="container">
          <a
            href="/tournaments"
            className="mt-panel mt-hover-lift group flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
          >
            <div className="flex items-center gap-3">
              <Trophy
                className="size-5 shrink-0 text-[var(--mt-gold-bright)]"
                aria-hidden="true"
              />
              <p className="text-sm text-[var(--mt-off-white)]">
                <span className="font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]">
                  Most recent champion —{" "}
                </span>
                <span className="font-bold">Seismic</span>, June 2026 Tournament
                (completed)
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs font-bold uppercase tracking-widest text-[var(--mt-gold-bright)] group-hover:underline">
              View Full Results &amp; Archive →
            </span>
          </a>
        </div>
      </section>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <SectionHeading
            eyebrow="Coverage"
            title="Latest News &amp; Updates"
          />
          {newsQuery.isLoading ? (
            <PublicLoadingCards count={3} label="Loading latest news" />
          ) : null}
          {newsQuery.error ? (
            <PublicEmptyState
              title="News unavailable right now"
              description="Could not load the latest patch notes."
            />
          ) : null}
          {!newsQuery.isLoading &&
          !newsQuery.error &&
          (newsQuery.data?.length ?? 0) === 0 ? (
            <PublicEmptyState
              title="No news posted yet"
              description="Patch notes and updates will appear here once published."
            />
          ) : null}
          {!newsQuery.isLoading &&
          !newsQuery.error &&
          (newsQuery.data?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {newsQuery.data!.slice(0, 3).map(note => {
                const NewsTag = note.url ? "a" : "div";
                return (
                  <NewsTag
                    key={note.id}
                    {...(note.url
                      ? {
                          href: note.url,
                          target: "_blank",
                          rel: "noopener noreferrer",
                        }
                      : {})}
                    className="mt-panel mt-hover-lift flex flex-col gap-2 p-5"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--mt-muted)]">
                      {note.date}
                    </p>
                    <h3 className="text-sm font-bold text-[var(--mt-off-white)]">
                      {note.title}
                    </h3>
                  </NewsTag>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Who We Are"
              title="About Murph Tournaments"
              description="Tournament organizer, league operator, and competitive systems builder within THE FINALS ecosystem."
            />
            <p className="text-sm leading-relaxed text-[var(--mt-muted)]">
              Founder · FCL Season 1 Producer · Murph Tournaments x14 · Gaming
              since '92. Mission: run professional tournaments, produce
              competitive broadcasts, and build a THE FINALS community that
              values skill and dedication.
            </p>
            <a href="/about" className="mt-5 inline-block">
              <CtaButton tone="outline">Learn More About Murph</CtaButton>
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatDisplay label="Tournaments Hosted" value="14+" />
            <StatDisplay label="Prize Pool Awarded" value="$2,500+" />
            <StatDisplay label="Players Competed" value="100+ Verified" />
            <StatDisplay label="Events Produced" value="20+ Incl. FCL" />
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <SectionHeading
            eyebrow="Media"
            title="Watch &amp; Featured Content"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MediaCard
              media={{
                title: "Live on Twitch",
                description: "Tournament nights, 9 PM – 12 AM PST",
                href: "https://www.twitch.tv/pmurphinc",
                platformLabel: "Twitch — Watch Live",
                icon: <Radio className="size-5" aria-hidden="true" />,
              }}
            />
            <MediaCard
              media={{
                title: "TikTok Highlights",
                description: "Fast-paced tournament clips",
                href: "https://www.tiktok.com/@pmurphinc",
                platformLabel: "TikTok — Watch VOD",
                icon: <Video className="size-5" aria-hidden="true" />,
              }}
            />
            <MediaCard
              media={{
                title: "YouTube Highlights",
                description: "Full match replays and recaps",
                href: "https://www.youtube.com/shorts/QTgm-CL5BYY",
                platformLabel: "YouTube — Watch VOD",
                icon: <PlayCircle className="size-5" aria-hidden="true" />,
              }}
            />
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-12">
        <div className="container">
          <div className="mt-panel flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--mt-gold-bright)]">
                Sponsors &amp; Partners
              </p>
              <p className="mt-1 text-sm text-[var(--mt-muted)]">
                Interested in partnering with Murph Tournaments? We'd love to
                hear from you.
              </p>
            </div>
            <a
              href="https://discord.gg/kcmdxmBgnC"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CtaButton tone="outline">Get In Touch on Discord</CtaButton>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
