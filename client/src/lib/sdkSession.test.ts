import { describe, expect, it, vi } from "vitest";

async function loadSdkWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  const previousEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const module = await import("../../../server/_core/sdk");
  process.env = previousEnv;
  return module;
}

describe("SDK session tokens", () => {
  it("creates a Discord-compatible session when VITE_APP_ID is absent", async () => {
    const { SDKServer } = await loadSdkWithEnv({
      JWT_SECRET: "test-secret-for-discord-session",
      VITE_APP_ID: undefined,
    });
    const sdk = new SDKServer();

    const token = await sdk.createSessionToken("discord:123456789", {
      appId: "murph-tournaments-website",
      name: "Discord User",
    });

    await expect(sdk.verifySession(token)).resolves.toEqual({
      openId: "discord:123456789",
      appId: "murph-tournaments-website",
      name: "Discord User",
    });
  });

  it("still rejects sessions without a valid JWT signature", async () => {
    const { SDKServer: SigningServer } = await loadSdkWithEnv({
      JWT_SECRET: "signing-secret",
      VITE_APP_ID: undefined,
    });
    const signingSdk = new SigningServer();
    const token = await signingSdk.createSessionToken("discord:123456789", {
      appId: "murph-tournaments-website",
      name: "Discord User",
    });

    const { SDKServer: VerifyingServer } = await loadSdkWithEnv({
      JWT_SECRET: "different-verifying-secret",
      VITE_APP_ID: undefined,
    });
    const verifyingSdk = new VerifyingServer();

    await expect(verifyingSdk.verifySession(token)).resolves.toBeNull();
  });

  it("uses a non-empty fallback appId when no option or VITE_APP_ID is configured", async () => {
    const { SDKServer } = await loadSdkWithEnv({
      JWT_SECRET: "test-secret-for-fallback-app-id",
      VITE_APP_ID: undefined,
    });
    const sdk = new SDKServer();

    const token = await sdk.createSessionToken("discord:987654321", {
      name: "Discord User",
    });
    const session = await sdk.verifySession(token);

    expect(session?.appId).toBe("murph-tournaments-website");
    expect(session?.appId).not.toBe("");
  });
});
