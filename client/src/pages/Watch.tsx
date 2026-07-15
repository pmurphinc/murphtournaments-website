import { Film, PlayCircle, Radio, Video } from "lucide-react";
import SectionHeading from "@/components/public/SectionHeading";
import MediaCard from "@/components/public/MediaCard";
import CtaButton from "@/components/public/CtaButton";

export default function Watch() {
  return (
    <div>
      <div className="border-b border-[var(--mt-steel-line)] py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            level="h1"
            eyebrow="Media"
            title="Watch &amp; Media"
            description="Follow Murph Tournaments across all platforms for tournament streams, highlights, and competitive content."
          />
        </div>
      </div>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <div className="mb-6 flex items-center gap-2">
            <Radio
              className="size-5 text-[var(--mt-gold-bright)]"
              aria-hidden="true"
            />
            <h2 className="text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
              Watch Live
            </h2>
          </div>
          <div className="mt-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-[var(--mt-off-white)]">
                Live on Twitch
              </p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--mt-muted)]">
                Live tournament matches, competitive gameplay, and community
                events, with professional commentary and analysis. Streams: 9 PM
                – 12 AM PST.
              </p>
            </div>
            <a
              href="https://www.twitch.tv/pmurphinc"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <CtaButton tone="gold">Watch on Twitch</CtaButton>
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <div className="mb-6 flex items-center gap-2">
            <Film
              className="size-5 text-[var(--mt-gold-bright)]"
              aria-hidden="true"
            />
            <h2 className="text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
              Watch VODs &amp; Highlights
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MediaCard
              media={{
                title: "TikTok — Short-Form Highlights",
                description:
                  "Fast-paced tournament highlights and clutch plays",
                href: "https://www.tiktok.com/@pmurphinc",
                platformLabel: "TikTok — Watch VOD",
                icon: <Video className="size-5" aria-hidden="true" />,
              }}
            />
            <MediaCard
              media={{
                title: "TikTok — Clips & Reels",
                description:
                  "Best moments, player spotlights, behind-the-scenes",
                href: "https://www.tiktok.com/@pmurphinc",
                platformLabel: "TikTok — Watch VOD",
                icon: <Video className="size-5" aria-hidden="true" />,
              }}
            />
            <MediaCard
              media={{
                title: "YouTube — Full VODs",
                description:
                  "Complete tournament recordings and archived streams",
                href: "https://www.youtube.com/Pmurphinc",
                platformLabel: "YouTube — Watch VOD",
                icon: <PlayCircle className="size-5" aria-hidden="true" />,
              }}
            />
            <MediaCard
              media={{
                title: "YouTube — Analysis & Guides",
                description:
                  "Competitive analysis, interviews, and educational content",
                href: "https://www.youtube.com/Pmurphinc",
                platformLabel: "YouTube — Watch VOD",
                icon: <PlayCircle className="size-5" aria-hidden="true" />,
              }}
            />
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container">
          <h2 className="mb-6 text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
            Stream Schedule
          </h2>
          <div className="mt-panel divide-y divide-[var(--mt-steel-line)]">
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-bold text-[var(--mt-off-white)]">
                  Typical Stream
                </p>
                <p className="text-sm text-[var(--mt-muted)]">
                  Murph Tournaments on Twitch
                </p>
              </div>
              <p className="shrink-0 font-mono text-sm text-[var(--mt-muted)]">
                9 PM PST
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-bold text-[var(--mt-off-white)]">
                  Dev Division
                </p>
                <p className="text-sm text-[var(--mt-muted)]">Suspended</p>
              </div>
              <p className="shrink-0 font-mono text-sm text-[var(--mt-muted)]">
                First Friday
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-bold text-[var(--mt-off-white)]">
                  Special Events
                </p>
                <p className="text-sm text-[var(--mt-muted)]">
                  Announcements on Discord
                </p>
              </div>
              <p className="shrink-0 font-mono text-sm text-[var(--mt-muted)]">
                Varies
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
