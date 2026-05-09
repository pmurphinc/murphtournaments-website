import { describe, expect, it } from "vitest";
import {
  getVodEventTargetKind,
  VOD_CASHOUT_LABELS,
  VOD_VAULT_LABELS,
} from "./events";

describe("VOD event objective helpers", () => {
  it("exposes typed cashout and vault selector constants", () => {
    expect(VOD_CASHOUT_LABELS).toEqual(["A", "B", "C", "D", "E"]);
    expect(VOD_VAULT_LABELS).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("classifies target fields by event type", () => {
    expect(getVodEventTargetKind("cashout")).toBe("cashout");
    expect(getVodEventTargetKind("steal_flip")).toBe("cashout");
    expect(getVodEventTargetKind("plug")).toBe("cashout");
    expect(getVodEventTargetKind("tap")).toBe("vault");
    expect(getVodEventTargetKind("death")).toBe("player");
    expect(getVodEventTargetKind("revive")).toBe("player");
    expect(getVodEventTargetKind("defib")).toBe("player");
    expect(getVodEventTargetKind("team_wipe")).toBe("none");
    expect(getVodEventTargetKind("team_spawn")).toBe("none");
  });
});
