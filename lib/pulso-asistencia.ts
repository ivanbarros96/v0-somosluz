// "¿Cómo nos fue la última vez comparado con lo normal?"
//
// Es la pregunta que un pastor hace de verdad al mirar la asistencia. Un número
// suelto ("vinieron 48") no responde nada: 48 puede ser un récord o una caída,
// depende de a qué está acostumbrada esa reunión. Por eso se compara la última
// reunión contra el promedio de las anteriores del MISMO tipo.

export interface Pulso {
  /** Asistentes en la última reunión ya realizada. */
  ultima: number;
  /** Promedio de las reuniones anteriores (lo "normal" de esta reunión). */
  normal: number;
  /** Diferencia respecto a lo normal, en % entero. Positivo = arriba. */
  desvioPct: number;
  nivel: 'arriba' | 'normal' | 'abajo';
  /** Cuántas reuniones anteriores se usaron como referencia. */
  base: number;
}

/**
 * @param serie Totales por reunión, en orden cronológico (la última al final).
 * @param ventana Cuántas reuniones anteriores forman la referencia.
 * @param umbral Cuánto hay que desviarse (en %) para no llamarlo "normal".
 */
export function pulsoAsistencia(
  serie: { total: number }[],
  ventana = 6,
  umbral = 10,
): Pulso | null {
  // 1 reunión a evaluar + al menos 3 de referencia. Con menos, cualquier
  // "subimos 40%" sería ruido y llevaría a conclusiones falsas.
  if (serie.length < 4) return null;

  const ultima = serie[serie.length - 1].total;
  const previas = serie.slice(Math.max(0, serie.length - 1 - ventana), serie.length - 1);
  if (previas.length < 3) return null;

  const promedio = previas.reduce((s, x) => s + x.total, 0) / previas.length;
  // Sin base no hay porcentaje posible (dividir por cero).
  if (promedio <= 0) return null;

  const desvioPct = Math.round(((ultima - promedio) / promedio) * 100);

  return {
    ultima,
    normal: Math.round(promedio),
    desvioPct,
    nivel: desvioPct >= umbral ? 'arriba' : desvioPct <= -umbral ? 'abajo' : 'normal',
    base: previas.length,
  };
}
