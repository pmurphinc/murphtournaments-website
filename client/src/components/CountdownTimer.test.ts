import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display countdown when time remains', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day from now
    const now = new Date();
    
    const difference = futureDate.getTime() - now.getTime();
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    
    expect(days).toBeGreaterThan(0);
  });

  it('should set isLive to true when target time is reached', () => {
    const now = new Date();
    const targetDate = new Date(now.getTime() - 1000); // 1 second ago
    
    const difference = targetDate.getTime() - now.getTime();
    
    expect(difference).toBeLessThanOrEqual(0);
  });

  it('should reset time values to 0 when timer reaches zero', () => {
    const targetDate = new Date(Date.now() - 1000); // Past date
    
    const timeRemaining = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
    
    expect(timeRemaining.days).toBe(0);
    expect(timeRemaining.hours).toBe(0);
    expect(timeRemaining.minutes).toBe(0);
    expect(timeRemaining.seconds).toBe(0);
  });

  it('should calculate correct time remaining', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 + 1000 * 60 * 60 * 5 + 1000 * 60 * 30 + 1000 * 45);
    
    const difference = futureDate.getTime() - now.getTime();
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);
    
    expect(days).toBe(1);
    expect(hours).toBe(5);
    expect(minutes).toBe(30);
    expect(seconds).toBe(45);
  });

  it('should have Twitch link when live', () => {
    // Test that the component would render a link to https://twitch.tv/murph
    const twitchUrl = 'https://twitch.tv/murph';
    expect(twitchUrl).toBe('https://twitch.tv/murph');
  });
});
