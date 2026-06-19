export type FclReplay = {
  slug: string;
  title: string;
  date: string;
  description: string;
  videoPath: string;
};

export const fclReplays = [
  {
    slug: "season-1-day-3",
    title: "FCL Season 1 Day 3",
    date: "January 17, 2026",
    description:
      "Day 3 of the Finals Contender League, archived for on-site replay after the original YouTube upload became unavailable.",
    videoPath: "/media/fcl/FCL-Day3.mp4",
  },
  {
    slug: "season-1-day-4",
    title: "FCL Season 1 Day 4",
    date: "January 24, 2026",
    description:
      "Day 4 of the Finals Contender League, archived for on-site replay after the original YouTube upload became unavailable.",
    videoPath: "/media/fcl/FCL-Day%204.mp4",
  },
  {
    slug: "season-1-day-5",
    title: "FCL Season 1 Day 5",
    date: "January 31, 2026",
    description:
      "Day 5 of the Finals Contender League, archived for on-site replay after the original YouTube upload became unavailable.",
    videoPath: "/media/fcl/FCL-Day5.mp4",
  },
  {
    slug: "season-1-day-6-final",
    title: "FCL Season 1 Day 6 Grand Finals",
    date: "February 6, 2026",
    description:
      "The Finals Contender League Season 1 Grand Finals, archived for on-site replay after the original YouTube upload became unavailable.",
    videoPath: "/media/fcl/FCL-Day-6-final.mp4",
  },
] as const satisfies readonly FclReplay[];

export function getFclReplayBySlug(slug: string) {
  return fclReplays.find(replay => replay.slug === slug) ?? null;
}
