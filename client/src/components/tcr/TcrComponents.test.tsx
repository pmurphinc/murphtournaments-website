import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TcrInspector, { type TcrInspectorProps } from "./TcrInspector";
import TcrToolbar, { type TcrToolbarProps } from "./TcrToolbar";
import TcrTeamsPanel, { type TcrTeamsPanelProps } from "./TcrTeamsPanel";
import type {
  AssignmentView,
  ControlGameView,
  ControlTeamView,
  InspectorSelection,
} from "./types";

const noop = () => undefined;

const cashoutGame: ControlGameView = {
  id: 1,
  tournamentId: 5,
  gameType: "cashout",
  status: "ready",
  displayLabel: "Lobby A",
  canvasX: 0,
  canvasY: 0,
  privateLobbyCode: "ABC123",
  seriesBestOf: 1,
  mapId: null,
  broadcastUrl: null,
};

const finalGame: ControlGameView = {
  ...cashoutGame,
  id: 2,
  gameType: "final_round",
  displayLabel: "Grand Final",
  seriesBestOf: 3,
};

const teamAlpha: ControlTeamView = { id: 21, name: "Alpha Squad" };
const teamBravo: ControlTeamView = {
  id: 22,
  name: "Bravo Unit",
  managedTeamId: 9,
};
const teamsById = new Map<number, ControlTeamView>([
  [teamAlpha.id, teamAlpha],
  [teamBravo.id, teamBravo],
]);

const assignment: AssignmentView = {
  id: 11,
  gameId: 1,
  teamId: 21,
  slotIndex: 1,
  resultPlacement: 2,
};

function makeInspectorProps(
  selection: InspectorSelection,
  overrides: Partial<TcrInspectorProps> = {}
): TcrInspectorProps {
  return {
    selection,
    isFinalized: false,
    tab: "inspect",
    onTabChange: noop,
    scoreboardRows: [
      {
        teamId: 21,
        teamName: "Alpha Squad",
        wins: 2,
        losses: 1,
        cashoutWins: 2,
        cashoutLosses: 1,
        finalRoundWins: 0,
        finalRoundLosses: 0,
      },
      {
        teamId: 22,
        teamName: "Bravo Unit",
        wins: 0,
        losses: 3,
        cashoutWins: 0,
        cashoutLosses: 3,
        finalRoundWins: 0,
        finalRoundLosses: 0,
      },
    ],
    championTeamId: null,
    teamsById,
    onCreateTeam: noop,
    onCreateCashoutLobby: noop,
    onCreateFinalRoundMatch: noop,
    onOpenHelp: noop,
    onRenameLobby: noop,
    onSetStatus: noop,
    onSetMap: noop,
    onRandomizeMap: noop,
    onSetBestOf: noop,
    onEditLobbyCode: noop,
    onEditBroadcast: noop,
    onAutoFill: noop,
    autoFillPending: false,
    onRemoveAssignedTeams: noop,
    onDeleteLobby: noop,
    onSelectAssignment: noop,
    onSetPlacement: noop,
    onReturnTeamToAvailable: noop,
    onDeleteConnection: noop,
    onCreateGroup: noop,
    onRenameGroup: noop,
    onAddSelectedToGroup: noop,
    onRemoveFromGroup: noop,
    onClearGroupSelection: noop,
    onSetGroupColor: noop,
    onToggleGroupLock: noop,
    onOrganizeGroup: noop,
    onDeleteGroup: noop,
    ...overrides,
  };
}

describe("TcrInspector lobby selection", () => {
  const html = renderToStaticMarkup(
    <TcrInspector
      {...makeInspectorProps({
        kind: "lobby",
        game: cashoutGame,
        assignments: [assignment],
        capacity: 4,
      })}
    />
  );

  it("shows the lobby settings and status controls with text labels", () => {
    expect(html).toContain("Lobby A");
    expect(html).toContain("Status");
    expect(html).toContain("Draft");
    expect(html).toContain("Ready");
    expect(html).toContain("Live");
    expect(html).toContain("Complete");
    expect(html).toContain("aria-pressed");
    expect(html).toContain("Map");
    expect(html).toContain("Randomize map");
    expect(html).toContain("Edit Lobby Code");
    expect(html).toContain("Set Broadcast");
  });

  it("lists assigned teams and keeps destructive actions in a danger zone", () => {
    expect(html).toContain("Alpha Squad");
    expect(html).toContain("Danger zone");
    expect(html).toContain("Remove Assigned Teams");
    expect(html).toContain("Delete Lobby…");
    expect(html).toContain("Auto-fill open slots");
  });
});

describe("TcrInspector final round selection", () => {
  it("offers best-of controls for final round matches", () => {
    const html = renderToStaticMarkup(
      <TcrInspector
        {...makeInspectorProps({
          kind: "lobby",
          game: finalGame,
          assignments: [],
          capacity: 2,
        })}
      />
    );
    expect(html).toContain("Series length");
    expect(html).toContain("Best of 1");
    expect(html).toContain("Best of 3");
    expect(html).toContain("Best of 5");
  });
});

describe("TcrInspector assignment selection", () => {
  const html = renderToStaticMarkup(
    <TcrInspector
      {...makeInspectorProps({
        kind: "assignment",
        assignment,
        game: cashoutGame,
        team: teamAlpha,
        capacity: 4,
        eliminated: false,
      })}
    />
  );

  it("shows visible placement buttons for every slot plus clear", () => {
    expect(html).toContain("Alpha Squad");
    expect(html).toContain("Placement");
    expect(html).toContain("1st");
    expect(html).toContain("2nd");
    expect(html).toContain("3rd");
    expect(html).toContain("4th");
    expect(html).toContain("Clear");
    expect(html).toContain("Return to Available Teams");
  });
});

describe("TcrInspector connection selection", () => {
  it("labels the flow type with text, not just color", () => {
    const html = renderToStaticMarkup(
      <TcrInspector
        {...makeInspectorProps({
          kind: "connection",
          connection: {
            id: 7,
            tournamentId: 5,
            sourceGameId: 1,
            targetGameId: 2,
            flowType: "loser",
          },
          sourceLabel: "Lobby A",
          targetLabel: "Grand Final",
        })}
      />
    );
    expect(html).toContain("Losers advance");
    expect(html).toContain("Lobby A");
    expect(html).toContain("Grand Final");
    expect(html).toContain("Delete Connection");
  });
});

describe("TcrInspector group selection", () => {
  it("offers group creation for an ungrouped selection", () => {
    const html = renderToStaticMarkup(
      <TcrInspector
        {...makeInspectorProps({
          kind: "group",
          gameIds: [1, 2],
          group: null,
        })}
      />
    );
    expect(html).toContain("2 lobbies selected");
    expect(html).toContain("Create Group");
    expect(html).toContain("Clear Selection");
  });

  it("offers full group management for a grouped selection", () => {
    const html = renderToStaticMarkup(
      <TcrInspector
        {...makeInspectorProps({
          kind: "group",
          gameIds: [1, 2],
          group: { id: "g1", label: "Round 1", colorId: "cyan", locked: false },
        })}
      />
    );
    expect(html).toContain("Round 1");
    expect(html).toContain("Rename");
    expect(html).toContain("Lock");
    expect(html).toContain("Add Selected");
    expect(html).toContain("Organize");
    expect(html).toContain("Set group color to gold");
    expect(html).toContain("Remove Selected From Group");
    expect(html).toContain("Delete Group…");
  });
});

describe("TcrInspector board and scoreboard", () => {
  it("shows quick creation actions when nothing is selected", () => {
    const html = renderToStaticMarkup(
      <TcrInspector {...makeInspectorProps({ kind: "board" })} />
    );
    expect(html).toContain("Nothing selected");
    expect(html).toContain("New Team…");
    expect(html).toContain("New Cashout Lobby");
    expect(html).toContain("New Final Round Match");
  });

  it("renders scoreboard rows with wins, losses, and the champion marker", () => {
    const html = renderToStaticMarkup(
      <TcrInspector
        {...makeInspectorProps(
          { kind: "board" },
          { tab: "score", championTeamId: 21 }
        )}
      />
    );
    expect(html).toContain("Alpha Squad");
    expect(html).toContain("2 W");
    expect(html).toContain("1 L");
    expect(html).toContain("Bravo Unit");
    expect(html).toContain("Champion");
  });

  it("hides editing controls when the tournament is finalized", () => {
    const html = renderToStaticMarkup(
      <TcrInspector
        {...makeInspectorProps(
          {
            kind: "lobby",
            game: cashoutGame,
            assignments: [assignment],
            capacity: 4,
          },
          { isFinalized: true }
        )}
      />
    );
    expect(html).not.toContain("Danger zone");
    expect(html).toContain("disabled");
  });
});

describe("TcrToolbar", () => {
  const props: TcrToolbarProps = {
    isFinalized: false,
    onCreateTeam: noop,
    onCreateCashoutLobby: noop,
    onCreateFinalRoundMatch: noop,
    canUndo: true,
    onUndo: noop,
    zoomPercent: 100,
    canZoomIn: true,
    canZoomOut: true,
    onZoomIn: noop,
    onZoomOut: noop,
    onFitToContent: noop,
    fitLabel: "Fit lobbies to view",
    snapToGrid: true,
    onToggleSnap: noop,
    onOpenHelp: noop,
    onBulkDeleteConnections: noop,
    onBulkReturnTeams: noop,
    onBulkWipeCanvas: noop,
    teamCount: 6,
    teamsOpen: true,
    onToggleTeams: noop,
    inspectorOpen: false,
    onToggleInspector: noop,
  };

  it("renders one accessible toolbar with the core board tools", () => {
    const html = renderToStaticMarkup(<TcrToolbar {...props} />);
    expect(html).toContain('role="toolbar"');
    expect(html).toContain("Undo last board change");
    expect(html).toContain("Zoom in");
    expect(html).toContain("Zoom out");
    expect(html).toContain("100%");
    expect(html).toContain("Fit lobbies to view");
    expect(html).toContain("Snap to grid: on");
    expect(html).toContain("Help and controls");
    expect(html).toContain("Board reset actions");
    expect(html).toContain(">6<");
  });
});

describe("TcrTeamsPanel", () => {
  const props: TcrTeamsPanelProps = {
    teams: [teamAlpha, teamBravo],
    isFinalized: false,
    deletePending: false,
    onCreateTeam: noop,
    onTeamDragStart: noop,
    onTeamDragEnd: noop,
    onCreateClaimLink: noop,
    onDeleteTeam: noop,
    onReturnDragOver: noop,
    onReturnDrop: noop,
  };

  it("lists teams with creation, claim-link, and delete affordances", () => {
    const html = renderToStaticMarkup(<TcrTeamsPanel {...props} />);
    expect(html).toContain("Available Teams");
    expect(html).toContain("New Team");
    expect(html).toContain("Alpha Squad");
    expect(html).toContain("Bravo Unit");
    // Only the unmanaged team gets a claim link.
    expect(html).toContain("Copy claim link for Alpha Squad");
    expect(html).not.toContain("Copy claim link for Bravo Unit");
    expect(html).toContain("Delete team Alpha Squad");
    expect(html).toContain("Drag a team onto a lobby slot");
  });

  it("shows the empty state when no teams are available", () => {
    const html = renderToStaticMarkup(<TcrTeamsPanel {...props} teams={[]} />);
    expect(html).toContain("No teams are available");
  });
});
