'use client';

// Equipos de oración para el menú de la izquierda.
//
// Se refresca al volver a la pestaña y no por temporizador: los equipos cambian
// muy de vez en cuando (se crean una vez y quedan), así que consultarlos cada
// minuto sería gastar por nada. Al crear uno desde el panel, la pantalla ya
// recarga su propia lista; el menú se pone al día al volver a enfocar.

import { useCallback, useEffect, useState } from 'react';
import { alCambiarEquipos, type EquipoOracion } from '@/lib/oracion-equipos';

export function useEquiposOracion(activo: boolean): EquipoOracion[] {
  const [equipos, setEquipos] = useState<EquipoOracion[]>([]);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/oracion/equipos', { cache: 'no-store' });
      if (!r.ok) return;
      const { equipos } = await r.json();
      setEquipos(equipos ?? []);
    } catch {
      // Silencioso: un fallo de red no debe romper el menú.
    }
  }, []);

  useEffect(() => {
    if (!activo) {
      setEquipos([]);
      return;
    }
    cargar();
    const onVisible = () => {
      if (document.visibilityState === 'visible') cargar();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', cargar);
    // Al crear o borrar un equipo desde el panel, el menú se entera en el acto.
    const off = alCambiarEquipos(cargar);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', cargar);
      off();
    };
  }, [activo, cargar]);

  return equipos;
}
