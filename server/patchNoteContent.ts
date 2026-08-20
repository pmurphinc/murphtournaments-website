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
    id: -1160,
    title: "Update 11.6.0",
    date: "2026.08.20",
    version: "11.6.0",
    url: "https://www.reachthefinals.com/patchnotes/11-60",
    sourceUrl: "https://www.reachthefinals.com/patchnotes/11-60",
    isGameUpdate: 1,
    content: `THE FINALS — Update 11.6.0 | SPACE MAYHEM

Update 11.6.0 brings back a space-themed limited-time mode, launches a new reward-wheel event and Twitch drops, adds new store/DLC sets, makes a broad balance pass across gadgets, specializations and weapons, addresses two anti-cheat/Windows notices, upgrades the game to Unreal Engine 5.7, and includes fixes across animation, audio, cosmetics, gameplay, maps, social, stability, UI and weapons.

LTM | Orbital Hitters

• Orbital Hitters returns the Heavy Hitters-style brawl with Sledgehammers and space-themed knockback gameplay.
• Contestants use the available tools and arena hazards to knock opponents out of the fight and off the Arena.

Event | Deep Signal

• ENGIMO sponsors a new reward Wheel event running for two weeks.
• Players can earn up to three tickets per day by completing contracts.
• The Wheel contains more than 20 rewards.
• Landing on a duplicate converts that spot into a Golden Ticket.
• A Golden Ticket guarantees the next spin awards a new item.

DLC | Sugar Shocker / Sugar Crasher Sets

• The Sugar Shocker and Sugar Crasher DLC sets add robotic-feline themed cosmetics.
• Each set includes an outfit, a Legendary BFR Titan skin with charm, a Legendary emote, and 2,400 Multibucks.

Store | Hullwalker Set

• The Hullwalker Set adds a vacuum/space-work themed cosmetic set built around a sealed helmet and outer-space styling.

Twitch | Beyond Boundaries

• Watch THE FINALS streams with Drops Enabled to earn the new Beyond Boundaries cosmetics.
• 1 hour: Connection Complete Sticker.
• 2 hours: Link Established Charm.
• 4 hours: Meteor Tips Earrings.
• Drops are available through September 3, 2026.

Game Update | Balance Changes

Gadgets
• Lockbolt: reload animation duration decreased from 2.2s to 1.75s; ammo restock timing during the reload moved from 1.3s to 1.1s. This is a quality-of-life change intended to make the gadget smoother to use.

Specializations
• Dematerializer: cooldown decreased from 20s to 15s per charge; item raise time decreased from 0.1s to 0s. Embark wants the specialization to feel more responsive and return to a more viable Medium playstyle.
• Evasive Dash: cooldown decreased from 6.5s to 6s per charge, partially easing the restriction from prior balance changes.
• Guardian Turret: activation time decreased from 3.5s to 3s; health increased from 280 to 300; remote-retrieve cooldown decreased from 17.5s to 10s. Hand pickup remains a 3s cooldown and destroyed-turret cooldown remains 35s. The goal is to improve higher-skill viability without making the Turret oppressive for newer players.

Weapons
• AKM: damage increased from 20 to 21 to bring it closer to FAMAS/FCAR performance.
• ARN-220: fire rate increased from 725 RPM to 750 RPM; quick reload animation decreased from 0.75s to 0.66s; empty reload decreased from 2.73s to 2.7s. The goal is to bring it closer to the XP-54 and M11.
• BFR Titan: damage falloff multiplier increased from 0.65 to 0.7, improving ranged damage and reinforcing its longer-range Heavy niche.
• Cerberus 12GA: pellet damage increased from 8 to 9, raising full-shot damage from 104 to 117. This offsets some of the combo power lost when Quick Melee damage was reduced.
• Dagger — Primary: base damage increased from 42 to 49; precise damage increased from 60 to 70; lunge duration increased from 0.15s to 0.22s. Backstab: base damage increased from 75 to 85; backstab damage increased from 337 to 340; secondary lunge duration increased from 0.22s to 0.32s. Embark continues to tune Season 11 melee reliability while broader lunge-networking improvements are investigated.
• Dual Blades: primary Precision zone angle increased from 9° to 12°, making precise hits easier to land, particularly on the second strike.
• KS-23: damage falloff multiplier decreased from 0.675 to 0.58; falloff start range decreased from 18m to 12m; falloff end range decreased from 23m to 22m. The weapon is now less effective at medium-to-long range so the BFR Titan has more room in its intended niche.
• M11: hip-fire recoil increased by approximately 75%; ADS recoil increased by approximately 25%; ADS bullet dispersion in most movement stances increased by 25%; airborne ADS dispersion increased by 120%. The change reduces the M11's effective range and overlap with ARN-220/XP-54 engagement distances.
• Recurve Bow: maximum-draw damage increased from 124 to 126; base damage remains 60. The change restores Quick Melee combo breakpoints lost in the Season 11 melee adjustment.
• Riot Shield — Primary: base damage increased from 58 to 60; precise damage increased from 83 to 86; the intended primary lunge increase from 4.25m to 5m, previously listed in 11.3 but not working, is now fixed. Shield Bash: damage increased from 40 to 50; environmental damage increased from 50 to 100; lunge duration increased from 0.5s to 0.6s. Embark still wants Riot Shield to be a defense-first objective anchor, but its elimination potential had fallen too far.
• Spear — Primary: damage sweep box increased by 60%; lunge distance increased from 5m to 6.5m; lunge duration increased from 0.3s to 0.45s; lunge speed increased by 50%. Spin Attack: reset delay before returning to the first attack increased from 0.2s to 0.35s so players have more time to continue the sequence after connecting.
• XP-54: recoil curve updated so it no longer jumps downward when a full magazine is fired in one burst; airborne ADS bullet dispersion decreased by 8%. These are quality-of-life consistency improvements.

Notice | Anti-Cheat

• A recently deployed anti-cheat rule incorrectly flagged some gyro-controller users as cheaters.
• Embark updated the rule and is automatically reversing affected bans; impacted players do not need to submit an appeal.
• Gyro remains a legitimate and supported input method.
• Embark says its testing process has been adjusted to catch this class of false positive before future enforcement rules go live.

Notice | INPOUTX64.SYS

• Some players may see a startup message requiring the INPOUTX64.SYS driver to be uninstalled after Update 11.6.0.
• The issue is related to Windows update KB5121003.
• Embark directs affected players to its official uninstall instructions and support channels if they encounter problems.

Game Update | Bug Fixes

Animation
• Corrected a small ADS animation offset on the Schwarzschild Blackhole SR-84.
• Fixed deploy animations that did not blend out smoothly.
• Fixed Quick Melee kicks failing to cancel correctly when swapping items.
• Fixed Light and Heavy leg-placement misalignment in the Vesper Salute Emote.

Audio
• Improved end-of-round music reliability when the audio mix is busy.
• The SFX Volume slider now also controls replay sound.
• Fixed revive-interaction audio that could keep looping after a round ended.
• Fixed timing for the Star Team emote sound.

Cosmetics
• Fixed some skin trackers showing outdated values.
• Fixed the House Lights Flashbang skin not showing its light state correctly to other Contestants.
• Fixed some Gateway skins displaying incorrect materials.
• Fixed Recurve Bow visual effects failing to load for certain skins.
• Improved the Burn Notice Pyro Grenade inspect animation and adjusted its audio level.

Gameplay
• Achievement progression is disabled in bot game modes.
• Fixed a rare Winch Claw case where it could attach without pulling the target.

Maps | Kyoto
• Improved stair collision to prevent Contestants falling through.
• Fixed a location where players could become stuck between a cliff and bamboo.
• Fixed a weak point that allowed a building to be destroyed too easily.

Maps | Galaxy Estates
• Fixed several wall-dressing areas that did not take damage correctly, improving wall destruction from all angles.
• Added a ladder above the covered walkway from Astral Port to Cosmo Physique for access to the highest roof level.
• Adjusted the outer-wall exhaustion vents on Cosmo Physique so they work more reliably for climbing and added more vents to create additional high-ground contest routes.

Maps | Skyway Stadium
• Fixed wall dressing that could fail to take damage correctly, improving wall destruction consistency.

Maps | Fangwai City
• Fixed floating decals/signs that could remain after destruction and corrected a floating sign.

Maps | Las Vegas
• Fixed visual flickering on surfaces in the parking garage.

Maps | Las Vegas Stadium
• Fixed environment and lighting issues.

Practice Range
• Fixed the Cashbox Time-Trial challenge spawning Vaults instead of Cashboxes directly.

Performance
• Upgraded Unreal Engine from 5.3 to 5.7.

Social
• Party invites can now be sent and accepted while matchmaking.
• Fixed the Social screen showing a normal team name and insignia for spectators in Private Match.

Stability
• Fixed a crash when spectating at the end of a round.
• Fixed a rare server crash caused when a player's connection stopped acknowledging network packets.

UI
• Contextual response prompts are now hidden while dead or spectating, when replies are unavailable.
• Fixed the event HUD displaying incorrectly when moving to the next round in Cashout Bots.
• Fixed the Active Events bar remaining visible after a round reset.
• Fixed damage numbers reporting one extra damage in some scenarios.
• Fixed gamepad navigation in Options getting stuck or skipping items.
• Added spectator-only team colors for Private Match; these extra colors are hidden from normal team-color selection.
• Fixed gamepad navigation on the gamepad-bindings page.
• Fixed Killcam UI failing to appear after elimination in Practice Range.

Weapons | Bug Fixes
• Dual Blades: fixed primary attacks not consistently dealing 25 environmental damage.
• Dual Blades Deflect: fixed wide-angle Deflect incorrectly blocking all damage instead of only the center of the Deflect radius; imprecise Deflect damage modifier changed from 0% to 20%, while precise Deflect changed from 20% to 0%.
• Riot Shield: fixed missing third-person visual and sound effects when attacks impact the shield.`,
  },
  {
    id: -1130,
    title: "Update 11.3.0",
    date: "2026.07.30",
    version: "11.3.0",
    url: "https://www.reachthefinals.com/patchnotes/11-30",
    sourceUrl: "https://www.reachthefinals.com/patchnotes/11-30",
    isGameUpdate: 1,
    content: `THE FINALS — Update 11.3.0

Balance Changes

Gadgets
• C4: cooldown increased from 30s to 45s. The longer cooldown reduces how often Heavy teams can use C4 during a Cashout fight.

Specializations
• Grappling Hook: cooldown decreased from 7s to 6s. This is a small usage buff that avoids larger changes that could disrupt map pacing or split teams.

Weapons
• BFR: damage increased from 88 to 90 to improve its performance against other Heavy weapons.
• Dagger: primary and secondary lunge distance increased from 4.5m to 5m; max lunge speed increased slightly; secondary sweep time increased slightly so backstabs connect more reliably at maximum lunge distance.
• Dual Blades: Precision zone angle increased from 8° to 9°; primary lunge distance increased from 4.5m to 5m; max lunge speed increased slightly; Cross Slash now lunges forward at full Stamina even without forward input; Deflect movement speed increased by 25%.
• FAMAS: damage increased from 23 to 24 to bring it closer to the main cluster of Medium weapons.
• KS-23: damage decreased from 110 to 104; damage falloff multiplier increased from 0.64 to 0.675 so maximum-range damage remains consistent. The weapon retains part of its Season 11 close-range buff while losing several combo and DPS breakpoints.
• Riot Shield: Precision zone angle increased from 9° to 10°; primary lunge distance increased from 4.25m to 5m; primary damage increased from 82 to 83; Shield Bash now lunges forward at full Stamina without requiring forward input.
• Spear: primary precise damage increased from 74 to 82; primary base damage increased from 55 to 57; secondary swing sequence increased from 75/100/125 to 75/125/150.

Bug Fixes

Gadgets
• Dome Shield: fixed friendly melee attacks damaging the shield.`,
  },
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

Gadgets
• APS Turret: projectile blocks increased from 5 to 6; health increased from 160 to 175; cooldown no longer regenerates while deployed; manual retrieve now gives 5s cooldown, remote retrieve 15s, destroyed APS 30s.
• Breach Charge: deployed arm time decreased from 1.5s to 1s.
• Data Reshaper: can reshape Gateways to immediately disable them.
• Hover Pad: health increased from 350 to 425.

Melee Weapons
• General: Stamina and Precision systems were added. Stamina controls lunge access and regenerates over time or on precise hits; Precision zones deal critical damage while glancing hits deal reduced damage.
• Dagger: stamina recovery set to 2s; primary precise damage remains 60 and glancing damage is 42; attack movement speed reduced; sweep range reduced by about 0.5m; lunge distance increased from 3m to 4.5m; lunge target angle decreased from 25° to 20°; Precision angle set to 9°; Backstab multiplier increased from 4.26 to 4.5, charge time reduced from 0.8s to 0.65s, pushback added, and lunge distance increased from 3m to 4.5m.
• Dual Blades: stamina recovery set to 3s; three-hit sequence replaced by two double-swipes; old 50x2, 60x2, and 100 sequence replaced by 57x2 precise and 39x2 glancing; lunge remains 4.5m; lunge target angle decreased from 25° to 20°; Precision angle set to 8°; Deflect movement speed reduced by 50%; Deflect damage multiplier increased from 0.1 to 0.2; Cross Slash added with 140 precise damage, 84 glancing damage, 5m lunge, pushback, and 8° Precision angle.
• Quick Melee: damage decreased from 40 to 25; contextual Kick added at full Stamina with about 5m knockback; Kick stamina recovery set to 2.5s; knockback against hold-interaction targets reduced to about 1m.
• Riot Shield: stamina recovery set to 3s; old 90 primary damage replaced by 82 precise and 57 glancing; sweep range reduced by 0.5m; lunge increased from 3m to 4m; lunge target angle decreased from 40° to 20°; Precision angle set to 9°; Shield Block collision now provides full frontal protection, blocking movement speed reduced by 25%, melee-block reliability improved; Shield Bash added with 40 damage, about 3m lunge, and about 5m knockback.
• Sledgehammer: stamina recovery set to 2s; primary old 100 damage replaced by 120 precise and 90 glancing; primary lunge increased from 4.5m to 5m; lunge target angle decreased from 25° to 20°; Precision angle set to 10°; secondary old 175 damage replaced by 200 precise and 150 glancing; secondary pushback added; secondary lunge increased from 4.5m to 5m; secondary Precision angle set to 10°.
• Spear: stamina recovery set to 3s; primary animation sequence reduced from three attacks to two; old 65/80/90 scaling sequence replaced by 74 precise and 55 glancing; lunge decreased from 7.5m to 5m; lunge target angle decreased from 30° to 20°; Precision angle set to 8°; old secondary spin of 100 damage per spin for three spins over 2.66s replaced by three spins dealing 75, 100, and 126 damage with 0.8s, 0.75s, and 1.1s spin durations.
• Sword: stamina recovery set to 2s; old 88 primary damage replaced by 110 precise and 71 glancing; primary sweep updated; lunge increased from 3m to 4.25m; lunge target angle decreased from 25° to 20°; Precision angle set to 9°; secondary lunge now requires Stamina for max range, with stamina lunge increased from about 9m to about 10m and no-stamina lunge set to about 5m; forward clamp angle increased from 40° to 110°.

Specializations
• Cloaking Device: minimum cloak duration decreased from about 13s to about 11s; energy consumption changed so below-run-speed movement uses the minimum consumption rate and run-speed-or-faster movement uses the maximum consumption rate.
• Evasive Dash: charges decreased from 3 to 2; cooldown decreased from 7.5s to 6.5s.
• Winch Claw: minimum victim stun decreased from 0.25s to 0.1s; destination movement lock decreased from 0.15s to 0.1s; user act delay after grabbing decreased from 0.25s to 0.1s.

Weapons
• .50 Akimbo: damage increased from 44 to 46.
• 93R: damage decreased from 25 to 24; ammo count increased from 21 to 27.
• FCAR: fire rate decreased from 540 RPM to 530 RPM.
• KS-23: damage increased from 100 to 110; damage falloff multiplier decreased from 0.70 to 0.64 so ranged damage stays similar after the close-range buff.
• M134 Minigun: dispersion decreased in all aim states by 10%; dispersion scales up less aggressively during quick camera movement; environmental damage increased from 30 to 35.
• Model 1887: pellet damage increased from 12 to 13.
• Pike-556: headshot damage multiplier increased from 1.5 to 1.75.

Item Progression
• Item XP earn rates were increased for Cloaking Device, Dematerializer, Evasive Dash, Healing Beam, Mesh Shield, Shockwave, Winch Claw, Anti-Gravity Cube, APS Turret, C4, Data Reshaper, Defibrillator, Dome Shield, Explosive Mine, Frag Grenade, Gas Grenade, Gas Mine, Gateway, Glitch Grenade, H+ Infuser, Healing Emitter, Lockbolt, Nullifier, Proximity Sensor, and Vanishing Bomb.

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
