import { describe, expect, it } from "vitest";
import { explainDiscordDmFailure } from "./discordDm";

/**
 * What an organiser reads when a lobby-code DM does not arrive.
 *
 * This used to be `Discord DM failed (403)`. The status alone cannot tell
 * a captain who never joined the server apart from a bad bot token, and
 * the person reading it is mid-event with a lobby waiting on them. Discord
 * sends a reason in the body; the bare status threw it away.
 *
 * The case that matters is 50007. A bot can only DM someone it shares a
 * server with — a Discord platform rule, not something the site can
 * configure around — so for a tournament run off a Discord community,
 * "they are not in the server" is the usual cause and the only one the
 * organiser can act on.
 *
 * These are real assertions against the exported function, not source-text
 * matching: the mapping is pure, so it can just be called.
 */

describe("cannot send messages to this user (50007)", () => {
  const message = explainDiscordDmFailure(403, {
    code: 50007,
    message: "Cannot send messages to this user",
  });

  it("says to join the Discord server", () => {
    expect(message).toContain("tournament Discord server");
  });

  it("also names the DM privacy setting, which membership alone does not fix", () => {
    expect(message).toContain("direct messages from server members");
  });

  it("points at the way the code still gets sent", () => {
    expect(message).toContain("Copy Message");
  });

  it("does not leave the reader staring at a status code", () => {
    expect(message).not.toMatch(/^Discord DM failed \(\d+\)\.?$/);
  });

  it("explains it the same way whichever call Discord refused", () => {
    // Opening the DM channel and posting to it both return 50007, and the
    // difference is meaningless to the person reading the toast.
    expect(explainDiscordDmFailure(403, { code: 50007 })).toBe(message);
  });
});

describe("the other failures an organiser can act on", () => {
  it("separates a dead account from a blocked one", () => {
    const message = explainDiscordDmFailure(404, { code: 10013 });
    expect(message).toContain("does not recognise that account");
    expect(message).not.toContain("tournament Discord server");
  });

  it("tells them to wait when Discord is rate limiting", () => {
    expect(explainDiscordDmFailure(429, {})).toContain("rate limiting");
  });

  it("points at the token, not the captain, on a 401", () => {
    const message = explainDiscordDmFailure(401, {});
    expect(message).toContain("DISCORD_BOT_TOKEN");
    // Blaming the captain for a server misconfiguration sends the
    // organiser chasing the wrong person.
    expect(message).not.toContain("captain");
  });
});

describe("anything else still says something useful", () => {
  it("keeps Discord's own wording when there is some", () => {
    const message = explainDiscordDmFailure(400, {
      code: 50035,
      message: "Invalid Form Body",
    });
    expect(message).toContain("400");
    expect(message).toContain("Invalid Form Body");
    expect(message).toContain("Copy Message");
  });

  it("survives a response with no JSON body at all", () => {
    // A gateway error page parses as nothing; the status still has to
    // produce a sentence rather than "undefined".
    const message = explainDiscordDmFailure(502, {});
    expect(message).toContain("502");
    expect(message).not.toContain("undefined");
  });
});
