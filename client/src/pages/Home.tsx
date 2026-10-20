import {
  ArrowRight,
  Megaphone,
  PlayCircle,
  Radio,
  Shuffle,
  Swords,
  Trophy,
  Video,
} from "lucide-react";
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

// Editorial summaries of Embark's PRIME TIME reveals, checked October 19, 2026.
const SEASON_12_HIGHLIGHTS = [
  {
    title: "The Infiltrator",
    label: "New Light playstyle",
    description:
      "True Sight reveals enemies through smoke and exposes disguises. The Mimic Device lets you become an arena prop, while the Translocator swaps your position with a marked object.",
    href: "https://www.youtube.com/watch?v=x4OZrRq0z1w",
  },
  {
    title: "Solo Showdown",
    label: "New mode · Beta",
    description:
      "12 solo contestants compete across three rounds drawn from eight mini-modes. Earn cash to survive elimination between rounds and become the last contestant standing.",
    href: "https://www.youtube.com/watch?v=Zv-sXV5mKs8",
  },
  {
    title: "Classic arenas rebuilt",
    label: "Monaco · Seoul · Skyway Stadium",
    description:
      "Familiar arenas get revised layouts, new traversal options, clearer sightlines, upgraded lighting and materials, and their own Sponsor identities.",
    href: "https://www.youtube.com/watch?v=TPfoKvvuPz8",
  },
  {
    title: "Destruction evolved",
    label: "Dynamism upgrade",
    description:
      "Floors sag, walls hinge and suspended structures swing before collapsing. Blast waves, debris piles and smoke that reacts to the changing arena create new ways to fight and move.",
    href: "https://www.youtube.com/watch?v=Zm9sF-ijcB4",
  },
  {
    title: "A new Sponsor Journey",
    label: "Progression & rewards",
    description:
      "Represent OSPUZE, ALFA ACTA or ISEUL-T with a dedicated Handler, story challenges and free cosmetic rewards. Earn Fans to advance your World Tour rank.",
    href: "https://www.youtube.com/watch?v=vNjItVcJ6ls",
  },
  {
    title: "HUD & menus reworked",
    label: "Interface upgrade",
    description:
      "A more readable, scalable HUD, refreshed menus, a side panel and customizable Quick Settings help keep the information you need within reach.",
    href: "https://www.youtube.com/watch?v=5ki7JD1IMCo",
  },
  {
    title: "Dynamic Commentary",
    label: "Game show · Beta",
    description:
      "Scotty can react to selected plays with real-time commentary and call contestants out by name. The initial beta respects Anonymous Mode and Streamer Mode.",
    href: "https://www.youtube.com/watch?v=eA9_Q6d2H-g",
  },
  {
    title: "Respec becomes permanent",
    label: "Health & movement",
    description:
      "Light moves to 175 HP with slightly slower movement; Heavy moves to 325 HP with slightly faster movement. These changes are part of Season 12’s major balance update.",
    href: "/patchnotes?version=respec-order-3-retrospective#patch-respec-order-3-retrospective",
  },
];

/**
 * Murph Tournaments homepage.
 * Real data sources: `communityTournaments.list` (live/upcoming directory),
 * `patchNotes.getAll` (news). Season 12 highlights link to Embark reveals.
 * Champion callout, About stats, and media links
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

      <section className="border-b border-[var(--mt-steel-line)] py-8 sm:py-10">
        <div className="container">
          <div className="relative overflow-hidden rounded-xl border border-[var(--mt-gold)]/70 bg-[linear-gradient(135deg,rgba(201,169,74,0.16),rgba(21,21,23,0.96)_48%)] p-5 shadow-[0_0_36px_rgba(201,169,74,0.08)] sm:p-7">
            <div
              aria-hidden="true"
              className="absolute -right-12 -top-20 size-48 rounded-full border border-[var(--mt-gold)]/20"
            />
            <div className="relative">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                <div className="max-w-3xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--mt-gold)]/60 bg-[var(--mt-black)]/70 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[var(--mt-gold-bright)]">
                      <Megaphone className="size-3.5" aria-hidden="true" />
                      Season 12 · PRIME TIME
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--mt-muted)]">
                      Season launch · October 20, 2026
                    </span>
                  </div>
                  <h2 className="text-2xl font-black uppercase leading-tight text-[var(--mt-off-white)] sm:text-3xl">
                    PRIME TIME: the Season 12 highlights
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
                    Season 12 brings a new Light playstyle, a solo tournament
                    mode and a major evolution of the arenas and game show.
                    Explore the PRIME TIME highlights below.
                  </p>
                </div>
                <a
                  href="https://www.reachthefinals.com/roadmap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--mt-gold)] px-5 font-mono text-xs font-black uppercase tracking-widest text-[var(--mt-gold-foreground)] transition hover:bg-[var(--mt-gold-bright)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
                >
                  Official Season Roadmap
                  <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              </div>

              <figure className="mx-auto mt-6 max-w-2xl">
                <img
                  src="https://images.squarespace-cdn.com/content/62d66fa29e72c560f8efc020/dd9c2e22-0cff-42cd-a894-acf36ece3004/TF_S12_LIGHT_KA.png?format=1000w"
                  alt="Official Season 12 Infiltrator equipment artwork featuring the Mimic Device and Translocator on a red background"
                  width={1000}
                  height={565}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full rounded-lg border border-[var(--mt-steel-line)]"
                />
                <figcaption className="mt-2 text-xs leading-5 text-[var(--mt-muted)]">
                  Infiltrator equipment · Artwork © Embark Studios. From the{" "}
                  <a
                    href="https://www.reachthefinals.com/roadmap"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded text-[var(--mt-gold-bright)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
                  >
                    official THE FINALS roadmap
                  </a>
                  .
                </figcaption>
              </figure>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {SEASON_12_HIGHLIGHTS.map(highlight => (
                  <article
                    key={highlight.title}
                    className="flex min-w-0 flex-col rounded-lg border border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 p-4"
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
                      {highlight.label}
                    </p>
                    <h3 className="mt-2 text-lg font-black leading-tight text-[var(--mt-off-white)]">
                      {highlight.title}
                    </h3>
                    <p className="mb-4 mt-3 text-sm leading-6 text-[var(--mt-muted)]">
                      {highlight.description}
                    </p>
                    <a
                      href={highlight.href}
                      target={
                        highlight.href.startsWith("https://")
                          ? "_blank"
                          : undefined
                      }
                      rel={
                        highlight.href.startsWith("https://")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      aria-label={`Read or watch Embark's reveal: ${highlight.title}`}
                      className="mt-auto inline-flex items-center gap-2 self-start rounded text-xs font-bold text-[var(--mt-gold-bright)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-gold-bright)]"
                    >
                      {highlight.href.startsWith("https://")
                        ? "Watch the reveal"
                        : "Read the retrospective"}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </a>
                  </article>
                ))}
              </div>
              <p className="mt-6 border-t border-[var(--mt-steel-line)] pt-5 text-xs leading-5 text-[var(--mt-muted)]">
                Highlights from Embark’s official PRIME TIME reveals. For
                detailed balance changes and update history,{" "}
                <a
                  href="/patchnotes"
                  className="font-bold text-[var(--mt-gold-bright)] underline underline-offset-4"
                >
                  browse the patch notes
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <SectionHeading
            eyebrow="Player Tools"
            title="Prep for Your Next Match"
          />
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
