'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

const ADMIN_PASSWORD = 'SC7thCircle2026'; // 7th Circle admin password

export default function AdminControl2() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch tournament data
  const { data: tournament, isLoading: isTournamentLoading } = trpc.tournament.getSeventhCircle.useQuery();
  const updateStatusMutation = trpc.tournament.updateStatus2.useMutation();
  const updateTeamsMutation = trpc.tournament.updateTeams2.useMutation();

  // Local state for form
  const [formState, setFormState] = useState({
    eventStatus: 'not-live' as 'not-live' | 'live' | 'complete',
    currentCycle: '1' as '1' | '2' | '3',
    currentStage: 'check-in' as 'check-in' | 'cashout' | 'final-round' | 'finished',
    currentMatch: 'Team A vs Team B',
    eventNote: 'Awaiting Results / Match In Progress / Sudden Death',
    teams: [
      { name: 'ULT', frp: 0 },
      { name: '#BuffWinch', frp: 0 },
      { name: 'Opium label', frp: 0 },
      { name: 'Register now', frp: 0 },
    ],
  });

  // Check for existing session on mount
  useEffect(() => {
    const sessionToken = sessionStorage.getItem('sc7-admin-session');
    if (sessionToken === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load tournament data when available
  useEffect(() => {
    if (tournament) {
      const teamList = tournament.teams && tournament.teams.length > 0 
        ? tournament.teams.map((t: any) => ({ name: t.name, frp: t.frp }))
        : formState.teams;
      
      setFormState(prev => ({
        ...prev,
        eventStatus: (tournament.eventStatus as any) || 'not-live',
        currentCycle: (tournament.currentCycle as any) || '1',
        currentStage: (tournament.currentStage as any) || 'check-in',
        currentMatch: tournament.currentMatch || 'Team A vs Team B',
        eventNote: tournament.eventNote || 'Awaiting Results / Match In Progress / Sudden Death',
        teams: teamList,
      }));
    }
  }, [tournament]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
      sessionStorage.setItem('sc7-admin-session', 'authenticated');
    } else {
      setPasswordError('Incorrect password');
      setPasswordInput('');
    }
  };

  const updateTeamStanding = (index: number, field: 'name' | 'frp', value: string | number) => {
    const newTeams = [...formState.teams];
    if (field === 'name') {
      newTeams[index].name = value as string;
    } else {
      newTeams[index].frp = parseInt(value as string) || 0;
    }
    setFormState(prev => ({ ...prev, teams: newTeams }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Update tournament status
      await updateStatusMutation.mutateAsync({
        tournamentId: tournament?.id || 0,
        eventStatus: formState.eventStatus,
        currentCycle: formState.currentCycle,
        currentStage: formState.currentStage,
        currentMatch: formState.currentMatch,
        eventNote: formState.eventNote,
      });

      // Update team standings
      await updateTeamsMutation.mutateAsync({
        tournamentId: tournament?.id || 0,
        teams: formState.teams,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLockPanel = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('sc7-admin-session');
    setPasswordInput('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-charcoal flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="border-2 border-neon-cyan p-8 rounded-sm">
            <h1 className="text-3xl font-bold font-mono text-neon-cyan mb-2 uppercase">
              7th Circle
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
    <div className="min-h-screen bg-dark-charcoal p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold font-mono text-neon-cyan uppercase">7th Circle Control Panel</h1>
          <button
            onClick={handleLockPanel}
            className="px-6 py-2 border-2 border-neon-magenta text-neon-magenta font-mono uppercase hover:bg-neon-magenta hover:text-dark-charcoal transition-colors"
          >
            Lock Panel
          </button>
        </div>

        <p className="text-neon-cyan font-mono mb-8">Live Tournament Control</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
                    checked={formState.eventStatus === status}
                    onChange={(e) => setFormState(prev => ({ ...prev, eventStatus: e.target.value as any }))}
                    className="w-4 h-4"
                  />
                  <span className="text-white font-mono uppercase">{status === 'not-live' ? 'Not Live' : status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Current Cycle */}
          <div className="border-2 border-neon-magenta p-6 rounded-sm">
            <h2 className="text-lg font-bold font-mono text-neon-magenta uppercase mb-4">Current Cycle</h2>
            <div className="space-y-2">
              {(['1', '2', '3'] as const).map((cycle) => (
                <label key={cycle} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="currentCycle"
                    value={cycle}
                    checked={formState.currentCycle === cycle}
                    onChange={(e) => setFormState(prev => ({ ...prev, currentCycle: e.target.value as any }))}
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
                    checked={formState.currentStage === stage}
                    onChange={(e) => setFormState(prev => ({ ...prev, currentStage: e.target.value as any }))}
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
              value={formState.currentMatch}
              onChange={(e) => setFormState(prev => ({ ...prev, currentMatch: e.target.value }))}
              placeholder="Team A vs Team B"
              className="w-full px-3 py-2 bg-dark-charcoal border-2 border-neon-lime text-white font-mono placeholder-white/40 focus:outline-none"
            />
          </div>
        </div>

        {/* FRP Standings */}
        <div className="border-2 border-neon-cyan p-6 rounded-sm mb-8">
          <h2 className="text-lg font-bold font-mono text-neon-cyan uppercase mb-4">FRP Standings</h2>
          <div className="space-y-3">
            {formState.teams.map((team, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <input
                  type="text"
                  value={team.name}
                  onChange={(e) => updateTeamStanding(idx, 'name', e.target.value)}
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

        {/* Event Note / Status */}
        <div className="border-2 border-neon-magenta p-6 rounded-sm mb-8">
          <h2 className="text-lg font-bold font-mono text-neon-magenta uppercase mb-4">Event Note / Status</h2>
          <textarea
            value={formState.eventNote}
            onChange={(e) => setFormState(prev => ({ ...prev, eventNote: e.target.value }))}
            placeholder="Awaiting Results / Match In Progress / Sudden Death"
            className="w-full px-3 py-2 bg-dark-charcoal border-2 border-neon-magenta text-white font-mono placeholder-white/40 focus:outline-none min-h-24"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-8 py-3 border-2 border-neon-gold text-neon-gold font-mono uppercase font-bold hover:bg-neon-gold hover:text-dark-charcoal transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes to Live'}
          </button>
        </div>
        <p className="text-center text-white/50 font-mono text-sm mt-4">All changes will be saved to the database</p>
      </div>
    </div>
  );
}
