import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTournamentState } from './webhooks';

describe('Tournament Webhooks', () => {
  describe('getTournamentState', () => {
    it('should return default state for dev-division tournament', () => {
      const state = getTournamentState('dev-division');
      
      expect(state).toBeDefined();
      expect(state.tournamentId).toBe('dev-division');
      expect(state.status).toBeDefined();
      expect(state.eventWinner).toBeNull();
      expect(state.currentLeader).toBeNull();
      expect(state.cycle).toBeGreaterThanOrEqual(1);
      expect(state.isComplete).toBe(false);
    });

    it('should return default state for 7th-circle tournament', () => {
      const state = getTournamentState('7th-circle');
      
      expect(state).toBeDefined();
      expect(state.tournamentId).toBe('7th-circle');
      expect(state.status).toBeDefined();
      expect(state.eventWinner).toBeNull();
      expect(state.currentLeader).toBeNull();
      expect(state.cycle).toBeGreaterThanOrEqual(1);
      expect(state.isComplete).toBe(false);
    });

    it('should have updatedAt timestamp in ISO format', () => {
      const state = getTournamentState('dev-division');
      
      expect(state.updatedAt).toBeDefined();
      // Verify it's a valid ISO timestamp
      expect(() => new Date(state.updatedAt)).not.toThrow();
      expect(new Date(state.updatedAt).getTime()).toBeGreaterThan(0);
    });

    it('should return consistent state for same tournament ID', () => {
      const state1 = getTournamentState('dev-division');
      const state2 = getTournamentState('dev-division');
      
      expect(state1.tournamentId).toBe(state2.tournamentId);
      expect(state1.cycle).toBe(state2.cycle);
    });
  });

  describe('Webhook Security', () => {
    it('should have TOURNAMENT_WEBHOOK_SECRET environment variable set', () => {
      const secret = process.env.TOURNAMENT_WEBHOOK_SECRET;
      
      expect(secret).toBeDefined();
      expect(secret).not.toBe('');
      expect(typeof secret).toBe('string');
    });

    it('webhook secret should be at least 16 characters for security', () => {
      const secret = process.env.TOURNAMENT_WEBHOOK_SECRET;
      
      expect(secret).toBeDefined();
      if (secret) {
        expect(secret.length).toBeGreaterThanOrEqual(16);
      }
    });
  });

  describe('Tournament State Schema', () => {
    it('should have all required fields in tournament state', () => {
      const state = getTournamentState('dev-division');
      
      expect(state).toHaveProperty('eventWinner');
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('currentLeader');
      expect(state).toHaveProperty('updatedAt');
      expect(state).toHaveProperty('tournamentId');
      expect(state).toHaveProperty('cycle');
      expect(state).toHaveProperty('isComplete');
    });

    it('status should be a non-empty string', () => {
      const state = getTournamentState('dev-division');
      
      expect(typeof state.status).toBe('string');
      expect(state.status.length).toBeGreaterThan(0);
    });

    it('cycle should be a positive integer', () => {
      const state = getTournamentState('dev-division');
      
      expect(typeof state.cycle).toBe('number');
      expect(state.cycle).toBeGreaterThan(0);
      expect(Number.isInteger(state.cycle)).toBe(true);
    });

    it('isComplete should be a boolean', () => {
      const state = getTournamentState('dev-division');
      
      expect(typeof state.isComplete).toBe('boolean');
    });
  });
});
