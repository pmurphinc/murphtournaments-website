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
    expect(adminSource).toContain("Click group header");
    expect(adminSource).toContain("Select group");
    expect(adminSource).toContain("Ctrl/Shift + click group header");
    expect(adminSource).toContain("Add/remove group selection");
    expect(adminSource).toContain("Drag group header");
    expect(adminSource).toContain("Move group");
    expect(adminSource).toContain("Right-click group header");
    expect(adminSource).toContain("Group options");
    expect(adminSource).toContain("Select connection, press Del");
    expect(adminSource).toContain("Remove connection");
    expect(adminSource).toContain(
      'type ZoomRailActivePanel = "options" | "rounds" | "controls" | "score" | null'
    );
    expect(adminSource).toContain(
      "const [zoomRailActivePanel, setZoomRailActivePanel]"
    );
    expect(adminSource).toContain('zoomRailActivePanel === "controls"');
    expect(adminSource).toContain('zoomRailActivePanel === "score"');
    expect(adminSource).toContain("Scoreboard");
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

  it("launches Options, Groups, and PC Controls from one zoom rail shared panel", () => {
    expect(adminSource).toContain(
      "onPointerDownCapture={event => event.preventDefault()}"
    );
    expect(adminSource).toContain("suppressZoomRailClickRef");
    expect(adminSource).toContain("hasPointerExceededDragThreshold");
    expect(adminSource).toContain('aria-controls="zoom-rail-shared-panel"');
    expect(adminSource).toContain('zoomRailActivePanel === "options"');
    expect(adminSource).toContain('zoomRailActivePanel === "rounds"');
    expect(adminSource).toContain('zoomRailActivePanel === "controls"');
    expect(adminSource).toContain('zoomRailActivePanel === "score"');
    expect(adminSource).toContain("Scoreboard");
    expect(adminSource).toContain('panel === "rounds" ? null : "rounds"');
    expect(adminSource).toContain('panel === "controls" ? null : "controls"');
    expect(adminSource).toContain('panel === "score" ? null : "score"');
  });

  it("places Groups and PC Controls after the W/L legend and keeps the selected count badge", () => {
    const legendIndex = adminSource.indexOf(
      'aria-label="Admin connector legend"'
    );
    const roundsIndex = adminSource.indexOf('title="Groups"', legendIndex);
    const controlsIndex = adminSource.indexOf(
      'title="PC Controls"',
      roundsIndex
    );
    expect(legendIndex).toBeGreaterThan(-1);
    expect(roundsIndex).toBeGreaterThan(legendIndex);
    expect(controlsIndex).toBeGreaterThan(roundsIndex);
    expect(adminSource).toContain("selectedRoundGameIds.size > 0");
    expect(adminSource).toContain(
      "Groups panel, ${selectedRoundGameIds.size} games selected"
    );
  });

  it("removes obsolete independent Rounds rail and draggable/minimizable PC Controls window", () => {
    expect(adminSource).not.toContain("roundRailPosition");
    expect(adminSource).not.toContain("roundRailCollapsed");
    expect(adminSource).not.toContain("startRoundRailDrag");
    expect(adminSource).not.toContain("controlKeyPosition");
    expect(adminSource).not.toContain("controlKeyLocked");
    expect(adminSource).not.toContain("controlKeyMinimized");
    expect(adminSource).not.toContain("startControlKeyDrag");
    expect(adminSource).not.toContain("Locked — click Unlock to reposition");
    expect(adminSource).not.toContain(
      "Unlocked — drag this header to reposition"
    );
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
    expect(adminSource).toContain("Create Group");
    expect(adminSource).toContain("Rename Group");
    expect(adminSource).toContain("Add Selected");
    expect(adminSource).toContain("Remove From Group");
    expect(adminSource).toContain("Clear Selection");
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

const adminIndexSource = readFileSync(
  new URL("./TournamentControlIndex.tsx", import.meta.url),
  "utf8"
);
const personalIndexSource = readFileSync(
  new URL("./PersonalTcrIndex.tsx", import.meta.url),
  "utf8"
);

describe("Tournament Control Room round lobby selection", () => {
  it("removes the obsolete persistent round selection mode and button text", () => {
    expect(adminSource).not.toContain("selectionMode");
    expect(adminSource).not.toContain("setSelectionMode");
    expect(adminSource).not.toContain("Select Rounds");
    expect(adminSource).not.toContain("Selection On");
  });

  it("toggles round lobby selection directly with Control or Shift click", () => {
    expect(adminSource).toContain("event.ctrlKey || event.shiftKey");
    expect(adminSource).toContain(
      "if (next.has(game.id)) next.delete(game.id);"
    );
    expect(adminSource).toContain("else next.add(game.id);");
  });

  it("clears selected round lobbies on unmodified background clicks without clearing after canvas drags", () => {
    expect(adminSource).toContain("const isBackgroundClick =");
    expect(adminSource).toContain("!panStart.dragged");
    expect(adminSource).toContain("!event.ctrlKey");
    expect(adminSource).toContain("!event.shiftKey");
    expect(adminSource).toContain("setSelectedRoundGameIds(new Set())");
    expect(adminSource).toContain("panStart.dragged = true");
    expect(adminSource).toContain("hasPointerExceededDragThreshold(");
  });

  it("keeps selected count and all round-management actions", () => {
    expect(adminSource).toContain("selectedRoundGameIds.size} selected");
    expect(adminSource).toContain("Create Group");
    expect(adminSource).toContain("Rename Group");
    expect(adminSource).toContain("Add Selected");
    expect(adminSource).toContain("Remove From Group");
    expect(adminSource).toContain("Clear Selection");
  });

  it("documents the new group-selection controls in the guide and Groups panel", () => {
    expect(adminSource).toContain("Ctrl/Shift + click lobby");
    expect(adminSource).toContain("Select lobbies for groups");
    expect(adminSource).toContain("Click empty board");
    expect(adminSource).toContain("Clear lobby selection");
    expect(adminSource).toContain("Click group header");
    expect(adminSource).toContain("Ctrl/Shift + click group header");
    expect(adminSource).toContain("Right-click group header");
  });

  it("renders group headers as a separate interactive layer above connection lines", () => {
    expect(adminSource).toContain('data-round-group-header="true"');
    expect(adminSource).toContain("absolute z-0 rounded-xl");
    expect(adminSource).toContain(
      'className="absolute inset-0 z-[1] overflow-visible"'
    );
    expect(adminSource).toContain("absolute z-[2] touch-none");
    expect(adminSource).toContain("frame.x + 20");
    expect(adminSource).toContain("frame.y - 28");
  });

  it("uses real group selection state and separates group click from drag", () => {
    expect(adminSource).toContain("getNextRoundGroupSelection");
    expect(adminSource).toContain("setSelectedRoundGameIds(current =>");
    expect(adminSource).toContain("selectRoundGroup(");
    expect(adminSource).toContain("event.ctrlKey || event.shiftKey");
    expect(adminSource).toContain("dragStart.dragged");
    expect(adminSource).toContain("hasPointerExceededDragThreshold(");
    expect(adminSource).toContain("if (!dragged) return;");
  });

  it("prevents group context menus from falling through to the board menu", () => {
    expect(adminSource).toContain(
      "event.target.closest('[data-round-group-header=\"true\"]')"
    );
    expect(adminSource).toContain("Select Color");
    expect(adminSource).toContain("Organize Lobbies");
    expect(adminSource).toContain("Delete Group");
  });
});

describe("Tournament Control Room alpha badge", () => {
  it("appears on personal index, admin index, and active control room headings", () => {
    for (const source of [personalIndexSource, adminIndexSource, adminSource]) {
      expect(source).toContain("ALPHA");
      expect(source).toContain("Tournament Control Room is a work in progress");
      expect(source).toContain("border-[#FFD700]/60");
    }
  });
});

describe("Tournament Control Room zoom persistence", () => {
  it("initializes zoom from overlay preferences and persists every zoom state change centrally", () => {
    expect(adminSource).toContain(
      "const [zoom, setZoom] = useState(\n    () => readControlRoomOverlayPreferences().zoom ?? defaultZoom\n  );"
    );
    expect(adminSource).toContain(
      "writeControlRoomOverlayPreferences({ zoom });"
    );
    expect(adminSource).toContain("}, [zoom]);");
  });

  it("merges overlay preference writes so zoom and zoomRailY do not erase each other", () => {
    expect(adminSource).toContain(
      "const current = readControlRoomOverlayPreferences();"
    );
    expect(adminSource).toContain(
      "JSON.stringify({ ...current, ...preferences })"
    );
    expect(adminSource).toContain(
      "writeControlRoomOverlayPreferences({ zoomRailY });"
    );
  });
});
