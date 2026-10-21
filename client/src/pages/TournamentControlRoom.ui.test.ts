import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relative: string) =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

const adminSource = read("./TournamentControlRoom.tsx");
const viewerSource = read("./TournamentControlViewer.tsx");
const adminIndexSource = read("./TournamentControlIndex.tsx");
const personalIndexSource = read("./PersonalTcrIndex.tsx");
const serverSource = read("../../../server/tournamentControl.ts");

const topBarSource = read("../components/tcr/TcrTopBar.tsx");
const toolbarSource = read("../components/tcr/TcrToolbar.tsx");
const inspectorSource = read("../components/tcr/TcrInspector.tsx");
const helpSource = read("../components/tcr/TcrHelpDialog.tsx");
const lobbyNodeSource = read("../components/tcr/TcrLobbyNode.tsx");
const teamsPanelSource = read("../components/tcr/TcrTeamsPanel.tsx");

describe("Tournament Control Room workspace shell", () => {
  it("composes the page from the extracted workspace components", () => {
    for (const component of [
      "TcrTopBar",
      "TcrToolbar",
      "TcrTeamsPanel",
      "TcrInspector",
      "TcrHelpDialog",
      "TcrLobbyNode",
    ]) {
      expect(adminSource).toContain(`<${component}`);
    }
  });

  it("no longer ships the floating zoom rail, draggable overlays, or detached touch help", () => {
    for (const removed of [
      "zoomRailActivePanel",
      "zoomRailY",
      "startZoomRailDrag",
      "touchHelpOpen",
      "Touch Ops",
      "Touch Help",
      "roundRailPosition",
      "controlKeyPosition",
      "PC Controls",
    ]) {
      expect(adminSource).not.toContain(removed);
    }
  });

  it("docks panels beside the canvas on desktop and uses a dismissible sheet below it", () => {
    expect(adminSource).toContain("useIsDesktop");
    expect(adminSource).toContain("shrink-0 border-r border-white/10");
    expect(adminSource).toContain("shrink-0 border-l border-white/10");
    expect(adminSource).toContain("mobileDockOpen");
    expect(adminSource).toContain('aria-label="Close selection details"');
    expect(adminSource).toContain('aria-label="Selection details"');
  });

  it("reveals the mobile dock automatically once something is selected", () => {
    expect(adminSource).toContain(
      'if (isDesktop || selectionKind === "board") return;'
    );
    expect(adminSource).toContain("setMobileDockOpen(true);");
  });
});

describe("Tournament Control Room toolbar", () => {
  it("groups the everyday board tools into one labelled toolbar", () => {
    expect(toolbarSource).toContain('role="toolbar"');
    expect(toolbarSource).toContain('aria-label="Board tools"');
    expect(toolbarSource).toContain('aria-label="Add team or lobby"');
    expect(toolbarSource).toContain("New Team…");
    expect(toolbarSource).toContain("tournamentGameModeList.map");
    expect(toolbarSource).toContain('label="Undo last board change"');
    expect(toolbarSource).toContain('shortcut="Ctrl+Z"');
    expect(toolbarSource).toContain('label="Zoom in"');
    expect(toolbarSource).toContain('label="Zoom out"');
    expect(toolbarSource).toContain("props.zoomPercent");
    expect(toolbarSource).toContain("props.fitLabel");
    expect(toolbarSource).toContain('"Snap to grid: on"');
    expect(toolbarSource).toContain('label="Help and controls"');
  });

  it("keeps destructive board resets behind a menu that asks to confirm", () => {
    expect(toolbarSource).toContain('aria-label="Board reset actions"');
    expect(toolbarSource).toContain("Delete All Connections…");
    expect(toolbarSource).toContain("Return All Teams to Available…");
    expect(toolbarSource).toContain("Wipe Canvas…");
    expect(toolbarSource).toContain("tcrDangerMenuItemClass");
    // Each reset opens a confirmation dialog rather than firing immediately.
    expect(adminSource).toContain('type: "bulk-delete-connections"');
    expect(adminSource).toContain('type: "bulk-return-teams"');
    expect(adminSource).toContain('type: "bulk-wipe-canvas"');
  });

  it("exposes panel toggles with counts and pressed state", () => {
    expect(toolbarSource).toContain("aria-pressed={active}");
    expect(toolbarSource).toContain("props.teamCount");
    expect(toolbarSource).toContain("Available Teams");
    expect(toolbarSource).toContain("Inspect and Scoreboard panel");
  });
});

describe("Tournament Control Room top bar", () => {
  it("keeps tournament identity, status, and rename in the compact header", () => {
    expect(topBarSource).toContain("props.tournamentName");
    expect(topBarSource).toContain("props.eventStatus");
    expect(topBarSource).toContain("props.currentStage");
    expect(topBarSource).toContain('aria-label="Rename tournament"');
    expect(topBarSource).toContain('aria-label="Back to Tournament Rooms"');
  });

  it("keeps viewer sharing, templates, finalization, and unlock reachable", () => {
    expect(topBarSource).toContain("Copy Viewer Link");
    expect(topBarSource).toContain("Regenerate Viewer Link…");
    expect(topBarSource).toContain("Save Template");
    expect(topBarSource).toContain("Finalize");
    expect(topBarSource).toContain("Unlock for Editing…");
    expect(topBarSource).toContain("finalizedSummary");
  });

  it("keeps invite management behind a compact staff menu", () => {
    expect(topBarSource).toContain('aria-label="Manage staff"');
    expect(topBarSource).toContain("Create & Copy Invite Link");
    expect(topBarSource).toContain("Staff invite active");
    expect(topBarSource).toContain("Regenerate & Copy Link");
    expect(topBarSource).toContain("Revoke Invite");
    expect(topBarSource).toMatch(/invalidates\s+the previous unclaimed invite/);
    expect(topBarSource).toContain("Staff Members");
    expect(topBarSource).toContain("No staff members have joined yet");
    expect(topBarSource).toContain("canManageStaff");
  });

  it("only offers staff management to owners and admins", () => {
    expect(adminSource).toContain("const canManageStaff = Boolean(");
    expect(adminSource).toContain('auth.user.role === "admin"');
    expect(adminSource).toContain(
      "query.data.tournament.ownerUserId === auth.user.id"
    );
    expect(adminSource).toContain("canManageStaff={canManageStaff}");
  });
});

describe("Tournament Control Room inspector", () => {
  it("renders a context-sensitive section for every selection kind", () => {
    for (const section of [
      "function LobbySection",
      "function AssignmentSection",
      "function ConnectionSection",
      "function GroupSection",
      "function BoardSection",
      "function ScoreboardSection",
    ]) {
      expect(inspectorSource).toContain(section);
    }
  });

  it("resolves the selected object with a stable priority", () => {
    expect(adminSource).toContain('kind: "assignment"');
    expect(adminSource).toContain('kind: "connection"');
    expect(adminSource).toContain('kind: "lobby"');
    expect(adminSource).toContain('kind: "group"');
    expect(adminSource).toContain('return { kind: "board" };');
  });

  it("keeps lobby settings, placements, and group management available", () => {
    expect(inspectorSource).toContain("Auto-fill open slots");
    expect(inspectorSource).toContain("Set Lobby Code");
    expect(inspectorSource).toContain("Set Broadcast");
    expect(inspectorSource).toContain("Remove Assigned Teams");
    expect(inspectorSource).toContain("Delete Lobby…");
    expect(inspectorSource).toContain("Danger zone");
    expect(inspectorSource).toContain("formatPlacement(placement)");
    expect(inspectorSource).toContain("Return to Available Teams");
    expect(inspectorSource).toContain("Delete Connection");
    expect(inspectorSource).toContain("Create Group");
    expect(inspectorSource).toContain("Remove Selected From Group");
    expect(inspectorSource).toContain("Clear Selection");
    expect(inspectorSource).toContain("Set group color to");
    expect(inspectorSource).toContain("Organize");
  });

  it("pairs status colour with a readable label and an icon", () => {
    expect(inspectorSource).toContain("gameStatusLabels");
    expect(inspectorSource).toContain("statusMeta");
    expect(inspectorSource).toContain("aria-pressed={active}");
    expect(lobbyNodeSource).toContain("statusIcons");
    expect(lobbyNodeSource).toContain("gameStatusLabels[game.status]");
  });

  it("hosts the scoreboard as a dock tab with a champion marker", () => {
    expect(inspectorSource).toContain('role="tablist"');
    expect(inspectorSource).toContain("Scoreboard");
    expect(inspectorSource).toContain("championTeamId");
  });
});

describe("Tournament Control Room help", () => {
  it("consolidates mouse, keyboard, selection, and touch guidance in one dialog", () => {
    expect(helpSource).toContain("Drag empty board");
    expect(helpSource).toContain("Pan around the bracket");
    expect(helpSource).toContain("Move around the canvas");
    expect(helpSource).toContain("Undo the last board change");
    expect(helpSource).toContain("Long-press a team, lobby, or group header");
    expect(helpSource).toContain("Pinch with two fingers to zoom the board.");
    expect(helpSource).toContain("Double-tap an assigned team");
    expect(helpSource).toContain('"Esc"');
  });

  it("explains the W/L connectors with colour plus words in admin and viewer", () => {
    expect(helpSource).toContain("ports send winners forward");
    expect(helpSource).toContain("losers to a lower bracket");
    expect(viewerSource).toContain('className="font-black text-[#FFD700]"');
    expect(viewerSource).toContain("Winner");
    expect(viewerSource).toContain('className="font-black text-slate-100"');
    expect(viewerSource).toContain("Loser");
  });

  it("tells organizers how to recover a bracket they have lost track of", () => {
    expect(helpSource).toContain("lose track of the bracket");
    expect(helpSource).toContain("Fit");
  });
});

describe("Tournament Control Room lobby node", () => {
  it("keeps connector ports, drag handles, and drop targets with accessible names", () => {
    expect(lobbyNodeSource).toContain('data-connector-port="true"');
    expect(lobbyNodeSource).toContain('data-port="top"');
    expect(lobbyNodeSource).toContain('data-port="bottom"');
    expect(lobbyNodeSource).toContain("data-flow-type={flowType}");
    expect(lobbyNodeSource).toContain('data-node-drag-handle="true"');
    expect(lobbyNodeSource).toContain(
      "data-connection-target-game-id={game.id}"
    );
    expect(lobbyNodeSource).toContain("input port");
    expect(lobbyNodeSource).toContain("Drag to connect");
  });

  it("keeps the full lobby context menu", () => {
    for (const item of [
      "Rename Game",
      "Set/Clear Lobby Code",
      "Set/Clear Broadcast Link",
      "Remove Assigned Teams",
      "Delete Game",
    ]) {
      expect(lobbyNodeSource).toContain(item);
    }
    expect(lobbyNodeSource).toContain("Mark {status}");
    expect(lobbyNodeSource).toContain("Reopen Game as {status}");
  });

  it("keeps auto-fill and lobby-code delivery on the card", () => {
    expect(lobbyNodeSource).toContain("Auto-fill Lobby");
    expect(lobbyNodeSource).toContain("Lobby code DMs");
    expect(lobbyNodeSource).toContain("Send Code to Lobby");
    expect(lobbyNodeSource).toContain("Copy Lobby Messages");
    expect(lobbyNodeSource).toContain("Copy Message");
  });
});

describe("Tournament Control Room teams panel", () => {
  it("keeps team creation, claim links, deletion, and the return drop zone", () => {
    expect(teamsPanelSource).toContain("Available Teams");
    expect(teamsPanelSource).toContain("New Team");
    expect(teamsPanelSource).toContain("onCreateClaimLink");
    expect(teamsPanelSource).toContain("onDeleteTeam");
    expect(teamsPanelSource).toContain("onReturnDragOver");
    expect(teamsPanelSource).toContain("onReturnDrop");
    expect(teamsPanelSource).toContain("No teams are available");
    expect(adminSource).toContain("removeTeam.mutate(");
  });
});

describe("Tournament Control Room keyboard controls", () => {
  it("keeps the existing shortcuts alongside WASD canvas movement", () => {
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

  it("keeps Ctrl+Z bound to undo", () => {
    expect(adminSource).toContain('event.key.toLowerCase() !== "z"');
    expect(adminSource).toContain("undoBoardAction()");
  });

  it("clears the group selection with Escape as well", () => {
    const escapeIndex = adminSource.indexOf('event.key === "Escape"');
    expect(escapeIndex).toBeGreaterThan(-1);
    const escapeBlock = adminSource.slice(escapeIndex, escapeIndex + 400);
    expect(escapeBlock).toContain("setSelectedRoundGameIds(new Set())");
  });
});

describe("Tournament Control Room round lobby selection", () => {
  it("has no persistent selection mode left over from the old rail", () => {
    expect(adminSource).not.toContain("selectionMode");
    expect(adminSource).not.toContain("Select Rounds");
    expect(adminSource).not.toContain("Selection On");
  });

  it("toggles lobby selection directly with Control or Shift click", () => {
    expect(adminSource).toContain("event.ctrlKey || event.shiftKey");
    expect(adminSource).toContain(
      "if (next.has(game.id)) next.delete(game.id);"
    );
    expect(adminSource).toContain("else next.add(game.id);");
  });

  it("clears the selection on a plain background click but not after a drag", () => {
    expect(adminSource).toContain("const isBackgroundClick =");
    expect(adminSource).toContain("!panStart.dragged");
    expect(adminSource).toContain("!event.ctrlKey");
    expect(adminSource).toContain("!event.shiftKey");
    expect(adminSource).toContain("setSelectedRoundGameIds(new Set())");
    expect(adminSource).toContain("panStart.dragged = true");
    expect(adminSource).toContain("hasPointerExceededDragThreshold(");
  });

  it("routes group actions through the inspector selection", () => {
    expect(adminSource).toContain("onCreateGroup=");
    expect(adminSource).toContain("onRenameGroup={openGroupRenameDialog}");
    expect(adminSource).toContain("onAddSelectedToGroup={addSelectedToGroup}");
    expect(adminSource).toContain("onRemoveFromGroup=");
    expect(adminSource).toContain("onClearGroupSelection=");
  });

  it("renders group headers above the connection layer and keeps their menu", () => {
    expect(adminSource).toContain('data-round-group-header="true"');
    expect(adminSource).toContain("absolute z-0 rounded-xl");
    expect(adminSource).toContain(
      'className="absolute inset-0 z-[1] overflow-visible"'
    );
    expect(adminSource).toContain("absolute z-[2] touch-none");
    expect(adminSource).toContain("getNextRoundGroupSelection");
    expect(adminSource).toContain("selectRoundGroup(");
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
  it("appears on the personal index, admin index, and the control room top bar", () => {
    for (const source of [
      personalIndexSource,
      adminIndexSource,
      topBarSource,
    ]) {
      expect(source).toContain("ALPHA");
      expect(source).toContain("Tournament Control Room is a work in progress");
    }
  });
});

describe("Tournament Control Room view persistence", () => {
  it("initializes zoom from stored preferences and persists every change", () => {
    expect(adminSource).toContain(
      "const [zoom, setZoom] = useState(\n    () => readControlRoomOverlayPreferences().zoom ?? defaultZoom\n  );"
    );
    expect(adminSource).toContain(
      "writeControlRoomOverlayPreferences({ zoom });"
    );
    expect(adminSource).toContain("}, [zoom]);");
  });

  it("remembers which docks were open", () => {
    expect(adminSource).toContain(
      "() => readControlRoomOverlayPreferences().teamsPanelOpen ?? true"
    );
    expect(adminSource).toContain(
      "() => readControlRoomOverlayPreferences().inspectorOpen ?? true"
    );
    expect(adminSource).toContain(
      "writeControlRoomOverlayPreferences({ teamsPanelOpen: teamsOpen });"
    );
    expect(adminSource).toContain(
      "writeControlRoomOverlayPreferences({ inspectorOpen });"
    );
  });

  it("merges preference writes so one setting cannot erase another", () => {
    expect(adminSource).toContain(
      "const current = readControlRoomOverlayPreferences();"
    );
    expect(adminSource).toContain(
      "JSON.stringify({ ...current, ...preferences })"
    );
  });
});

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

describe("Team approval rejection UI", () => {
  it("only reveals the rejection note after Reject is selected", () => {
    expect(adminIndexSource).toContain("activeRejectSubmissionId");
    expect(adminIndexSource).toContain("Confirm Rejection");
    expect(adminIndexSource).toContain(
      "setActiveRejectSubmissionId(submission.id)"
    );
    expect(adminIndexSource).toContain(
      'submission.status === "rejected" && submission.adminNote'
    );
  });
});
