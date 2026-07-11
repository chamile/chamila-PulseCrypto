import { useEffect, useState } from 'react';
import type { HealthResponse } from '@pulsecrypto/contracts';
import { fetchHealth } from '@/net/restClient';

export function useHealthPoll(intervalMs = 1000) {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const h = await fetchHealth();
        if (!alive) return;
        setData(h);
        setHistory((prev) => {
          const next = [...prev, h.memoryMb].slice(-40);
          return next;
        });
      } catch {
        if (alive) setData(null);
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { data, history };
}
