function getBrowserOrigin() {
  if (typeof window === "undefined" || !window.location || window.location.origin === "null") return "https://murphtournaments.local";
  return window.location.origin;
}

export function sanitizeDiscordReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const baseOrigin = getBrowserOrigin();
    const parsed = new URL(value, baseOrigin);
    if (parsed.origin !== baseOrigin) return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export function getDiscordLoginUrl(returnPath = typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}${window.location.hash}`) {
  const safeReturnPath = sanitizeDiscordReturnPath(returnPath);
  return `/api/auth/discord/login?returnTo=${encodeURIComponent(safeReturnPath)}`;
}
