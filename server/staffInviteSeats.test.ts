import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { STAFF_INVITE_SEAT_OPTIONS } from "../shared/const";

/**
 * Staff invite seats.
 *
 * A staff link used to admit exactly one person, and creating a new one
 * revoked the previous link, so inviting three people meant three links in
 * sequence — on event day, with three people waiting. A link now carries a
 * seat count chosen when it is issued.
 *
 * The claim is a single UPDATE guarded in its WHERE clause, which is the
 * part that must not regress: read-then-write would let two people take the
 * last seat at the same moment, and the cost of that is an unintended
 * collaborator on the board.
 */

const source = readFileSync(
  new URL("./tournamentControl.ts", import.meta.url),
  "utf8"
);

describe("seat options", () => {
  it("offers a small ladder and no unlimited option", () => {
    expect([...STAFF_INVITE_SEAT_OPTIONS]).toEqual([1, 5, 10, 25]);
    // Unlimited would make a forwarded link a standing invitation.
    expect(STAFF_INVITE_SEAT_OPTIONS).not.toContain(0);
    expect(STAFF_INVITE_SEAT_OPTIONS).not.toContain(Infinity);
  });

  it("defaults to one person, so existing links behave as they did", () => {
    expect(STAFF_INVITE_SEAT_OPTIONS[0]).toBe(1);
    expect(source).toContain("maxUses = 1");
  });

  it("validates against the shared list rather than its own copy", () => {
    expect(source).toContain('from "@shared/const"');
    expect(source).toContain("STAFF_INVITE_SEAT_OPTIONS");
  });
});

describe("claiming a seat", () => {
  const claim = source.slice(
    source.indexOf("UPDATE tournament_staff_invite_links\n      SET useCount")
  );

  it("counts the seat and closes the link in one statement", () => {
    const statement = claim.slice(0, claim.indexOf("`"));
    expect(statement).toContain("useCount = useCount + 1");
    expect(statement).toContain(
      "status = CASE WHEN useCount + 1 >= maxUses THEN 'accepted' ELSE 'active' END"
    );
  });

  /**
   * The guard belongs in the WHERE clause. If the seat count were checked
   * in JavaScript before the update, two concurrent accepts could both pass
   * the check and both write.
   */
  it("guards the last seat in the database, not in application code", () => {
    const statement = claim.slice(0, claim.indexOf("`"));
    expect(statement).toContain("AND useCount < maxUses");
    expect(statement).toContain("AND status = 'active'");
    expect(statement).toContain("AND expiresAt > NOW()");
  });

  it("keeps the first acceptor rather than overwriting them", () => {
    const statement = claim.slice(0, claim.indexOf("`"));
    expect(statement).toContain("acceptedByUserId = COALESCE(acceptedByUserId,");
  });

  it("still rejects a fully used link", () => {
    expect(source).toContain("This staff invite has already been fully used.");
  });
});

describe("migration", () => {
  const migration = readFileSync(
    new URL("../drizzle/0037_staff_invite_uses.sql", import.meta.url),
    "utf8"
  );

  it("adds both columns with defaults that preserve current behaviour", () => {
    expect(migration).toContain("`maxUses` int DEFAULT 1 NOT NULL");
    expect(migration).toContain("`useCount` int DEFAULT 0 NOT NULL");
  });

  it("is registered in the journal, or drizzle-kit would skip it", () => {
    const journal = readFileSync(
      new URL("../drizzle/meta/_journal.json", import.meta.url),
      "utf8"
    );
    expect(journal).toContain("0037_staff_invite_uses");
  });
});
