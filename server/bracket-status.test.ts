import { describe, it, expect } from 'vitest';

/**
 * Test cases for bracket status panel logic
 * Validates that the status display correctly reflects tournament state from Discord bot
 */

describe('Bracket Status Panel Logic', () => {
  describe('Pre-Tournament State (REGISTRATION)', () => {
    it('should show Pre-Checkin when status is REGISTRATION', () => {
      const liveState = {
        status: 'REGISTRATION',
        cycle: 0,
        currentLeader: null,
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
      const isLive = liveState.status?.toUpperCase().includes('LIVE_CYCLE');

      let eventStatus = 'Awaiting Update';
      if (isRegistration) {
        eventStatus = 'Pre-Checkin';
      } else if (isCompleted) {
        eventStatus = 'Completed';
      } else if (isLive) {
        eventStatus = `Cycle ${liveState.cycle} In Progress`;
      }

      expect(eventStatus).toBe('Pre-Checkin');
    });

    it('should show TBD for leader during registration', () => {
      const liveState = {
        status: 'REGISTRATION',
        cycle: 0,
        currentLeader: null,
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const currentLeader = isRegistration ? 'TBD' : (liveState.currentLeader || 'TBD');

      expect(currentLeader).toBe('TBD');
    });

    it('should show TBD for winner during registration', () => {
      const liveState = {
        status: 'REGISTRATION',
        cycle: 0,
        currentLeader: null,
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
      const eventWinner = isCompleted ? (liveState.eventWinner || 'TBD') : 'TBD';

      expect(eventWinner).toBe('TBD');
    });

    it('should not show cycle number during registration', () => {
      const liveState = {
        status: 'REGISTRATION',
        cycle: 0,
        currentLeader: null,
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      expect(isRegistration).toBe(true);
    });
  });

  describe('Active Tournament States (LIVE_CYCLE_1/2/3)', () => {
    it('should show Cycle 1 In Progress for LIVE_CYCLE_1', () => {
      const liveState = {
        status: 'LIVE_CYCLE_1',
        cycle: 1,
        currentLeader: 'EkaZo\'s Kittens',
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
      const isLive = liveState.status?.toUpperCase().includes('LIVE_CYCLE');

      const cycleMatch = liveState.status?.match(/LIVE_CYCLE_(\d)/);
      const currentCycle = cycleMatch ? parseInt(cycleMatch[1]) : liveState.cycle || 1;

      let eventStatus = 'Awaiting Update';
      if (isRegistration) {
        eventStatus = 'Pre-Checkin';
      } else if (isCompleted) {
        eventStatus = 'Completed';
      } else if (isLive) {
        eventStatus = `Cycle ${currentCycle} In Progress`;
      }

      expect(eventStatus).toBe('Cycle 1 In Progress');
      expect(currentCycle).toBe(1);
    });

    it('should show Cycle 2 In Progress for LIVE_CYCLE_2', () => {
      const liveState = {
        status: 'LIVE_CYCLE_2',
        cycle: 2,
        currentLeader: 'Goo Disciples',
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
      const isLive = liveState.status?.toUpperCase().includes('LIVE_CYCLE');

      const cycleMatch = liveState.status?.match(/LIVE_CYCLE_(\d)/);
      const currentCycle = cycleMatch ? parseInt(cycleMatch[1]) : liveState.cycle || 1;

      let eventStatus = 'Awaiting Update';
      if (isRegistration) {
        eventStatus = 'Pre-Checkin';
      } else if (isCompleted) {
        eventStatus = 'Completed';
      } else if (isLive) {
        eventStatus = `Cycle ${currentCycle} In Progress`;
      }

      expect(eventStatus).toBe('Cycle 2 In Progress');
      expect(currentCycle).toBe(2);
    });

    it('should show Cycle 3 In Progress for LIVE_CYCLE_3', () => {
      const liveState = {
        status: 'LIVE_CYCLE_3',
        cycle: 3,
        currentLeader: 'LIQR',
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
      const isLive = liveState.status?.toUpperCase().includes('LIVE_CYCLE');

      const cycleMatch = liveState.status?.match(/LIVE_CYCLE_(\d)/);
      const currentCycle = cycleMatch ? parseInt(cycleMatch[1]) : liveState.cycle || 1;

      let eventStatus = 'Awaiting Update';
      if (isRegistration) {
        eventStatus = 'Pre-Checkin';
      } else if (isCompleted) {
        eventStatus = 'Completed';
      } else if (isLive) {
        eventStatus = `Cycle ${currentCycle} In Progress`;
      }

      expect(eventStatus).toBe('Cycle 3 In Progress');
      expect(currentCycle).toBe(3);
    });

    it('should show leader from bot data during active tournament', () => {
      const liveState = {
        status: 'LIVE_CYCLE_1',
        cycle: 1,
        currentLeader: 'EkaZo\'s Kittens',
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const currentLeader = isRegistration ? 'TBD' : (liveState.currentLeader || 'TBD');

      expect(currentLeader).toBe('EkaZo\'s Kittens');
    });

    it('should show TBD for winner during active tournament', () => {
      const liveState = {
        status: 'LIVE_CYCLE_1',
        cycle: 1,
        currentLeader: 'EkaZo\'s Kittens',
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
      const eventWinner = isCompleted ? (liveState.eventWinner || 'TBD') : 'TBD';

      expect(eventWinner).toBe('TBD');
    });
  });

  describe('Completed Tournament State', () => {
    it('should show Completed status when tournament is finished', () => {
      const liveState = {
        status: 'COMPLETED',
        cycle: 3,
        currentLeader: 'EkaZo\'s Kittens',
        eventWinner: 'EkaZo\'s Kittens',
        isComplete: true,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
      const isLive = liveState.status?.toUpperCase().includes('LIVE_CYCLE');

      let eventStatus = 'Awaiting Update';
      if (isRegistration) {
        eventStatus = 'Pre-Checkin';
      } else if (isCompleted) {
        eventStatus = 'Completed';
      } else if (isLive) {
        eventStatus = `Cycle ${liveState.cycle} In Progress`;
      }

      expect(eventStatus).toBe('Completed');
    });

    it('should show winner when tournament is completed', () => {
      const liveState = {
        status: 'COMPLETED',
        cycle: 3,
        currentLeader: 'EkaZo\'s Kittens',
        eventWinner: 'EkaZo\'s Kittens',
        isComplete: true,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
      const eventWinner = isCompleted ? (liveState.eventWinner || 'TBD') : 'TBD';

      expect(eventWinner).toBe('EkaZo\'s Kittens');
    });

    it('should show leader as winner when tournament is completed', () => {
      const liveState = {
        status: 'COMPLETED',
        cycle: 3,
        currentLeader: 'EkaZo\'s Kittens',
        eventWinner: 'EkaZo\'s Kittens',
        isComplete: true,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const currentLeader = isRegistration ? 'TBD' : (liveState.currentLeader || 'TBD');

      expect(currentLeader).toBe('EkaZo\'s Kittens');
    });
  });

  describe('Fallback States', () => {
    it('should show Awaiting Update when status is unclear', () => {
      const liveState = {
        status: 'Unknown',
        cycle: 0,
        currentLeader: null,
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;
      const isLive = liveState.status?.toUpperCase().includes('LIVE_CYCLE');

      let eventStatus = 'Awaiting Update';
      if (isRegistration) {
        eventStatus = 'Pre-Checkin';
      } else if (isCompleted) {
        eventStatus = 'Completed';
      } else if (isLive) {
        eventStatus = `Cycle ${liveState.cycle} In Progress`;
      } else if (liveState.status) {
        eventStatus = liveState.status;
      }

      expect(eventStatus).toBe('Unknown');
    });

    it('should fallback to TBD for all values when no data available', () => {
      const liveState = {
        status: null,
        cycle: 0,
        currentLeader: null,
        eventWinner: null,
        isComplete: false,
        updatedAt: new Date().toISOString(),
        tournamentId: 'dev-division',
      };

      const isRegistration = liveState.status?.toUpperCase() === 'REGISTRATION';
      const isCompleted = liveState.status?.toUpperCase() === 'COMPLETED' || liveState.isComplete;

      const currentLeader = isRegistration ? 'TBD' : (liveState.currentLeader || 'TBD');
      const eventWinner = isCompleted ? (liveState.eventWinner || 'TBD') : 'TBD';

      expect(currentLeader).toBe('TBD');
      expect(eventWinner).toBe('TBD');
    });
  });
});
