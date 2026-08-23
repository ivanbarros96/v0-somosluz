'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 60_000;

/**
 * Conteo que se refresca solo: polling cada 60s + al volver a la pestaña.
 *
 * Sirve para cualquier endpoint que devuelva `{ count: number }`. Nació del
 * hook de peticiones de oración; se generalizó al necesitar lo mismo para los
 * registros pendientes de aprobar, en vez de copiar la lógica de polling.
 *
 * `enabled=false` apaga el temporizador y deja el conteo en 0, para roles que
 * no deben ver ese aviso.
 */
export function useConteoPendiente(url: string, enabled: boolean): number {
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setCount(typeof data.count === 'number' ? data.count : 0);
    } catch {
      // Silencioso: un fallo de red no debe romper el menú.
    }
  }, [url]);

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
