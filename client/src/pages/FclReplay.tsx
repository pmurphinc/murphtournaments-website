import { Link } from "wouter";
import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import { getFclReplayBySlug } from "@/data/fclReplays";

type RouteParams = {
  slug: string;
};

export default function FclReplay({ params }: { params: RouteParams }) {
  const replay = getFclReplayBySlug(params.slug);

  if (!replay) {
    return (
      <div className="min-h-screen bg-dark-charcoal py-20">
        <div className="container">
          <NeonCard variant="gold">
            <p className="font-mono text-sm uppercase tracking-widest text-neon-gold">
              Replay not found
            </p>
            <p className="mt-3 max-w-2xl font-mono text-sm text-white/70">
              This FCL replay is not available. Return to tournament history to
              choose another archive.
            </p>
            <Link
              href="/tournaments"
              className="mt-6 inline-block rounded-sm border-2 border-neon-gold px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-gold transition-all hover-glow-magenta"
            >
              Back to Tournaments
            </Link>
          </NeonCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        <div className="mb-10">
          <GlitchText size="xl" variant="gold" className="mb-4">
            {replay.title}
          </GlitchText>
          <p className="font-mono text-sm uppercase tracking-widest text-neon-cyan">
            {replay.date}
          </p>
          <p className="mt-4 max-w-3xl font-mono text-base text-white/75">
            {replay.description}
          </p>
        </div>

        <NeonCard variant="gold">
          <div className="overflow-hidden rounded-sm border border-neon-gold/30 bg-black shadow-[0_0_35px_rgba(255,183,3,0.16)]">
            <iframe
              className="aspect-video w-full"
              src={replay.embedUrl}
              title={`${replay.title} replay`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/tournaments"
              className="inline-block rounded-sm border-2 border-neon-cyan px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition-all hover-glow-cyan"
            >
              Tournament History
            </Link>
            <a
              href={replay.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-sm border-2 border-neon-gold px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-gold transition-all hover-glow-magenta"
            >
              Open on YouTube
            </a>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}
