export const VOD_ANALYSIS_EVENT_TYPES = [
  "death",
  "tap",
  "plug",
  "cashout",
  "team_wipe",
  "team_spawn",
  "steal_flip",
  "revive",
  "defib",
] as const;

export type VodAnalysisEventType = (typeof VOD_ANALYSIS_EVENT_TYPES)[number];

export const VOD_CASHOUT_LABELS = ["A", "B", "C", "D", "E"] as const;
export const VOD_VAULT_LABELS = ["1", "2", "3", "4", "5", "6"] as const;

export type VodCashoutLabel = (typeof VOD_CASHOUT_LABELS)[number];
export type VodVaultLabel = (typeof VOD_VAULT_LABELS)[number];
export type VodEventTargetKind = "player" | "cashout" | "vault" | "none";

export const VOD_ANALYSIS_EVENT_LABELS: Record<VodAnalysisEventType, string> = {
  death: "Death",
  tap: "Tap",
  plug: "Plug",
  cashout: "Cashout",
  team_wipe: "Team Wipe",
  team_spawn: "Team Spawn",
  steal_flip: "Steal / Flip",
  revive: "Revive",
  defib: "Defib",
};

export const VOD_ANALYSIS_EVENT_REQUIRED_FIELDS: Record<
  VodAnalysisEventType,
  Array<"actorLabel" | "targetLabel" | "teamLabel">
> = {
  death: ["actorLabel", "targetLabel"],
  tap: ["actorLabel", "targetLabel", "teamLabel"],
  plug: ["actorLabel", "targetLabel", "teamLabel"],
  cashout: ["targetLabel", "teamLabel"],
  team_wipe: ["actorLabel", "teamLabel"],
  team_spawn: ["teamLabel"],
  steal_flip: ["targetLabel", "teamLabel"],
  revive: ["actorLabel", "targetLabel", "teamLabel"],
  defib: ["actorLabel", "targetLabel", "teamLabel"],
};

export function getVodEventTargetKind(
  eventType: VodAnalysisEventType
): VodEventTargetKind {
  if (eventType === "tap") return "vault";
  if (
    eventType === "cashout" ||
    eventType === "steal_flip" ||
    eventType === "plug"
  ) {
    return "cashout";
  }
  if (
    eventType === "death" ||
    eventType === "revive" ||
    eventType === "defib"
  ) {
    return "player";
  }

  return "none";
}

export function isVodAnalysisEventType(
  value: unknown
): value is VodAnalysisEventType {
  return (
    typeof value === "string" &&
    VOD_ANALYSIS_EVENT_TYPES.includes(value as VodAnalysisEventType)
  );
}

export function parseVodEventTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const match = /^(\d{1,3}):(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds > 59) return null;

  return minutes * 60 + seconds;
}

export function formatVodEventTimestamp(timestampSeconds: number): string {
  const safeTimestamp = Math.max(0, Math.floor(timestampSeconds));
  const minutes = Math.floor(safeTimestamp / 60);
  const seconds = safeTimestamp % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
