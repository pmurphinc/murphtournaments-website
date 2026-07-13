import { describe, expect, it } from "vitest";
import { rebaseBoardUndoHistoryAfterRestore } from "./tournamentControlUndo";

describe("tournament control undo revision rebasing", () => {
  it("rebases three sequential board undos to the revision returned by each restore", () => {
    let history = [
      {
        kind: "board" as const,
        label: "third",
        snapshot: { expectedRevision: 3, games: [3] },
      },
      {
        kind: "board" as const,
        label: "second",
        snapshot: { expectedRevision: 2, games: [2] },
      },
      {
        kind: "board" as const,
        label: "first",
        snapshot: { expectedRevision: 1, games: [1] },
      },
    ];

    history = rebaseBoardUndoHistoryAfterRestore(history, 4);
    expect(history.map(entry => entry.label)).toEqual(["second", "first"]);
    expect(history[0].snapshot.expectedRevision).toBe(4);
    expect(history[0].snapshot.games).toEqual([2]);

    history = rebaseBoardUndoHistoryAfterRestore(history, 5);
    expect(history.map(entry => entry.label)).toEqual(["first"]);
    expect(history[0].snapshot.expectedRevision).toBe(5);
    expect(history[0].snapshot.games).toEqual([1]);

    history = rebaseBoardUndoHistoryAfterRestore(history, 6);
    expect(history).toEqual([]);
  });

  it("does not rebase through a UI-only undo entry", () => {
    const history = [
      {
        kind: "board" as const,
        label: "board",
        snapshot: { expectedRevision: 3 },
      },
      { kind: "ui" as const, label: "selection", state: { selectedGameId: 1 } },
      {
        kind: "board" as const,
        label: "older",
        snapshot: { expectedRevision: 2 },
      },
    ];

    expect(rebaseBoardUndoHistoryAfterRestore(history, 4)).toEqual(
      history.slice(1)
    );
  });
});
