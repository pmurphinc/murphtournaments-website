import { useState, useEffect } from 'react';
import { loadAdminState, saveAdminState, AdminControlState, TeamStanding } from '@/lib/adminStore';

const ADMIN_PASSWORD = 'MURPH2026'; // Change this to a secure password

export default function AdminControl() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [state, setState] = useState<AdminControlState>(loadAdminState());

  // Check for existing session on mount
  useEffect(() => {
    const sessionToken = sessionStorage.getItem('dd-admin-session');
    if (sessionToken === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('dd-admin-session', 'authenticated');
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Invalid password');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('dd-admin-session');
  };

  const updateState = (updates: Partial<AdminControlState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    saveAdminState(newState);
  };

  const updateTeamStanding = (index: number, field: 'teamName' | 'frp', value: string | number) => {
    const newStandings = [...state.teamStandings];
    if (field === 'teamName') {
      newStandings[index].teamName = value as string;
    } else {
      newStandings[index].frp = parseInt(value as string) || 0;
    }
    updateState({ teamStandings: newStandings });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-charcoal flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="border-2 border-neon-cyan p-8 rounded-sm">
            <h1 className="text-3xl font-bold font-mono text-neon-cyan mb-2 uppercase">
              Development Division
            </h1>
            <p className="text-neon-cyan font-mono mb-6">Control Access</p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 bg-dark-charcoal border-2 border-neon-cyan text-white font-mono placeholder-white/40 focus:outline-none focus:border-neon-magenta"
                />
              </div>
              {passwordError && (
                <p className="text-neon-magenta font-mono text-sm">{passwordError}</p>
              )}
              <button
                type="submit"
                className="w-full px-4 py-2 bg-neon-cyan text-dark-black font-bold font-mono uppercase tracking-widest hover:bg-neon-magenta transition-colors"
              >
                Unlock Control Panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-charcoal p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-mono text-neon-cyan uppercase mb-2">
              DD Control Panel
            </h1>
            <p className="text-neon-cyan font-mono text-sm">Live Tournament Control</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 border-2 border-neon-magenta text-neon-magenta font-bold font-mono uppercase hover:bg-neon-magenta hover:text-dark-black transition-colors"
          >
            Lock Panel
          </button>
        </div>

        {/* Control Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Event Status */}
          <div className="border-2 border-neon-cyan p-6 rounded-sm">
            <h2 className="text-lg font-bold font-mono text-neon-cyan uppercase mb-4">Event Status</h2>
            <div className="space-y-2">
              {(['not-live', 'live', 'complete'] as const).map((status) => (
                <label key={status} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="eventStatus"
                    value={status}
                    checked={state.eventStatus === status}
                    onChange={(e) => updateState({ eventStatus: e.target.value as any })}
                    className="w-4 h-4"
                  />
                  <span className="text-white font-mono uppercase">
                    {status === 'not-live' ? 'Not Live' : status === 'live' ? 'Live' : 'Complete'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Current Cycle */}
          <div className="border-2 border-neon-magenta p-6 rounded-sm">
            <h2 className="text-lg font-bold font-mono text-neon-magenta uppercase mb-4">Current Cycle</h2>
            <div className="space-y-2">
              {[1, 2, 3].map((cycle) => (
                <label key={cycle} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="currentCycle"
                    value={cycle}
                    checked={state.currentCycle === cycle}
                    onChange={(e) => updateState({ currentCycle: parseInt(e.target.value) as any })}
                    className="w-4 h-4"
                  />
                  <span className="text-white font-mono">Cycle {cycle}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Current Stage */}
          <div className="border-2 border-neon-gold p-6 rounded-sm">
            <h2 className="text-lg font-bold font-mono text-neon-gold uppercase mb-4">Current Stage</h2>
            <div className="space-y-2">
              {(['check-in', 'cashout', 'final-round', 'finished'] as const).map((stage) => (
                <label key={stage} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="currentStage"
                    value={stage}
                    checked={state.currentStage === stage}
                    onChange={(e) => updateState({ currentStage: e.target.value as any })}
                    className="w-4 h-4"
                  />
                  <span className="text-white font-mono uppercase">
                    {stage === 'check-in' ? 'Check-In' : stage === 'cashout' ? 'Cashout' : stage === 'final-round' ? 'Final Round' : 'Finished'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Current Match */}
          <div className="border-2 border-neon-lime p-6 rounded-sm">
            <h2 className="text-lg font-bold font-mono text-neon-lime uppercase mb-4">Current Match</h2>
            <input
              type="text"
              value={state.currentMatch}
              onChange={(e) => updateState({ currentMatch: e.target.value })}
              placeholder="Team A vs Team B"
              className="w-full px-3 py-2 bg-dark-charcoal border-2 border-neon-lime text-white font-mono placeholder-white/40 focus:outline-none"
            />
          </div>
        </div>

        {/* FRP Standings */}
        <div className="border-2 border-neon-cyan p-6 rounded-sm mb-8">
          <h2 className="text-lg font-bold font-mono text-neon-cyan uppercase mb-4">FRP Standings</h2>
          <div className="space-y-3">
            {state.teamStandings.map((team, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <input
                  type="text"
                  value={team.teamName}
                  onChange={(e) => updateTeamStanding(idx, 'teamName', e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-charcoal border-2 border-white/20 text-white font-mono focus:outline-none focus:border-neon-cyan"
                  placeholder="Team name"
                />
                <input
                  type="number"
                  value={team.frp}
                  onChange={(e) => updateTeamStanding(idx, 'frp', e.target.value)}
                  className="w-20 px-3 py-2 bg-dark-charcoal border-2 border-white/20 text-white font-mono focus:outline-none focus:border-neon-cyan"
                  placeholder="FRP"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Event Note */}
        <div className="border-2 border-neon-magenta p-6 rounded-sm">
          <h2 className="text-lg font-bold font-mono text-neon-magenta uppercase mb-4">Event Note / Status</h2>
          <textarea
            value={state.eventNote}
            onChange={(e) => updateState({ eventNote: e.target.value })}
            placeholder="Awaiting Results / Match In Progress / Sudden Death"
            className="w-full px-3 py-2 bg-dark-charcoal border-2 border-neon-magenta text-white font-mono placeholder-white/40 focus:outline-none h-20"
          />
        </div>

        {/* Auto-save indicator */}
        <p className="text-center text-white/50 font-mono text-sm mt-6">
          All changes auto-save to local storage
        </p>
      </div>
    </div>
  );
}
