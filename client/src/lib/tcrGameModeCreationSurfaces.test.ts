import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tournamentGameModeList } from "../../../shared/finalsGameModes";

const toolbarSource = readFileSync(
  new URL("../components/tcr/TcrToolbar.tsx", import.meta.url),
  "utf8"
);
const inspectorSource = readFileSync(
  new URL("../components/tcr/TcrInspector.tsx", import.meta.url),
  "utf8"
);
const roomSource = readFileSync(
  new URL("../pages/TournamentControlRoom.tsx", import.meta.url),
  "utf8"
);

describe("TCR game-mode creation surfaces", () => {
  it("drives the toolbar, Board panel, and context menu from the shared mode list", () => {
    expect(toolbarSource).toContain("tournamentGameModeList.map(mode =>");
    expect(inspectorSource).toContain("tournamentGameModeList.map(mode =>");
    expect(roomSource).toContain("tournamentGameModeList.map(mode =>");

    for (const mode of tournamentGameModeList) {
      expect(mode.nodeLabel).toBeTruthy();
      expect(mode.teamsPerLobby).toBeGreaterThan(0);
      expect(mode.activePlayersPerTeam).toBeGreaterThan(0);
    }
  });

  it("passes each shared typed identifier through the generic creation callback", () => {
    expect(toolbarSource).toContain(
      "onClick={() => props.onCreateGame(mode.id)}"
    );
    expect(inspectorSource).toContain(
      "onClick={() => props.onCreateGame(mode.id)}"
    );
    expect(inspectorSource).toContain(
      "onCreateGame: (gameType: TournamentGameType) => void"
    );
    expect(inspectorSource).not.toContain("onCreateCashoutLobby");
    expect(inspectorSource).not.toContain("onCreateFinalRoundMatch");
    expect(roomSource).toContain("gameType: mode.id");
  });

  it("preserves center and clicked-position placement and finalized guards", () => {
    expect(
      roomSource.match(/position: getCanvasCenterPoint\(\)/g)
    ).toHaveLength(2);
    expect(roomSource).toContain(
      "position: snapWindowsToGrid\n                          ? snapCanvasPointToGrid(canvasMenuPosition)\n                          : canvasMenuPosition"
    );
    expect(toolbarSource).toContain("disabled={props.isFinalized}");
    expect(inspectorSource).toContain("{!props.isFinalized && (");
    expect(roomSource).toContain("disabled={isFinalizedLocked}");
  });
});
