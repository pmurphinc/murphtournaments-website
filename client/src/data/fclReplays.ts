export type FclReplay = {
  slug: string;
  title: string;
  date: string;
  description: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  embedUrl: string;
};

function createYoutubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}

export const fclReplays = [
  {
    slug: "season-1-day-3",
    title: "FCL Season 1 Day 3",
    date: "January 17, 2026",
    description:
      "Day 3 of the Finals Contender League, archived for on-site replay after the original YouTube upload became unavailable.",
    youtubeVideoId: "UfbSv8KY6Is",
    youtubeUrl: "https://youtu.be/UfbSv8KY6Is",
    embedUrl: createYoutubeEmbedUrl("UfbSv8KY6Is"),
  },
  {
    slug: "season-1-day-4",
    title: "FCL Season 1 Day 4",
    date: "January 24, 2026",
    description:
      "Day 4 of the Finals Contender League, archived for on-site replay after the original YouTube upload became unavailable.",
    youtubeVideoId: "4_bkP_4ZGp4",
    youtubeUrl: "https://youtu.be/4_bkP_4ZGp4",
    embedUrl: createYoutubeEmbedUrl("4_bkP_4ZGp4"),
  },
  {
    slug: "season-1-day-5",
    title: "FCL Season 1 Day 5",
    date: "January 31, 2026",
    description:
      "Day 5 of the Finals Contender League, archived for on-site replay after the original YouTube upload became unavailable.",
    youtubeVideoId: "TDAkTZDQCho",
    youtubeUrl: "https://youtu.be/TDAkTZDQCho",
    embedUrl: createYoutubeEmbedUrl("TDAkTZDQCho"),
  },
  {
    slug: "season-1-day-6-final",
    title: "FCL Season 1 Day 6 Grand Finals",
    date: "February 6, 2026",
    description:
      "The Finals Contender League Season 1 Grand Finals, archived for on-site replay after the original YouTube upload became unavailable.",
    youtubeVideoId: "axIgqHf2I8A",
    youtubeUrl: "https://youtu.be/axIgqHf2I8A",
    embedUrl: createYoutubeEmbedUrl("axIgqHf2I8A"),
  },
] as const satisfies readonly FclReplay[];

export function getFclReplayBySlug(slug: string) {
  return fclReplays.find((replay) => replay.slug === slug) ?? null;
}
