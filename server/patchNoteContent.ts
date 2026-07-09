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
    id: -1100,
    title: "Season 11 | Galaxy Masters",
    date: "2026.07.09",
    version: "11.0.0",
    url: "https://www.reachthefinals.com/patchnotes/11-00",
    sourceUrl: "https://www.reachthefinals.com/patchnotes/11-00",
    isGameUpdate: 1,
    content: `THE FINALS — Season 11 | Galaxy Masters

Season 11 launches Galaxy Masters with the Galaxy Estates arena, a broad melee-system rework, bot matches, Ranked updates, Cashout objective-variety tuning, progression updates, and a large balance and bug-fix pass.

New Arena: Galaxy Estates

• Galaxy Estates joins Cashout, Ranked Cashout, Quick Cash, Team Deathmatch, Head 2 Head, and Final Round Private Matches.
• The arena is set inside a COMETA space habitat with residential zones, a botanical garden, a sports center, a spaceport, speed tunnels, anti-gravity columns, oxygen pods, trampolines, and destructible towers.
• A dedicated Galaxy Estates Cashout queue is available during launch week.

Battle Pass / Season 11 Launch Notes

• Season 11 adds Free, Premium, and Ultimate Battle Pass tracks with new retro-futuristic cosmetics.
• Premium includes up to 106 rewards and earnable Multibucks; Ultimate adds extra rewards, 20 unlocked levels, a Match XP boost, and upfront Multibucks.
• The Season 8 Battle Pass moves into the legacy roster.

Revamped Tutorial and Early Talent Program

• New players get a refreshed tutorial that introduces Cashout objectives alongside Dede and bot opponents.
• Rookie Contracts are replaced by the Early Talent Program in the Academy, with mode tutorials and direct Practice Range Challenge access.

Bot Matches

• Cashout (Bots) lets players queue solo, in parties, or through matchmaking for a three-round Cashout tournament against bots.
• Bot matches grant reduced progression toward World Tour, Battle Pass, and other systems.
• Bots launch in beta on Monaco, Bernal, Kyoto, Las Vegas, and SYS$Horizon.

Melee Rework

• Melee weapons now use Stamina for lunge access and Precision zones for precise versus glancing damage.
• Dagger, Dual Blades, Riot Shield, Sledgehammer, Spear, and Sword received detailed damage, lunge, stamina, and secondary-function updates.
• Quick Melee damage was reduced, and a contextual Kick attack can push targets back when used at full stamina.

Ping System Improvements

• Ping wheels were consolidated, ping input responsiveness improved, response tallies were added, and ping hints now provide clearer interaction information.
• Emotes fit on one wheel, and players may need to re-equip customizations or keybindings affected by the reorganization.

Ranked Tournament Season 11 Changes

• Ranked adds personal performance bonuses based on match grade and current tier.
• End-of-match Ranked Score breakdowns were updated for clarity.
• Placement calibration was updated, and Season 11 adds a second Diamond reward token.

Cashout Spawning / Objective Variety Changes

• Cashout and Ranked Tournament objective spawning was updated to make Cashout Station locations more varied and less predictable.

Player Card Improvements

• Player Cards can now be individually edited and saved per Contestant.
• Players can choose the pose shown on each Player Card instead of relying only on the intro Emote pose.

More Arenas for Modes

• Point Break comes to Las Vegas Stadium.
• Team Deathmatch comes to Monaco.

Sponsor Progression Changes

• Sponsor reward requirements were reduced for Season 11, with total Fans needed for a Sponsor reward track reduced by roughly half.

World Tour Reward Changes

• World Tour rewards are now granted when reaching a league rather than climbing to the top of that league.
• Diamond rewards are guaranteed on reaching Diamond 4; Emerald coin rewards continue at Emerald 3, Emerald 2, and Emerald 1.

Twitch Drops / Support a Streamer

• Season 11 Twitch Drops include the Trip Report Sticker, Launch Paperwork Charm, and Sonia The Sonar Grenade.
• Support a Streamer rewards include the Charmalure Set and Approach Vector Helmet for qualifying Twitch gift-sub support.

Esports Note

• Season 11 opens with new competitive broadcasts and Cycle 3 qualifier sign-ups for APAC, AMERICAS, and EMEA.

Balance Changes

• Gadgets: APS Turret, Breach Charge, Data Reshaper, and Hover Pad received buffs or adjustments.
• Melee: Stamina and Precision were added across melee weapons, with major per-weapon tuning and new contextual melee behavior.
• Specializations: Cloaking Device, Evasive Dash, and Winch Claw received nerfs or adjustments.
• Weapons: .50 Akimbo, 93R, FCAR, KS-23, M134 Minigun, Model 1887, and Pike-556 were updated.
• Item XP earn rates were increased for several specializations and gadgets.

Bug Fixes

• The update includes fixes and improvements across animation, audio, cosmetics, gadgets, gameplay, maps, performance, rendering, social features, spectator, stability, UI, and weapons.`,
  },
  {
    id: -900,
    title: "Season 9 | Dragon Rising",
    date: "2025.12.10",
    version: "9.0.0",
    url: "https://www.reachthefinals.com/patchnotes/900",
    sourceUrl: "https://www.reachthefinals.com/patchnotes/900",
    isGameUpdate: 1,
    content: `THE FINALS — Season 9 | Dragon Rising

Season 9 adds Fangwai City, the new Point Break mode, World Tour 2.0, Reward Coins, flexible Sponsor selection, Double Jeopardy for Cashout, Battle Pass updates, expanded customization, optimization work, Smooth Destruction upgrades, Twitch Drops, balance changes, and a broad bug-fix pass.

New Map | Fangwai City

• Fangwai City joins the Arena with elevated walkways, apartment blocks, riverfront routes, gardens, towers, and smooth destruction.
• Added to Cashout, Ranked Cashout, Quick Cash, Head 2 Head, and Team Deathmatch rotations.

New Mode | Point Break

• New 8v8 Attackers vs Defenders mode built around nine Grand Vaults.
• Attackers push through phases and destroy Grand Vaults before running out of respawn tokens.
• Defenders win by depleting the Attackers’ coins.
• Added Point Break support for Private Matches.

World Tour 2.0 and Reward Coins

• World Tour is now a progression wrapper that tracks play across all modes.
• The old World Tour Tournament mode is renamed Cashout.
• Reward Coins let players choose ranked and World Tour weapon-skin rewards instead of receiving fixed end-of-season skins.

Sponsors, Battle Pass, and Quality of Life

• Players can now sign with any Sponsor and swap Sponsors at any time.
• Season 9 adds VOLPE, OSPUZE, new loyalty tracks, Free/Premium/Ultimate Battle Pass rewards, Calvin the Cube Twitch Drops, expanded privacy options, club party invites, opt-in Instant Replay viewing, skin randomization, and multi-device tablet customization.

Cashout Rules

• Added Double Jeopardy: if a team inserts a second Cashbox into an active Cashout Station and does not control that Cashout when it completes, that team loses 50% of its current cash total.
• Ranked Tournament Cashboxes no longer despawn when overtime begins.

Balance Changes

Controller
• Added aim snapping to .50 Akimbo, BFR Titan, CB-01 Repeater, Cerberus 12GA, KS-23, M26 Matter, Model 1887, R.357, Recurve Bow, SA1216, and SR-84.
• Aim snapping cooldown increased from 0.5s to 0.7s.
• Added a 1.5s aim-snapping cooldown for sniper rifles.
• Added a 1s aim-snapping cooldown for shotguns, revolvers, and grenade launchers.
• Aim snapping now scales with distance.

Gadgets
• Breach Charge: cooldown decreased from 30s to 20s.
• Dome Shield: now blocks Winch Claw.
• Frag Grenade: outer radius increased from 5m to 5.5m; max-damage radius increased from 2.5m to 2.75m.
• Gas Grenade: cooldown decreased from 30s to 24s.
• Gateway: max range decreased from 70m to 50m.
• Glitch Grenade: ammo decreased from 2 to 1; cooldown decreased from 20s to 12s.
• Goo: explosive damage multiplier against goo increased from 2.0 to 2.25.
• Pyro Grenade: cooldown decreased from 30s to 24s.
• Pyro Mine: explosive damage decreased from 80 to 55.
• Thermal Bore: fuse time decreased from 2.5s to 1.75s; cooldown decreased from 45s to 35s; lingering smoke reduced.
• RPG-7: damage increased from 100 to 110.

Specializations
• Mesh Shield: max health increased from 750 to 850 and now blocks Winch Claw.
• Winch Claw: max stun duration decreased from 0.65s to 0.5s; minimum stun duration decreased from 0.35s to 0.2s; claw breaks if the victim is far from the initial collision point; claw retracts faster when it hits an object it cannot latch onto.

Weapons
• 93R: damage decreased from 26 to 24; falloff start decreased from 32m to 30m; falloff end decreased from 40m to 37.5m; max-range falloff multiplier increased from 40% to 50%.
• BFR Titan: environmental damage decreased from 130 to 95; rate of fire decreased from 85 RPM to 82 RPM.
• Dual Blades: third attack damage increased from 65 to 100.
• KS-23: ADS bullet dispersion decreased by roughly 30%.
• Lewis Gun: damage increased from 22 to 23.
• M134 Minigun: ADS bullet dispersion slightly decreased while crouching or standing still.
• M60: vertical recoil decreased during the first 8 bullets; vertical recoil slightly increased after the 30th bullet.
• Model 1887: tactical reload intro animation decreased from 2.2s to 1.5s.
• V9S: falloff start increased from 10m to 15m; falloff end increased from 15m to 25m; max-range falloff multiplier increased from 62% to 65%.

Content and Bug Fixes

• Animation, audio, contracts, cosmetics, gadgets, gameplay, map, performance, rendering, social, spectator, stability, and UI fixes included.
• Monaco received Smooth Destruction across all buildings.
• Point Break was added to Private Matches.
• Thermal Bore activation, Gateway/Winch Claw edge cases, pull-through-wall cases, recent line-of-sight checks, Quick Melee cooldown behavior, and multiple weapon animation/audio issues were fixed.`,
  },
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
