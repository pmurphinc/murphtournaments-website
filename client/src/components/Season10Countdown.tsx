import { useState, useEffect } from 'react';

export default function Season10Countdown() {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const targetDate = new Date('2026-03-26T06:30:00').getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isLive: true,
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isLive: false,
      });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, []);

  if (timeRemaining.isLive) {
    return (
      <div className="text-2xl font-bold text-neon-magenta font-mono tracking-widest">
        SEASON 10 IS LIVE
      </div>
    );
  }

  return (
    <div className="text-lg font-mono text-neon-cyan tracking-widest">
      Season 10 starts in:
      <div className="text-2xl font-bold text-neon-gold mt-2">
        {String(timeRemaining.days).padStart(2, '0')}d{' '}
        {String(timeRemaining.hours).padStart(2, '0')}h{' '}
        {String(timeRemaining.minutes).padStart(2, '0')}m{' '}
        {String(timeRemaining.seconds).padStart(2, '0')}s
      </div>
    </div>
  );
}
