import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminSource = readFileSync(
  new URL("./TournamentControlRoom.tsx", import.meta.url),
  "utf8"
);
const viewerSource = readFileSync(
  new URL("./TournamentControlViewer.tsx", import.meta.url),
  "utf8"
);

describe("Tournament Control Room guide and zoom rail UI", () => {
  it("uses the updated desktop PC control guide wording", () => {
    expect(adminSource).toContain("PC Controls");
    expect(adminSource).not.toContain("PC Control Key");
    expect(adminSource).toContain("Drag empty board");
    expect(adminSource).toContain("Pan around the bracket");
    expect(adminSource).toContain("+ / − or Shift + wheel");
    expect(adminSource).toContain("Zoom in and out");
    expect(adminSource).toContain("W A S D");
    expect(adminSource).toContain("Move around the canvas");
    expect(adminSource).toContain("Right-click empty board");
    expect(adminSource).toContain("Add a team or lobby");
    expect(adminSource).toContain("Select connection, press Del");
    expect(adminSource).toContain("Remove connection");
    expect(adminSource).toContain("Locked — click Unlock to reposition");
    expect(adminSource).toContain("Unlocked — drag this header to reposition");
  });

  it("keeps colored W/L legends in viewer and admin experiences", () => {
    expect(viewerSource).toContain('className="font-black text-[#FFD700]"');
    expect(viewerSource).toContain("Winner");
    expect(viewerSource).toContain('className="font-black text-slate-100"');
    expect(viewerSource).toContain("Loser");
    expect(adminSource).toContain('aria-label="Admin connector legend"');
    expect(adminSource).toContain('className="font-black text-[#FFD700]"');
    expect(adminSource).toContain("Winners");
    expect(adminSource).toContain('className="font-black text-slate-100"');
    expect(adminSource).toContain("Losers");
    expect(adminSource).not.toContain("W winners · L losers");
  });

  it("anchors the controlled options menu without using the drag button as a Radix trigger", () => {
    expect(adminSource).toContain(
      "onPointerDownCapture={event => event.preventDefault()}"
    );
    expect(adminSource).toContain("open={zoomRailMenuOpen}");
    expect(adminSource).toContain("suppressZoomRailClickRef");
    expect(adminSource).toContain("hasPointerExceededDragThreshold");
    expect(adminSource).toContain("setZoomRailMenuOpen(open => !open)");
  });

  it("keeps existing keyboard shortcuts alongside WASD movement handling", () => {
    expect(adminSource).toContain('event.key === "Escape"');
    expect(adminSource).toContain(
      '["Backspace", "Delete"].includes(event.key)'
    );
    expect(adminSource).toContain(
      '["0", "Backspace", "Delete"].includes(event.key)'
    );
    expect(adminSource).toContain("setPlacement.mutate");
    expect(adminSource).toContain("isKeyboardPanKeyCode(event.code)");
    expect(adminSource).toContain(
      'window.addEventListener("keyup", handleKeyUp)'
    );
    expect(adminSource).toContain(
      'window.addEventListener("blur", stopKeyboardPan)'
    );
  });

  it("adds compact labels to the admin zoom rail while preserving current actions", () => {
    expect(adminSource).toContain("Options");
    expect(adminSource).toContain("Move");
    expect(adminSource).toContain("Undo");
    expect(adminSource).toContain("Zoom In");
    expect(adminSource).toContain("Zoom Out");
    expect(adminSource).toContain("Fit");
    expect(adminSource).toContain("Snap to Grid");
    expect(adminSource).toContain("Delete All Connections");
    expect(adminSource).toContain("Return All Teams to Available");
    expect(adminSource).toContain("Wipe Canvas");
  });
});

describe("Tournament Control Room staff invite toolbar", () => {
  it("replaces the inline staff panel with the required compact toolbar order", () => {
    expect(adminSource).toContain("Invite Staff");
    expect(adminSource).toContain("Copy Viewer Link");
    expect(adminSource).toContain("Save Template");
    expect(adminSource).toContain("← Tournament Rooms");
    expect(adminSource).not.toContain("Staff Invite</Button>");
    expect(adminSource).not.toContain('Active invite:{" "}');

    const inviteIndex = adminSource.indexOf("Invite Staff");
    const viewerIndex = adminSource.indexOf("Copy Viewer Link", inviteIndex);
    const templateIndex = adminSource.indexOf("Save Template", viewerIndex);
    const roomsIndex = adminSource.indexOf("← Tournament Rooms", templateIndex);
    expect(inviteIndex).toBeGreaterThan(-1);
    expect(viewerIndex).toBeGreaterThan(inviteIndex);
    expect(templateIndex).toBeGreaterThan(viewerIndex);
    expect(roomsIndex).toBeGreaterThan(templateIndex);
  });

  it("keeps invite management hidden behind a compact Radix dropdown", () => {
    const staffTriggerIndex = adminSource.indexOf("Invite Staff");
    const contentIndex = adminSource.indexOf(
      "DropdownMenuContent",
      staffTriggerIndex
    );
    expect(adminSource).toContain("DropdownMenuTrigger asChild");
    expect(contentIndex).toBeGreaterThan(staffTriggerIndex);
    expect(adminSource).toContain("w-80 border-neon-gold/30 bg-black p-3");
    expect(adminSource).toContain("max-h-44 space-y-2 overflow-y-auto");
  });

  it("shows the correct staff invite actions for inactive and active invite states", () => {
    expect(adminSource).toContain("Create & Copy Invite Link");
    expect(adminSource).toContain("Staff invite active");
    expect(adminSource).toContain("Regenerate & Copy Link");
    expect(adminSource).toContain("Revoke Invite");
    expect(adminSource).toContain("invalidates the previous unclaimed invite");
  });

  it("keeps staff members and empty state inside the management surface", () => {
    const contentIndex = adminSource.indexOf("DropdownMenuContent");
    expect(adminSource.indexOf("Staff Members", contentIndex)).toBeGreaterThan(
      contentIndex
    );
    expect(adminSource.indexOf("Remove", contentIndex)).toBeGreaterThan(
      contentIndex
    );
    expect(
      adminSource.indexOf("No staff members have joined yet", contentIndex)
    ).toBeGreaterThan(contentIndex);
  });

  it("moves the score and drag instructions onto a full-width row", () => {
    expect(adminSource).toContain(
      "basis-full rounded border border-white/10 bg-white/5"
    );
    expect(adminSource).toContain("Click team + 1–4 score");
  });
});

const serverSource = readFileSync(
  new URL("../../../server/tournamentControl.ts", import.meta.url),
  "utf8"
);

describe("Tournament Control Room staff invite permissions and security", () => {
  it("keeps staff management owner-only and does not expose stored raw tokens", () => {
    expect(serverSource).toContain(
      "await getOwnedTournamentOrThrow(db, tournamentId, user)"
    );
    expect(serverSource).toContain("tokenHash: hashToken(token)");
    expect(serverSource).toContain("path: null");
    expect(serverSource).toContain("hasActiveInvite: true");
    expect(serverSource).toContain("const STAFF_INVITE_TTL_DAYS = 7");
  });
});
