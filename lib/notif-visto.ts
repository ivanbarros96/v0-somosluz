'use client';

// Marca de "ya vi las notificaciones", compartida por la campana y el menú.
//
// Vive acá y no dentro de la campana porque los dos tienen que coincidir: si
// la campana se apaga al abrirla pero el menú sigue mostrando el 3, el aviso
// no desapareció "de todo el track" — que es justo lo que se pidió
// (Iván, 03/09/2026).
//
// Es por NAVEGADOR, no por usuario en la base: marcar como visto es una
// comodidad de lectura, no un cambio de estado real. El estado real
// (pendiente/resuelto, culto abierto/cerrado) vive en la base y no se toca
// desde acá — leer un aviso nunca arregla el problema que lo generó.

const EVENTO = 'sl:notif-visto';

export function claveVisto(role: string): string {
  return `sl_notif_seen_${role}`;
}

export function leerVisto(role: string): number {
  try {
    const v = localStorage.getItem(claveVisto(role));
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

/** Guarda la marca y avisa a los demás componentes de esta misma pestaña. */
export function guardarVisto(role: string, ts: number) {
  try {
    localStorage.setItem(claveVisto(role), String(ts));
  } catch {
    // Storage bloqueado (modo privado): no persiste entre recargas, pero el
    // evento igual apaga los contadores mientras dure la sesión.
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { role, ts } }));
  } catch {
    // Entorno sin window (SSR): nada que avisar.
  }
}

/**
 * Suscribe a cambios de la marca. Cubre los dos casos:
 *  · misma pestaña  → el CustomEvent de guardarVisto
 *  · otra pestaña   → el evento 'storage' del navegador
 */
export function alCambiarVisto(role: string, cb: (ts: number) => void): () => void {
  const propio = (e: Event) => {
    const d = (e as CustomEvent<{ role: string; ts: number }>).detail;
    if (d?.role === role) cb(d.ts);
  };
  const otro = (e: StorageEvent) => {
    if (e.key === claveVisto(role)) cb(Number(e.newValue ?? 0));
  };
  window.addEventListener(EVENTO, propio);
  window.addEventListener('storage', otro);
  return () => {
    window.removeEventListener(EVENTO, propio);
    window.removeEventListener('storage', otro);
  };
}
