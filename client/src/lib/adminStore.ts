// Admin Control Panel State Management
// Persists tournament control data to localStorage

export interface TeamStanding {
  teamName: string;
  frp: number;
}

export interface AdminControlState {
  eventStatus: 'not-live' | 'live' | 'complete';
  currentCycle: 1 | 2 | 3;
  currentStage: 'check-in' | 'cashout' | 'final-round' | 'finished';
  currentMatch: string;
  teamStandings: TeamStanding[];
  eventNote: string;
}

const STORAGE_KEY = 'dd-admin-control-state';
const DEFAULT_STATE: AdminControlState = {
  eventStatus: 'not-live',
  currentCycle: 1,
  currentStage: 'check-in',
  currentMatch: '',
  teamStandings: [
    { teamName: "EkaZo's Kittens", frp: 0 },
    { teamName: 'Three Deadly Sins', frp: 0 },
    { teamName: 'LIQR', frp: 0 },
    { teamName: 'The Baiters', frp: 0 },
  ],
  eventNote: '',
};

export function loadAdminState(): AdminControlState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Failed to load admin state:', err);
  }
  return DEFAULT_STATE;
}

export function saveAdminState(state: AdminControlState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save admin state:', err);
  }
}

export function resetAdminState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset admin state:', err);
  }
}
