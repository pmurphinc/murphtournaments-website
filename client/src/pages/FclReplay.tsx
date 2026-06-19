import { useState } from "react";
import { Link } from "wouter";
import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import { getFclReplayBySlug } from "@/data/fclReplays";

type RouteParams = {
  slug: string;
};

export default function FclReplay({ params }: { params: RouteParams }) {
  const replay = getFclReplayBySlug(params.slug);
  const [videoError, setVideoError] = useState(false);

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
          {videoError ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-sm border border-neon-gold/30 bg-black/40 p-6 text-center">
              <div>
                <p className="font-mono text-lg font-bold uppercase tracking-widest text-neon-gold">
                  Replay unavailable
                </p>
                <p className="mt-3 max-w-xl font-mono text-sm text-white/65">
                  The video file could not be loaded from the tournament media
                  archive. Please try again later.
                </p>
              </div>
            </div>
          ) : (
            <video
              className="aspect-video w-full rounded-sm border border-neon-gold/30 bg-black"
              controls
              preload="metadata"
              onError={() => setVideoError(true)}
            >
              <source src={replay.videoPath} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/tournaments"
              className="inline-block rounded-sm border-2 border-neon-cyan px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition-all hover-glow-cyan"
            >
              Tournament History
            </Link>
            <a
              href={replay.videoPath}
              className="inline-block rounded-sm border-2 border-neon-gold px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest text-neon-gold transition-all hover-glow-magenta"
            >
              Open Video File
            </a>
          </div>
        </NeonCard>
      </div>
    </div>
  );
}
