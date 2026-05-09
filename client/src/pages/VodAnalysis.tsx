import { FormEvent, useMemo, useState } from "react";
import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import { trpc } from "@/lib/trpc";
import { getVodSourceLabel, parseVodSource } from "@shared/vod/source";
import { Link } from "wouter";

type VideoPov = "player" | "spectator";

type FormErrors = Partial<
  Record<"title" | "sourceUrl" | "videoPov" | "form", string>
>;

const povLabel = (value: VideoPov) =>
  value === "player" ? "Player POV" : "Spectator POV";

const formatDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to create VOD analysis.";

export default function VodAnalysis() {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoPov, setVideoPov] = useState<VideoPov>("player");
  const [errors, setErrors] = useState<FormErrors>({});

  const listQuery = trpc.vodAnalysis.list.useQuery(undefined, {
    staleTime: 1000 * 30,
  });

  const createMutation = trpc.vodAnalysis.create.useMutation({
    onSuccess: async () => {
      setTitle("");
      setSourceUrl("");
      setVideoPov("player");
      setErrors({});
      await utils.vodAnalysis.list.invalidate();
    },
    onError: error => {
      setErrors({ form: error.message });
    },
  });

  const sourcePreview = useMemo(() => {
    if (!sourceUrl.trim()) return null;
    const parsed = parseVodSource(sourceUrl);

    if (!parsed.valid) {
      return { valid: false, label: parsed.error } as const;
    }

    return { valid: true, label: getVodSourceLabel(parsed) } as const;
  }, [sourceUrl]);

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const parsedSource = parseVodSource(sourceUrl);

    if (!title.trim()) {
      nextErrors.title = "Title is required.";
    }

    if (!parsedSource.valid) {
      nextErrors.sourceUrl = parsedSource.error;
    }

    if (videoPov !== "player" && videoPov !== "spectator") {
      nextErrors.videoPov = "Choose Player POV or Spectator POV.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) return;

    createMutation.mutate({
      title,
      sourceUrl,
      videoPov,
    });
  };

  const vodAnalyses = listQuery.data ?? [];

  return (
    <div className="min-h-screen bg-dark-charcoal py-20">
      <div className="container">
        <header className="mb-10">
          <GlitchText size="xl" variant="magenta" className="mb-4">
            VOD Analysis
          </GlitchText>
          <p className="max-w-3xl font-mono text-white/70">
            External source review and analytics foundation
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
          <NeonCard variant="cyan" className="h-fit">
            <div className="mb-6">
              <h2 className="font-mono text-2xl font-bold uppercase text-neon-cyan">
                Create VOD
              </h2>
              <p className="mt-2 font-mono text-sm text-white/60">
                Add a Twitch, YouTube, Google Drive, or direct video link for
                later review.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="vod-title"
                  className="mb-2 block font-mono text-sm uppercase tracking-widest text-white/80"
                >
                  Title
                </label>
                <input
                  id="vod-title"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  className="w-full rounded border border-neon-cyan/50 bg-black/60 px-3 py-2 font-mono text-white outline-none transition-colors placeholder:text-white/30 focus:border-neon-cyan"
                  placeholder="Ranked finals review"
                  disabled={createMutation.isPending}
                />
                {errors.title ? (
                  <p className="mt-2 font-mono text-xs text-red-300">
                    {errors.title}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="vod-source-url"
                  className="mb-2 block font-mono text-sm uppercase tracking-widest text-white/80"
                >
                  Video link
                </label>
                <input
                  id="vod-source-url"
                  value={sourceUrl}
                  onChange={event => setSourceUrl(event.target.value)}
                  className="w-full rounded border border-neon-cyan/50 bg-black/60 px-3 py-2 font-mono text-white outline-none transition-colors placeholder:text-white/30 focus:border-neon-cyan"
                  placeholder="https://www.twitch.tv/videos/1234567890"
                  disabled={createMutation.isPending}
                />
                {sourcePreview ? (
                  <p
                    className={`mt-2 font-mono text-xs ${sourcePreview.valid ? "text-neon-cyan" : "text-red-300"}`}
                  >
                    {sourcePreview.valid
                      ? `Source: ${sourcePreview.label}`
                      : sourcePreview.label}
                  </p>
                ) : null}
                {errors.sourceUrl ? (
                  <p className="mt-2 font-mono text-xs text-red-300">
                    {errors.sourceUrl}
                  </p>
                ) : null}
              </div>

              <fieldset>
                <legend className="mb-2 block font-mono text-sm uppercase tracking-widest text-white/80">
                  Video POV
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(["player", "spectator"] as const).map(pov => (
                    <label
                      key={pov}
                      className={`cursor-pointer rounded border px-3 py-3 font-mono text-sm transition-all ${
                        videoPov === pov
                          ? "border-neon-magenta bg-neon-magenta/15 text-white shadow-[0_0_14px_rgba(255,0,127,0.25)]"
                          : "border-white/15 bg-black/40 text-white/70 hover:border-neon-cyan/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="videoPov"
                        value={pov}
                        checked={videoPov === pov}
                        onChange={() => setVideoPov(pov)}
                        className="sr-only"
                        disabled={createMutation.isPending}
                      />
                      {povLabel(pov)}
                    </label>
                  ))}
                </div>
                {errors.videoPov ? (
                  <p className="mt-2 font-mono text-xs text-red-300">
                    {errors.videoPov}
                  </p>
                ) : null}
              </fieldset>

              {errors.form ? (
                <div className="rounded border border-red-500/40 bg-red-950/30 p-3 font-mono text-sm text-red-100">
                  {errors.form}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-sm border-2 border-neon-magenta px-6 py-3 font-mono font-bold uppercase tracking-widest text-neon-magenta transition-all hover:bg-neon-magenta/10 hover-glow-magenta disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create VOD"}
              </button>
            </form>
          </NeonCard>

          <section>
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-mono text-2xl font-bold uppercase text-neon-gold">
                  VOD Queue
                </h2>
                <p className="font-mono text-sm text-white/60">
                  Newest analyses appear first.
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-white/50">
                {vodAnalyses.length} total
              </span>
            </div>

            {listQuery.isError ? (
              <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-8 text-center font-mono text-red-100">
                VOD analyses could not be loaded. {listQuery.error.message}
              </div>
            ) : listQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-52 animate-pulse rounded-lg border border-white/10 bg-black/40"
                  />
                ))}
              </div>
            ) : vodAnalyses.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/40 p-8 text-center font-mono text-white/70">
                No VOD analyses yet. Create the first source to start the queue.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {vodAnalyses.map(vod => {
                  const sourceLabel = getVodSourceLabel({
                    valid: true,
                    sourceType: vod.sourceType,
                    normalizedUrl: vod.normalizedSourceUrl,
                    sourceId: vod.sourceId ?? undefined,
                    sourceRef: vod.sourceRef ?? undefined,
                  });
                  const sourceHref = vod.normalizedSourceUrl || vod.sourceUrl;

                  return (
                    <NeonCard key={vod.id} variant="gold" className="h-full">
                      {vod.thumbnailUrl ? (
                        <img
                          src={vod.thumbnailUrl}
                          alt={`${vod.title} thumbnail`}
                          className="mb-4 aspect-video w-full rounded bg-black/40 object-cover"
                          loading="lazy"
                        />
                      ) : null}

                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-mono text-xl font-bold text-white">
                            {vod.title}
                          </h3>
                          <p className="mt-1 font-mono text-sm text-neon-cyan">
                            {sourceLabel}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="rounded border border-neon-gold/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-gold">
                            {vod.status}
                          </span>
                          {vod.pendingSuggestedCount > 0 ? (
                            <span className="rounded border border-neon-cyan/60 bg-neon-cyan/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-cyan">
                              {vod.pendingSuggestedCount} Pending
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mb-5 flex flex-wrap gap-2 font-mono text-xs uppercase tracking-widest text-white/60">
                        <span className="rounded border border-white/10 bg-black/30 px-2 py-1">
                          {povLabel(vod.videoPov)}
                        </span>
                        <span className="rounded border border-white/10 bg-black/30 px-2 py-1">
                          Created {formatDate(vod.createdAt)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/vod/${vod.id}`}
                          className="inline-block rounded-sm border-2 border-neon-magenta px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon-magenta transition-all hover:bg-neon-magenta/10 hover-glow-magenta"
                        >
                          View details
                        </Link>
                        {vod.pendingSuggestedCount > 0 ? (
                          <Link
                            href={`/vod/${vod.id}?review=suggestions`}
                            className="inline-block rounded-sm border-2 border-neon-gold px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon-gold transition-all hover:bg-neon-gold/10"
                          >
                            Review suggestions
                          </Link>
                        ) : null}
                        <a
                          href={sourceHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-sm border-2 border-neon-cyan px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover-glow-cyan"
                        >
                          Open source
                        </a>
                      </div>
                    </NeonCard>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
