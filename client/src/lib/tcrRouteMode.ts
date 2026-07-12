export function normalizeTcrPathname(pathname: string) {
  const [withoutQuery] = pathname.split(/[?#]/, 1);
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed || "/";
}

export function isPersonalTcrPath(
  pathname: string,
  tournamentId: string | number
) {
  const normalized = normalizeTcrPathname(pathname);
  const encodedTournamentId = String(tournamentId);
  const match = normalized.match(/^\/tcr\/([^/]+)$/i);
  return Boolean(match && match[1] === encodedTournamentId);
}
