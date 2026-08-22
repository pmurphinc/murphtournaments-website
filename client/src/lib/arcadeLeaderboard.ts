import { useQuery } from "@tanstack/react-query";
import {
  ARCADE_LEADERBOARD_DEFAULT_LIMIT,
  type ArcadeLeaderboardEntry,
} from "@shared/arcade";

/**
 * Reads the arcade leaderboard from the same REST endpoint the game itself
 * calls. It is deliberately not a tRPC procedure: the arcade lives on another
 * origin and needs a surface that can be opened cross-origin on its own.
 */
export async function fetchArcadeLeaderboard(
  limit = ARCADE_LEADERBOARD_DEFAULT_LIMIT
): Promise<ArcadeLeaderboardEntry[]> {
  const response = await fetch(`/api/arcade/leaderboard?limit=${limit}`, {
    credentials: "include",
  });

  if (!response.ok) throw new Error("Could not load the arcade leaderboard.");

  const body = (await response.json()) as {
    entries?: ArcadeLeaderboardEntry[];
  };
  return body.entries ?? [];
}

export function useArcadeLeaderboard(limit = ARCADE_LEADERBOARD_DEFAULT_LIMIT) {
  return useQuery({
    queryKey: ["arcade-leaderboard", limit],
    queryFn: () => fetchArcadeLeaderboard(limit),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
