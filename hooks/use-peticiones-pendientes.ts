'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 60_000;

// Conteo de peticiones de oración sin revisar (estado='pendiente').
// Polling cada 60s + refresco al volver a la pestaña. Pensado solo para el pastor:
// pasar enabled=false apaga el polling y deja el conteo en 0.
export function usePeticionesPendientes(enabled: boolean): number {
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/oracion/pendientes', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setCount(typeof data.count === 'number' ? data.count : 0);
    } catch {
      // Silencioso: un fallo de red no debe romper el sidebar.
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    fetchCount();
    timer.current = setInterval(fetchCount, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCount();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, fetchCount]);

  return count;
}
