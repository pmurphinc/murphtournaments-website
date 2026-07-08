import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveConnectionDropTargetGameId } from "../pages/TournamentControlRoom";

class FakeElement {
  dataset: Record<string, string> = {};
  parent: FakeElement | null = null;
  closest = vi.fn((selector: string) => {
    if (selector !== "[data-connection-target-game-id], [data-input-port-game-id]") return null;
    let current: FakeElement | null = this;
    while (current) {
      if (current.dataset.connectionTargetGameId || current.dataset.inputPortGameId) return current;
      current = current.parent;
    }
    return null;
  });
}

describe("resolveConnectionDropTargetGameId", () => {
  const originalHTMLElement = globalThis.HTMLElement;
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalHTMLElement) vi.stubGlobal("HTMLElement", originalHTMLElement);
  });

  it("resolves a lobby frame from any child inside it", () => {
    vi.stubGlobal("HTMLElement", FakeElement);
    const frame = new FakeElement();
    frame.dataset.connectionTargetGameId = "42";
    const child = new FakeElement();
    child.parent = frame;
    expect(resolveConnectionDropTargetGameId(child as unknown as EventTarget, 7)).toBe(42);
  });

  it("keeps the existing top-dot target behavior", () => {
    vi.stubGlobal("HTMLElement", FakeElement);
    const dot = new FakeElement();
    dot.dataset.inputPortGameId = "12";
    expect(resolveConnectionDropTargetGameId(dot as unknown as EventTarget, 7)).toBe(12);
  });

  it("does not allow self-connections", () => {
    vi.stubGlobal("HTMLElement", FakeElement);
    const frame = new FakeElement();
    frame.dataset.connectionTargetGameId = "7";
    expect(resolveConnectionDropTargetGameId(frame as unknown as EventTarget, 7)).toBeNull();
  });
});
