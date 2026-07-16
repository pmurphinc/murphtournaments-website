import { useEffect, useState } from "react";

/**
 * A single shared clock tick for a page, instead of every consumer running
 * its own setInterval. Returns the current time in epoch ms, refreshed every
 * `intervalMs` while `enabled`. When disabled, the interval is torn down and
 * the last known value is returned.
 */
export function useNowTick(enabled: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);

  return now;
}
