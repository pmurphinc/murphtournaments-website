import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A renamed team keeps its new name everywhere it is still playing.
 *
 * `teams.name` is only ever the name a row was created with: a placeholder
 * the organiser generated ("Team 3"), or a copy of the managed team's name
 * taken when it registered. Nothing updated it afterwards, so a captain who
 * renamed in Team Management went on showing under the old name in every
 * tournament they were already entered in — and a claimed placeholder stayed
 * "Team 3" forever, because claiming never asked for a name at all.
 *
 * The fix reads the name live from the managed team instead of copying it.
 * That makes two things load-bearing, and both are asserted here:
 *
 *  1. Every display query must select through `teamDisplayName` AND join
 *     `managedTeams`. The helper references a column from that table, so a
 *     select that forgets the join is not a wrong name — it is a SQL error
 *     at runtime, on a page the public can reach.
 *  2. The two places that are *meant* to be frozen must stay frozen: the
 *     placeholder generator reads raw names to continue "Team N" numbering,
 *     and finished standings keep a snapshot so history does not get
 *     rewritten under a rename.
 *
 * These assertions run against the source text because there is no database
 * in this suite. Comments are stripped first — the prose above and in
 * tournamentControl.ts mentions every identifier being matched, so matching
 * against the raw file would pass on the documentation alone.
 */

const raw = readFileSync(
  new URL("./tournamentControl.ts", import.meta.url),
  "utf8"
);

/**
 * Source with block and line comments removed.
 *
 * Deliberately no CRLF normalisation: `.gitattributes` pins the whole repo
 * to LF precisely so assertions like these can match multi-line source, and
 * a normalise here would paper over a tool that wrote the file back wrong.
 */
const code = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");

const occurrences = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1;

describe("the live name helper", () => {
  it("is defined once, falling back to the row's own name", () => {
    expect(
      occurrences(
        code,
        "const teamDisplayName = sql<string>`COALESCE(${managedTeams.name}, ${teams.name})`"
      )
    ).toBe(1);
  });

  it("is not something the test invented", () => {
    // Guards the strip above: if the helper only existed in a comment, the
    // assertion before this one would have been matching prose.
    expect(occurrences(raw, "teamDisplayName")).toBeGreaterThan(
      occurrences(code, "teamDisplayName")
    );
    expect(occurrences(code, "teamDisplayName")).toBeGreaterThanOrEqual(4);
  });
});

describe("every display query reads the live name", () => {
  it("serves the control room board and its viewer through it", () => {
    expect(code).toContain(
      `managedTeamId: teams.managedTeamId,
          name: teamDisplayName,`
    );
  });

  it("serves the shared viewer bracket through it, with the join", () => {
    expect(code).toContain(
      `.select({ id: teams.id, name: teamDisplayName, frp: teams.frp })
        .from(teams)
        .leftJoin(managedTeams, eq(teams.managedTeamId, managedTeams.id))`
    );
  });

  it("serves the public tournament page through it, with the join", () => {
    expect(code).toContain(
      `.select({ id: teams.id, name: teamDisplayName })
        .from(teams)
        .leftJoin(managedTeams, eq(teams.managedTeamId, managedTeams.id))`
    );
  });

  it("names the team in the Discord lobby message by its live name", () => {
    expect(code).toContain("teamName: row.managedTeam?.name ?? row.team.name,");
  });

  it("leaves no display select reading the stored name directly", () => {
    // The placeholder generator is the one legitimate reader and has its own
    // test below; it is the only `name: teams.name` the file should hold.
    expect(occurrences(code, "name: teams.name")).toBe(1);
  });
});

describe("claiming a team takes the captain's own name", () => {
  it("accepts a name on the mutation, bounded to the column width", () => {
    expect(code).toContain("name: z.string().trim().min(2).max(64).optional()");
    expect(code).toContain(
      "acceptTeamClaimLink(input.token, ctx.user, input.name)"
    );
  });

  it("falls back to the placeholder when no name is sent", () => {
    expect(code).toContain(
      "const claimedName = requestedName?.trim() || row.team.name;"
    );
  });

  it("writes the name to the managed team, and derives the slug from it", () => {
    expect(code).toContain(
      "const baseSlug = createManagedTeamSlug(claimedName)"
    );
    expect(code).toContain(
      ".values({ name: claimedName, slug, captainUserId: user.id })"
    );
  });

  it("never copies the name back onto the tournament row", () => {
    // A copy would be a second name to go stale on the next rename, which
    // is the whole bug. The only write to `teams` here is the link-up.
    expect(code).toContain(".set({ managedTeamId: managedTeam.id })");
    expect(code).not.toContain("set({ name: claimedName");
    expect(code).not.toContain("name: claimedName, frp");
  });
});

describe("what stays frozen stays frozen", () => {
  it("numbers new placeholders from the stored names", () => {
    // Reading live names here would let a captain's rename change what the
    // next generated placeholder is called.
    expect(code).toContain(".select({ name: teams.name })");
  });

  it("snapshots the name into finished standings", () => {
    // A finished tournament should read the way it did on the day.
    expect(code).toContain("teamNameSnapshot");
    expect(code).toContain("${team.name}, ${team.frp}");
  });

  it("still freezes the map ban it was entered with", () => {
    expect(code).toContain(
      "mapBanId: sql<\n            string | null\n          >`COALESCE(${teams.mapBanId}, ${managedTeams.mapBanId})`"
    );
  });
});
