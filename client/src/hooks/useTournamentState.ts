import { useState, useEffect, useCallback } from 'react';

export interface Standing {
  teamName: string;
  frp: number;
}

export interface TournamentState {
  eventWinner: string | null;
  status: string;
  currentLeader: string | null;
  updatedAt: string;
  tournamentId: string;
  cycle: number;
  isComplete: boolean;
  standings?: Standing[];
}

const FALLBACK_STATE: TournamentState = {
  eventWinner: null,
  status: 'Awaiting Update',
  currentLeader: null,
  updatedAt: new Date().toISOString(),
  tournamentId: '',
  cycle: 1,
  isComplete: false,
  standings: [],
};

/**
 * Custom hook to fetch and poll tournament state from the server
 * Polls every 15 seconds for live updates
 */
export function useTournamentState(tournamentId: string) {
  const [state, setState] = useState<TournamentState>({
    ...FALLBACK_STATE,
    tournamentId,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`/api/tournament/${tournamentId}/state`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tournament state: ${response.statusText}`);
      }
      const data = await response.json();
      setState(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useTournamentState] Error:', message);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  // Initial fetch
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Poll for updates every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchState, 15000);
    return () => clearInterval(interval);
  }, [fetchState]);

  return {
    state,
    loading,
    error,
    refetch: fetchState,
  };
}
