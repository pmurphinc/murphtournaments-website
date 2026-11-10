import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Claiming a slot with a team you already have.
 *
 * Claiming used to mint a new managed team every time, so a captain who
 * already ran a roster got a second, near-empty copy of it and no way to
 * enter the team they actually play with. The claim page now asks, and the
 * mutation takes either an existing team id or a name for a new one.
 *
 * Owning several teams is intended here — that part was a deliberate call,
 * not a bug — so this is about letting someone *choose*, not about stopping
 * them having more than one.
 *
 * Three things carry real consequence and are asserted below:
 *
 *  1. **Captain only.** Entering a team in a tournament commits everyone on
 *     it. A member who is not the captain must not be able to do that from
 *     a link someone forwarded them.
 *  2. **Not twice.** The same managed team must not end up in two slots of
 *     one tournament, and the check has to sit inside the board lock —
 *     outside it, two links claimed at the same moment both pass.
 *  3. **One or the other.** A payload carrying both a name and an existing
 *     id is ambiguous about intent and is refused rather than guessed at.
 *
 * Assertions run against source text because this suite has no database.
 * Comments are stripped first: the prose here and in tournamentControl.ts
 * names every identifier being matched, so matching the raw file would pass
 * on documentation alone.
 */

const raw = readFileSync(
  new URL("./tournamentControl.ts", import.meta.url),
  "utf8"
);

/** Source with block and line comments removed. */
const code = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");

/** The body of a top-level function, up to the next one. */
function functionBody(name: string) {
  const start = code.indexOf(`async function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = code.indexOf("\nasync function ", start + 1);
  return code.slice(start, next === -1 ? undefined : next);
}

const accept = functionBody("acceptTeamClaimLink");
const list = functionBody("listClaimableTeamsForToken");

describe("the claim mutation takes a team or a name", () => {
  it("accepts an existing team id", () => {
    expect(code).toContain("existingTeamId?: number");
    expect(code).toContain(
      "existingTeamId: z.number().int().positive().optional()"
    );
  });

  it("refuses a payload carrying both", () => {
    expect(code).toContain(
      ".refine(value => !(value.name && value.existingTeamId)"
    );
  });

  it("still creates a new team when given a name", () => {
    expect(accept).toContain(
      "const claimedName = requestedName?.trim() || row.team.name;"
    );
    expect(accept).toContain("createManagedTeamSlug(claimedName)");
  });

  it("links whichever team was chosen to the slot, once", () => {
    expect(accept).toContain(".set({ managedTeamId })");
    expect(accept.match(/\.update\(teams\)/g)?.length).toBe(1);
  });
});

describe("attaching an existing team is captain-only", () => {
  it("matches the team on its captain, not just its id", () => {
    expect(accept).toContain("eq(managedTeams.id, existingTeamId)");
    expect(accept).toContain("eq(managedTeams.captainUserId, user.id)");
  });

  it("refuses when the person is not the captain", () => {
    expect(accept).toContain(
      "You can only enter a team you are the captain of."
    );
  });

  it("does not accept mere membership", () => {
    // A roster member must not commit the team from a forwarded link, so
    // the lookup must not reach the membership table at all.
    const guard = accept.slice(
      accept.indexOf("if (existingTeamId !== undefined)"),
      accept.indexOf("managedTeamId = owned.id;")
    );
    expect(guard.length).toBeGreaterThan(0);
    expect(guard).not.toContain("managedTeamMembers");
  });
});

describe("the same team cannot take two slots", () => {
  it("looks for the team already being in this tournament", () => {
    expect(accept).toContain("eq(teams.tournamentId, resolved.tournamentId)");
    expect(accept).toContain("eq(teams.managedTeamId, existingTeamId)");
    expect(accept).toContain("That team is already in this tournament.");
  });

  it("checks it inside the board lock, not before", () => {
    // Outside the lock this is a read-then-write: two links claimed in the
    // same moment would both see no clash and both attach.
    const lock = accept.indexOf("lockTournamentForBoardMutation");
    const clash = accept.indexOf("eq(teams.managedTeamId, existingTeamId)");
    expect(lock).toBeGreaterThan(-1);
    expect(clash).toBeGreaterThan(lock);
  });
});

describe("the page is offered the right teams", () => {
  it("lists only teams this person captains", () => {
    expect(list).toContain("eq(managedTeams.captainUserId, user.id)");
    expect(list).not.toContain("managedTeamMembers");
  });

  it("flags a team already in the tournament instead of hiding it", () => {
    // Dropping it silently reads as "my team is gone" to the one person
    // most likely to go looking for it.
    expect(list).toContain("alreadyEntered: enteredIds.has(team.id)");
    expect(list).not.toContain("filter(team => !enteredIds");
  });

  it("scopes the already-entered lookup to this tournament", () => {
    expect(list).toContain("eq(teams.tournamentId, resolved.tournamentId)");
  });

  it("needs a real claim link", () => {
    expect(list).toContain("Claim link not found.");
  });

  it("is signed-in only", () => {
    expect(code).toContain("listClaimableTeams: protectedProcedure");
  });
});
