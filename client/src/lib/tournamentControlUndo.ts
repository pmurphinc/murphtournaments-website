export type BoardUndoSnapshotForRebase = { expectedRevision: number } & Record<
  string,
  unknown
>;

export type BoardUndoHistoryEntryForRebase =
  | {
      kind: "board";
      snapshot: BoardUndoSnapshotForRebase;
      label: string;
    }
  | ({ kind: "ui"; label: string } & Record<string, unknown>);

export function rebaseBoardUndoHistoryAfterRestore<
  T extends BoardUndoHistoryEntryForRebase,
>(history: readonly T[], boardRevision: number): T[] {
  const remaining = history.slice(1);
  const [next, ...rest] = remaining;
  if (next?.kind !== "board") return remaining;
  return [
    {
      ...next,
      snapshot: { ...next.snapshot, expectedRevision: boardRevision },
    } as T,
    ...rest,
  ];
}
