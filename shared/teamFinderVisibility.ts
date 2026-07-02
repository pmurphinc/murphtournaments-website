export function canViewHiddenTeamFinderListings(role?: string | null) {
  return role === "admin";
}
