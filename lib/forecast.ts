// Ajuste de tendencia y pronóstico corto para series semanales (asistencia).
// Es "regresión lineal" del deck de modelos (peldaño predictivo), en su versión
// honesta para pocos datos: una recta de mínimos cuadrados sobre los domingos,
// proyectada solo unas semanas hacia adelante y con banda que se ensancha
// mientras más lejos se mira.
//
// Lo que NO hace, a propósito: no modela estacionalidad (verano, fiestas). Con
// menos de ~2 años no hay ciclos suficientes para separarla del ruido, así que
// proyectar 1-2 años sería inventar. Por eso el horizonte por defecto es corto.

export interface Regresion {
  pendiente: number; // personas por domingo (positivo = creciendo)
  intercepto: number;
  sigma: number; // desviación de los residuales → ancho de la banda
  r2: number; // qué tan bien ajusta la recta, 0 a 1
  n: number;
}

// Recta de mínimos cuadrados. x = índice del domingo (0,1,2…), y = asistentes.
// Devuelve null con menos de 3 puntos: una recta con 2 datos no dice nada.
export function ajustarLineal(y: number[]): Regresion | null {
  const n = y.length;
  if (n < 3) return null;

  const xs = y.map((_, i) => i);
  const sx = xs.reduce((s, x) => s + x, 0);
  const sy = y.reduce((s, v) => s + v, 0);
  const sxx = xs.reduce((s, x) => s + x * x, 0);
  const sxy = xs.reduce((s, x, i) => s + x * y[i], 0);

  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;

  const pendiente = (n * sxy - sx * sy) / denom;
  const intercepto = (sy - pendiente * sx) / n;

  const my = sy / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercepto + pendiente * i;
    ssRes += (y[i] - pred) ** 2;
    ssTot += (y[i] - my) ** 2;
  }
  // n-2 grados de libertad (se estimaron pendiente e intercepto).
  const sigma = Math.sqrt(ssRes / Math.max(n - 2, 1));
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { pendiente, intercepto, sigma, r2, n };
}

export interface PuntoPronostico {
  paso: number; // 1 = próximo domingo, 2 = el siguiente…
  valor: number; // proyección central (nunca negativa)
  bajo: number; // extremo inferior de la banda
  alto: number; // extremo superior de la banda
}

/**
 * Proyecta `pasos` domingos hacia adelante. La banda parte en ±sigma y se
 * ensancha con la distancia (más lejos = menos certeza), que es justo lo que
 * hay que comunicar para no dar falsa precisión.
 */
export function proyectar(reg: Regresion, pasos: number): PuntoPronostico[] {
  const out: PuntoPronostico[] = [];
  for (let k = 1; k <= pasos; k++) {
    const x = reg.n - 1 + k; // el índice sigue después del último domingo real
    const centro = reg.intercepto + reg.pendiente * x;
    const ancho = reg.sigma * (1 + 0.2 * (k - 1)); // crece ~20% por paso
    out.push({
      paso: k,
      valor: Math.max(0, Math.round(centro)),
      bajo: Math.max(0, Math.round(centro - ancho)),
      alto: Math.max(0, Math.round(centro + ancho)),
    });
  }
  return out;
}

// Etiqueta honesta de cuánta confianza merece la recta, según cuánto ajusta y
// cuántos datos hay. Es lo que se le muestra al pastor para que no
// sobreinterprete una línea con pocos puntos.
export function confiabilidad(reg: Regresion): 'buena' | 'moderada' | 'baja' {
  if (reg.n >= 12 && reg.r2 >= 0.5) return 'buena';
  if (reg.n >= 8 && reg.r2 >= 0.25) return 'moderada';
  return 'baja';
}
