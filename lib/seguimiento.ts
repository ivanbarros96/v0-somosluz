// Score de riesgo de seguimiento. Es la versión HONESTA de "clasificación":
// no un modelo entrenado (con 4 retiros históricos no se puede entrenar nada),
// sino un puntaje por reglas, 100% explicable. Cada punto que suma trae su
// motivo en palabras, para que el pastor sepa por qué alguien está en rojo y
// no reciba una caja negra.
//
// Se calcula sobre los cultos DOMINICALES (el general), no las reuniones de
// ministerio, que tienen público parcial.

export type NivelRiesgo = 'bajo' | 'medio' | 'alto';

export interface ResultadoRiesgo {
  streak: number; // domingos consecutivos sin asistir, desde el más reciente
  puntaje: number; // 0-100
  nivel: NivelRiesgo;
  motivos: string[]; // por qué tiene ese nivel, en lenguaje claro
  tasaReciente: number | null; // % de asistencia en las últimas semanas (0-1)
  elegibles: number; // cultos posibles desde que la persona se unió
}

// Ventana para medir tendencia: compara la asistencia de los últimos N
// domingos contra los N anteriores.
const VENTANA = 6;
// Caída (en puntos de tasa) que se considera preocupante.
const CAIDA_SIGNIFICATIVA = 0.3;
// Una persona unida hace menos de esto es "nueva": los primeros meses son
// los más frágiles para la retención, así que faltar pesa más.
const SEMANAS_NUEVO = 10;

const SEMANA_MS = 7 * 86_400_000;

/**
 * @param cultosPasadosDesc cultos dominicales ya realizados, MÁS RECIENTE PRIMERO
 * @param asistio           set de culto_id a los que la persona asistió
 * @param joinTime          ms en que la persona se unió (fecha_registro)
 * @param ahora             ms de referencia (inyectable para pruebas)
 */
export function calcularRiesgo(
  cultosPasadosDesc: { id: number; fecha: string }[],
  asistio: Set<number>,
  joinTime: number,
  ahora: number = Date.now(),
): ResultadoRiesgo {
  // Solo cuentan los domingos desde que la persona se unió: a alguien que
  // llegó hace dos semanas no se le reprochan los cultos anteriores.
  const elegibles = cultosPasadosDesc.filter((c) => new Date(c.fecha).getTime() >= joinTime);

  // Racha de ausencias consecutivas, desde el domingo más reciente hacia atrás.
  let streak = 0;
  for (const c of elegibles) {
    if (asistio.has(c.id)) break;
    streak++;
  }

  // Tasa de asistencia reciente vs. la previa, en ventanas de VENTANA domingos.
  const tasa = (arr: { id: number }[]) =>
    arr.length ? arr.filter((c) => asistio.has(c.id)).length / arr.length : null;
  const tasaReciente = tasa(elegibles.slice(0, VENTANA));
  const tasaPrevia = tasa(elegibles.slice(VENTANA, VENTANA * 2));

  const motivos: string[] = [];
  let puntaje = 0;

  // 1. Ausencias consecutivas — la señal dominante.
  if (streak >= 4) {
    puntaje += 80;
    motivos.push(`No viene hace ${streak} domingos seguidos`);
  } else if (streak === 3) {
    puntaje += 60;
    motivos.push('No viene hace 3 domingos seguidos');
  } else if (streak === 2) {
    puntaje += 35;
    motivos.push('No viene hace 2 domingos');
  } else if (streak === 1) {
    puntaje += 10;
  }

  // 2. Tendencia: venía asistiendo y bajó. Esto detecta al que "se está
  //    enfriando" aunque su racha todavía sea corta — el aporte real del score
  //    sobre el conteo simple de ausencias.
  if (tasaReciente != null && tasaPrevia != null && tasaPrevia - tasaReciente >= CAIDA_SIGNIFICATIVA) {
    puntaje += 25;
    motivos.push('Su asistencia venía cayendo');
  }

  // 3. Nuevo en riesgo: se unió hace poco y ya está faltando.
  const semanasDesdeUnion = (ahora - joinTime) / SEMANA_MS;
  if (semanasDesdeUnion <= SEMANAS_NUEVO && streak >= 2) {
    puntaje += 15;
    motivos.push('Es nuevo y ya está faltando');
  }

  puntaje = Math.min(puntaje, 100);
  const nivel: NivelRiesgo = puntaje >= 50 ? 'alto' : puntaje >= 20 ? 'medio' : 'bajo';

  return { streak, puntaje, nivel, motivos, tasaReciente, elegibles: elegibles.length };
}
