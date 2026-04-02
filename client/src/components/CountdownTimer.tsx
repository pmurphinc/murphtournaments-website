import { useEffect, useState } from 'react';

/**
 * CountdownTimer Component
 * Cyberpunk Neon Rebellion Design
 * - Real-time countdown to event
 * - Pulsing neon effect
 * - Monospace typography for data display
 */

interface CountdownTimerProps {
  targetDate: Date;
  eventName?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function CountdownTimer({ targetDate, eventName }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsLive(true);
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setIsLive(false);
      setTimeRemaining({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (isLive) {
    return (
      <div className="text-center">
        <a
          href="https://twitch.tv/murph"
          target="_blank"
          rel="noopener noreferrer"
          className="text-4xl font-bold font-mono text-neon-lime pulse-neon mb-2 inline-block hover:opacity-80 transition-opacity"
        >
          LIVE NOW
        </a>
      </div>
    );
  }

  return (
    <div className="text-center">
      {eventName && (
        <p className="text-sm text-neon-cyan font-mono uppercase tracking-widest mb-4">
          {eventName} Starts In
        </p>
      )}
      <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4">
        <div className="border-2 border-neon-magenta/50 p-3 md:p-4 rounded-sm">
          <div className="text-2xl md:text-4xl font-bold font-mono text-neon-magenta">
            {String(timeRemaining.days).padStart(2, '0')}
          </div>
          <div className="text-xs text-white/60 font-mono uppercase mt-1">Days</div>
        </div>
        <div className="border-2 border-neon-cyan/50 p-3 md:p-4 rounded-sm">
          <div className="text-2xl md:text-4xl font-bold font-mono text-neon-cyan">
            {String(timeRemaining.hours).padStart(2, '0')}
          </div>
          <div className="text-xs text-white/60 font-mono uppercase mt-1">Hours</div>
        </div>
        <div className="border-2 border-neon-gold/50 p-3 md:p-4 rounded-sm">
          <div className="text-2xl md:text-4xl font-bold font-mono text-neon-gold">
            {String(timeRemaining.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs text-white/60 font-mono uppercase mt-1">Mins</div>
        </div>
        <div className="border-2 border-neon-lime/50 p-3 md:p-4 rounded-sm">
          <div className="text-2xl md:text-4xl font-bold font-mono text-neon-lime">
            {String(timeRemaining.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs text-white/60 font-mono uppercase mt-1">Secs</div>
        </div>
      </div>
    </div>
  );
}
