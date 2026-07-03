import { describe, expect, it, vi } from "vitest";

vi.mock("@/const", () => ({
  getLoginUrl: vi.fn(() => {
    throw new TypeError("Invalid URL");
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {},
}));

const { getLoginUrl } = await import("@/const");
const { resolveAuthRedirectPath } = await import("./useAuth");

describe("resolveAuthRedirectPath", () => {
  it("does not construct the legacy OAuth login URL during normal public rendering", () => {
    expect(() =>
      resolveAuthRedirectPath({ redirectOnUnauthenticated: false })
    ).not.toThrow();
    expect(resolveAuthRedirectPath({ redirectOnUnauthenticated: false })).toBe("");
    expect(getLoginUrl).not.toHaveBeenCalled();
  });

  it("uses explicit redirect paths without constructing the legacy OAuth login URL", () => {
    expect(
      resolveAuthRedirectPath({
        redirectOnUnauthenticated: true,
        redirectPath: "/custom-login",
      })
    ).toBe("/custom-login");
    expect(getLoginUrl).not.toHaveBeenCalled();
  });
});
