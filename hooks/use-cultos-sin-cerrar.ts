'use client';

// Cultos que llevan más de 48 h abiertos, para el rol que está mirando.
//
// Existe para que la campana, el menú y la pantalla de Asistencia cuenten LO
// MISMO. Antes la campana avisaba "3" y no había ningún 3 en el resto de la
// app: el aviso te mandaba a Asistencia y ahí no encontrabas nada que dijera
// cuál era el problema. Un aviso sin rastro hasta el objeto avisado no es un
// aviso, es una molestia.

import { useCallback, useEffect, useRef, useState } from 'react';
import { cultosSinCerrar, type CultoSinCerrar } from '@/lib/cultos-abiertos';
import { abreCultos, ministerioDeRol } from '@/lib/roles';

const POLL_MS = 60_000;

export function useCultosSinCerrar(role: string | undefined): CultoSinCerrar[] {
  const [lista, setLista] = useState<CultoSinCerrar[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const activo = !!role && abreCultos(role);

  const cargar = useCallback(async () => {
    if (!role) return;
    try {
      const r = await fetch('/api/cultos', { cache: 'no-store' });
      if (!r.ok) return;
      const { cultos } = await r.json();
      setLista(cultosSinCerrar(cultos ?? [], ministerioDeRol(role)));
    } catch {
      // Silencioso: un fallo de red no debe romper el menú ni la pantalla.
    }
  }, [role]);

  useEffect(() => {
    if (!activo) {
      setLista([]);
      return;
    }
    cargar();
    timer.current = setInterval(cargar, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') cargar();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [activo, cargar]);

  return lista;
}
