const databaseDetailPatterns = [
  /\bselect\b[\s\S]*\bfrom\b/i,
  /\balter\s+table\b/i,
  /\bcreate\s+table\b/i,
  /\bunknown\s+column\b/i,
  /\ber_bad_field_error\b/i,
  /\bsql\s*:/i,
  /\bmysql\b/i,
];

export const tournamentControlUnavailableMessage =
  "Tournament Control is temporarily unavailable. The database may still be updating.";

export function getSafeTournamentControlErrorMessage(message: string): string {
  return databaseDetailPatterns.some(pattern => pattern.test(message))
    ? tournamentControlUnavailableMessage
    : message;
}
