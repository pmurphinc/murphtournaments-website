import type { PatchNote } from "../drizzle/schema";

export type WebsitePatchNote = Pick<
  PatchNote,
  | "title"
  | "date"
  | "content"
  | "url"
  | "sourceUrl"
  | "version"
  | "isGameUpdate"
> & {
  id?: number;
};

export const cleanPatchNoteContent = (content: string) => {
  let cleaned = content
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<noinclude\b[^>]*>[\s\S]*?<\/noinclude>/gi, "")
    .replace(/<noinclude\b[^>]*\/?\s*>/gi, "")
    .replace(/<includeonly\b[^>]*>[\s\S]*?<\/includeonly>/gi, "")
    .replace(/<includeonly\b[^>]*\/?\s*>/gi, "")
    .replace(/<onlyinclude\b[^>]*>/gi, "")
    .replace(/<\/onlyinclude>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref\b[^>]*\/?\s*>/gi, "");

  let previous: string;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(/\{\{[^{}]*\}\}/g, "");
  } while (cleaned !== previous);

  return cleaned
    .replace(/\{\{[^\n]*$/gm, "")
    .replace(/^[^\n]*\}\}/gm, "")
    .replace(/\[\[File:[^\]]*\]\]/gi, "")
    .replace(/\[\[Category:[^\]]*\]\]/gi, "")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^={1,6}\s*(.+?)\s*={1,6}$/gm, "$1")
    .replace(/^[*#:;]+\s*/gm, "• ")
    .replace(/^\s*[|!].*$/gm, "")
    .replace(/^\s*\{\|.*$/gm, "")
    .replace(/^\s*\|\}.*$/gm, "")
    .replace(/'{2,5}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const WEBSITE_PATCH_NOTES: WebsitePatchNote[] = [
  {
    id: -1060,
    title: "Midseason Update 10.6.0",
    date: "2026.05.07",
    version: "10.6.0",
    url: "https://www.reachthefinals.com/patchnotes/10-60",
    sourceUrl: "https://www.reachthefinals.com/patchnotes/10-60",
    isGameUpdate: 1,
    content: `THE FINALS — Midseason Update 10.6.0

The Season 10 Midseason Update adds Dragon’s Claim, Scales of Fortune, new Twitch Drops, balance tuning, and a broad bug-fix pass.

Dragon’s Claim Limited-Time Mode

• New 5v5 mode focused on taking, planting, and holding a banner.
• Planting the banner creates a zone where Contestants earn cash by surviving inside it.
• The planting team receives a cash bonus, and the banner attracts a fire-breathing dragon from above.
• The first team to hit the winning cash amount, or the team with the most cash when time expires, wins.
• Available from May 7 through May 28, 2026.

Scales of Fortune event

• Complete daily contracts to earn up to 3 tickets per day.
• Spin the Scales of Fortune wheel for more than 20 free rewards, including a Legendary outfit for completion.
• Duplicate rewards convert wheel tiles into Golden Tickets for guaranteed new-item spins.
• Available through May 28, 2026.

Twitch Drops

• Watch 1 hour for the Wyrmmarked Sticker.
• Watch 2 hours for the Scale Crest Charm.
• Watch 4 hours for the Scaelium Edge Chimera-XB Skin.
• Drops available through May 21, 2026.

Balance Changes

Gadgets
• Vanishing Bomb: invisibility duration decreased from 6s to 5s; cooldown increased from 18s to 22s.

Game Modes
• Coin respawns in Cashout, Ranked Cashout, and Quick Cash now require roughly 20% more enemy distance.
• Ranked Tournament league rank distribution recalibrated to spread players more evenly across ranks.

Gameplay
• Goo now breaks when overlapping a player in 0.35s instead of 0.8s.

Specializations
• Shockwave: reverted the 10.3 launch-height constraint when combined with Jump Pad.
• Guardian Turret: vertical vision angle increased from ±45 degrees to ±60 degrees.

Weapons
• .50 Akimbo: hip-fire dispersion tightened across max, standing, and moving states.
• Chimera-XB: falloff minimum range decreased from 20m to 17.5m, falloff max range decreased from 30m to 27.5m, and falloff multiplier decreased from 0.6 to 0.53.
• KS-23: pump-action trigger-hold delay disabled for smoother firing consistency.
• M11: falloff max range increased from 17.5m to 20m, but falloff multiplier decreased from 0.52 to 0.45.
• M26 Matter: pump-action trigger-hold delay disabled.
• Model 1887: pump-action trigger-hold delay disabled.
• Spear: spin attack target caps increased from 8 to 24 players and from 20 to 60 non-player targets.
• V9S: magazine size decreased from 20 to 18.

Bug Fixes

• Animation fixes for ARN-220, Riot Shield, Spear, hand gestures, and interaction visuals.
• Audio fixes for Monaco cannon audio, audience cutouts, sliding fades, weapon firing sounds, Vault/Cashout sounds, squad intro music, replay audio, and reconnect audio.
• Cosmetic compatibility and cloth simulation improvements.
• Gadget fixes for Glitch Trap pings, Proximity Sensor pings, and object pickup cancellation.
• Gameplay fixes for scissor lifts, Revive Statues, Cashout Station movement exploits, Charge ‘n’ Slam interactions, Guardian Turret bots, Hover Pad elimination credit, default AKM display, cloaked pings, and controller weapon-switch animations.
• Map fixes for Fangwai City, Las Vegas, Las Vegas Stadium, Monaco, Point Break, and Seoul.
• Dragon’s Claim added to Private Matches.
• Social, spectator, stability, UI, Sponsorship, World Tour, and weapon-reload fixes included.`,
  },
];

const sortPatchNotesNewestFirst = <
  T extends { date: string; version: string | null },
>(
  patches: T[]
) =>
  patches.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.version ?? "").localeCompare(a.version ?? "", undefined, {
      numeric: true,
    });
  });

export const mergeWebsitePatchNotes = (
  dbNotes: PatchNote[]
): WebsitePatchNote[] => {
  const byVersion = new Map<string, WebsitePatchNote>();

  for (const note of dbNotes) {
    const version = note.version ?? `db-${note.id}`;
    byVersion.set(version, {
      id: note.id,
      title: note.title,
      date: note.date,
      content: cleanPatchNoteContent(note.content),
      url: note.url,
      sourceUrl: note.sourceUrl,
      version: note.version,
      isGameUpdate: note.isGameUpdate,
    });
  }

  for (const note of WEBSITE_PATCH_NOTES) {
    byVersion.set(note.version ?? note.title, {
      ...note,
      content: cleanPatchNoteContent(note.content),
    });
  }

  return sortPatchNotesNewestFirst(Array.from(byVersion.values()));
};
