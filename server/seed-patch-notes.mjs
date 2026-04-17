/**
 * Seed script: Populates the patch_notes table with existing hardcoded patch data.
 * Run once: node server/seed-patch-notes.mjs
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, desc } from "drizzle-orm";
import { mysqlTable, int, varchar, text, timestamp } from "drizzle-orm/mysql-core";

// Inline table definition to avoid TypeScript import issues in .mjs
const patchNotes = mysqlTable("patch_notes", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  date: varchar("date", { length: 64 }).notNull(),
  content: text("content").notNull(),
  url: varchar("url", { length: 512 }),
  sourceUrl: varchar("sourceUrl", { length: 512 }),
  version: varchar("version", { length: 64 }),
  isGameUpdate: int("isGameUpdate").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

const SEED_DATA = [
  {
    title: "UPDATE 10.3.0",
    date: "2026.04.17",
    version: "10.3.0",
    url: "https://www.reachthefinals.com/patchnotes/10-30",
    sourceUrl: "https://www.thefinals.wiki/wiki/Update:10.3.0",
    isGameUpdate: 1,
    content: `WORLD TOUR | RESPEC ORDER

Respec Order adjusts health values and base movement speeds of Heavy and Light archetypes in Cashout mode for one week.

Heavy
• Health decreased from 350 to 325
• Base movement speeds (run and sprint) increased by approximately 10%

Light
• Health increased from 150 to 175
• Base movement speeds (run and sprint) decreased by approximately 10%
• Increased health regen delay from 7s to 8s

BALANCE CHANGES

Gameplay
• Decreased goo break time when overlapping a player from 0.8s to 0.2s
• Slightly decreased movement velocity required to trigger a slide

Weapons
• 93R: Damage increased from 24 to 25, ammo decreased from 24 to 21
• FAMAS: Slightly decreased recoil when ADS for better accuracy at range
• XP-54: Ammo increased from 34 to 36

Gadgets
• H+ Infuser: Ammo regen delay increased from 8s to 10s
• Healing Emitter: Can now deploy in the air, size decreased by ~15%
• Hover Pad: Health increased from 300 to 350

BUG FIXES

Animation: Fixed Riot Shield hit reactions, improved cloth simulation, fixed aiming over-rotation, reduced weapon clipping in menus.

Audio: Improved Minigun audio timing, reduced weapon audio latency on 16GB+ RAM systems, fixed team wipe buzzer timing, improved movement foley.

Gadgets: Data Reshaper input buffer improved, Hover Pad destruction and spin fixes, Jump Pad clipping fix, Dome Shield hit detection fix.

Game Modes: Cashout vault/station spawn limit fix. Point Break: Starlight Hollow added to rotation, defender gadgets now take DOT in captured zones, spawn camping prevention.

Gameplay: Fixed Healing Emitter/Guardian Turret wall launch, Hover Pad elimination credit fix, Shockwave item drop fix, Zipline detachment fix.

Maps: Fixes across Fangwai City, Kyoto, Monaco, Skyway Stadium, NOZOMI/CITADEL, P.E.A.C.E. Center, Las Vegas, Starlight Hollow, Practice Range. Shop storefront health increased from 500 to 2000.

Performance: Improved boot/menu load times, XeSS SDK 3.0.0, FSR4 default upscaler, PSSR 2 on PS5 Pro, optimized visual effects.

UI: Improved pings for enemy Respawn Statues, headshot multiplier stats added to weapon overviews, equipment cooldown pings, Match Recap improvements.

VFX: Fixed scope glint after elimination, Hover Pad effects in replays, improved Anti-Gravity Cube visuals, ray-traced materials on Monaco.`,
  },
  {
    title: "SEASON 10 | FANTASY LEAGUE",
    date: "2026.03.26",
    version: "10.0.0",
    url: "https://www.reachthefinals.com/patchnotes/10-00",
    sourceUrl: "https://www.thefinals.wiki/wiki/Update:Season_10",
    isGameUpdate: 1,
    content: `THE FINALS — Season 10 Patch Summary

Season 10 delivers a major competitive shake-up with new content, balance adjustments, and system updates that directly impact tournament play.

New Content

New Map / Updates
• Map pool refreshed with layout adjustments to improve flow and reduce stalemates
• Environmental destruction tuning for more predictable engagements

New Weapons & Gadgets
• New loadout options added across classes
• Designed to expand playstyles without breaking core meta

Balance Changes (Competitive Impact)

Weapons
• Recoil and damage tuning across multiple weapons
• Reduced dominance of top-tier meta picks
• Increased viability for underused weapons

Gadgets
• Utility balancing to prevent overstacking strong defensive setups
• Adjustments to cooldowns and effectiveness

Class Tuning
• Light, Medium, and Heavy roles rebalanced for clearer identity
• Survivability and mobility adjustments to reduce frustration in fights

Game Mode & Systems

Cashout Improvements
• Better pacing and clarity during objective fights
• Adjustments to spawn logic and contest mechanics

Ranked / Competitive Systems
• Improvements to matchmaking consistency
• Rank progression tuned for better skill representation

Quality of Life
• UI clarity improvements (health, damage feedback, objectives)
• Audio tweaks for better situational awareness
• Performance optimizations across platforms

Bug Fixes
• Fixed multiple gameplay exploits and edge-case interactions
• Improved hit registration consistency
• Stability improvements in high-action scenarios`,
  },
  {
    title: "UPDATE 9.9.0",
    date: "2026.02.12",
    version: "9.9.0",
    url: "https://www.reachthefinals.com/patchnotes/990",
    sourceUrl: "https://www.thefinals.wiki/wiki/Update:9.9.0",
    isGameUpdate: 1,
    content: `THE RED MOON SHALL SHINE!

A beautiful moon takes over the Arena, and rising lanterns float upwards, casting a soft glow across the Arena. The Lunar New Year festivities have officially started in THE FINALS!

COLLECTION EVENT | LUNAR NEW YEAR
Complete 3 daily contracts to light up a lantern each day and earn up to 15 free Lunar New Year-themed rewards, including the Legendary Final Mentra set! You will now only need to collect 12 out of the 14 rewards to unlock the Legendary set.

LTM | BANK IT
A classic in THE FINALS is now back as a Limited-Time Mode! Bank It makes its return as you race to eliminate your opponents and collect precious red envelopes to bring them safely to a Deposit Station.

ARENA UPDATES | LUNAR NEW YEAR DECOR
The Arena is aglow with Lunar New Year decorations lighting up selected maps. Visit Fangwai City, Las Vegas, Monaco, Seoul, and Fortune Stadium to embrace the festive spirit!

STORE | REVENANT SETS
Step into the boots of the mysterious spirits inside THE FINALS with the Ling Shen and Graveward Revenant sets and chase down your opponents in a relentless pursuit for vengeance.

BALANCE CHANGES
Weapon adjustments including BFR Titan damage reduction, CB-01 Repeater tuning, Cerberus 12GA pellet count increase, and LH1 camera shake reduction. These changes are aimed at reducing the 'poke' meta and improving overall weapon balance.

BUG FIXES
Extensive animation, audio, cosmetics, and gameplay fixes including improved crouch poses, fixed audio stutters, cosmetic display corrections, and map improvements across multiple arenas.`,
  },
  {
    title: "UPDATE 9.7.0",
    date: "2026.01.29",
    version: "9.7.0",
    url: "https://www.reachthefinals.com/patchnotes/970",
    sourceUrl: "https://www.thefinals.wiki/wiki/Update:9.7.0",
    isGameUpdate: 1,
    content: `STAY ON THE MOVE!

This week, we are bringing a bunch of bug fixes, some performance improvements, changes to Point Break, balance changes and more! The recent DDoS attacks have also been largely mitigated by now, so the game should be back to normal service!

SOCIAL | DISPLAY NAME
New rules for Embark ID Display Names to protect the game from bad actors. If your Display Name did not fit the new rule system, it was changed with no cooldown so you can pick a new one easily.

NEW REWARD | THE VOLTAGE MARAUDER SET
Earn the Voltage Marauder Set in THE FINALS when you own ARC Raiders! Simply connect your same Embark ID account across both games.

STORE UPDATE | PEAK-FORM STRIKER
Send your opponents down a slippery slope in style with the Peak-Form Striker and the Slope Slammer sets. We also added Finger guns!

WORLD TOUR | ORBITAL BREACH
Orbital Breach has been enabled in the Arena. This event combines Hackout (see nearby opponents through walls) and Orbital Lasers (targeting anyone standing still for too long).

DLC | GLITCH PROWLER SET
Let your feline side take over with the Glitch Prowler Set. Embrace the cuteness and strike!

BALANCE CHANGES
Gadget adjustments: Dome Shield health reduced from 300 to 250, Glitch Grenade ammo increased to 2 with cooldown raised to 25 seconds. Weapon tuning for FCAR, M60, P90, Pike-556, and XP-54 to improve automatic weapon viability and balance the meta.

BUG FIXES & IMPROVEMENTS
Extensive fixes for Gateway animations, audio issues, cosmetics, map improvements across Fangwai City, Kyoto, Las Vegas, Monaco, and Skyway Stadium. Performance optimizations for GPU and movement systems. Social features updated with new animations and offline appearance option.`,
  },
  {
    title: "UPDATE 9.4.0",
    date: "2026.01.08",
    version: "9.4.0",
    url: "https://www.reachthefinals.com/patchnotes/940",
    sourceUrl: "https://www.thefinals.wiki/wiki/Update:9.4.0",
    isGameUpdate: 1,
    content: `BACK IN ACTION!

Welcome, Contestants! It's the first week back in 2026 and we've packed this week's update with a long list of bug-fixes, some balance changes, and performance improvements.

SNOWBALL BLITZ | LAST CHANCE
This is the last week of Snowball Blitz, so make a pile of snowballs and turn in those contracts!

STORE UPDATE | P1XEL REIGN CREW
C-Pop group P1XEL REIGN have entered the Arena and they're here to take the spotlight from everyone! Do you have what it takes to face them?

TWITCH | NEW FREE DROPS
Brand-new free Twitch drops available until January 22nd. Watch anyone playing THE FINALS with drops enabled to earn exclusive rewards!

BALANCE CHANGES
Gadgets: Breach Drill bit length increased from 83cm to 108cm for better wall penetration. Game Modes: Cashout Station spawn logic updated for consistent distances. Weapons: CB-01 Repeater ADS zoom time increased, FAMAS recoil pattern adjusted, Recurve Bow rate of fire increased from 98 to 103 RPM, V9S damage falloff end range decreased from 25m to 20m.

BUG FIXES & IMPROVEMENTS
Extensive animation fixes for .50 Akimbo pistols, Mesh Shield interactions, and cosmetic clipping issues. Audio improvements including announcer volume slider integration, deploy sound polish, and ÖRF grenade voice line adjustments. Cosmetic compatibility improvements for boots, pants, hoodies, and various outfits.`,
  },
];

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set. Cannot seed.");
    process.exit(1);
  }

  const db = drizzle(dbUrl);
  console.log("Connected to database. Seeding patch notes...");

  let added = 0;
  let skipped = 0;

  for (const patch of SEED_DATA) {
    // Check if version already exists
    const existing = await db
      .select()
      .from(patchNotes)
      .where(eq(patchNotes.version, patch.version))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  Skipped: ${patch.title} (${patch.version}) — already exists`);
      skipped++;
      continue;
    }

    await db.insert(patchNotes).values(patch);
    console.log(`  Added: ${patch.title} (${patch.version})`);
    added++;
  }

  console.log(`\nSeed complete: ${added} added, ${skipped} skipped`);

  // Verify
  const all = await db.select().from(patchNotes).orderBy(desc(patchNotes.id));
  console.log(`Total patch notes in DB: ${all.length}`);
  for (const note of all) {
    console.log(`  - ${note.title} (v${note.version}) [${note.date}]`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
