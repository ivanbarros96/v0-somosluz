// Retención por cohorte de miembros. Responde "de los que llegaron en tal mes,
// ¿cuántos siguen viniendo N meses después?". Es análisis descriptivo del deck
// de modelos, pero de los que de verdad informan una decisión (el embudo
// visitante → miembro que ya existe).
//
// Clave metodológica: el denominador de cada cohorte incluye a quienes LUEGO se
// dieron de baja. Si contáramos solo a los activos de hoy, mediríamos
// sobrevivientes y la retención saldría inflada — justo el tipo de número
// engañoso que la presentación advierte. Los que se fueron simplemente dejan de
// asistir, así que su retención cae sola en los meses siguientes.

export interface CeldaRetencion {
  mes: number; // meses desde que se unió (0 = mes de ingreso)
  pct: number; // 0-100
  retenidos: number;
}

export interface CohorteRetencion {
  cohorte: string; // 'yyyy-MM' del mes de ingreso
  tamano: number; // cuántos se unieron ese mes (incluye a los que ya se fueron)
  celdas: CeldaRetencion[]; // una por cada mes transcurrido, desde 0
}

export interface MiembroCohorte {
  joinMes: string; // 'yyyy-MM' en que se unió
  mesesAsistidos: Set<string>; // meses 'yyyy-MM' con al menos una asistencia
}

// Suma k meses a un 'yyyy-MM', normalizando el desborde de año.
function sumarMes(ym: string, k: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + k, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Diferencia a - b en meses.
function diffMeses(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (ay - by) * 12 + (am - bm);
}

/**
 * @param miembros    uno por persona real (incluidos los dados de baja), NO los
 *                    pendientes de aprobación ni los visitantes.
 * @param mesActual   'yyyy-MM' de referencia (inyectable para pruebas).
 * @returns cohortes de la más antigua a la más reciente.
 */
export function calcularCohortes(
  miembros: MiembroCohorte[],
  mesActual: string,
): CohorteRetencion[] {
  const porCohorte = new Map<string, MiembroCohorte[]>();
  for (const m of miembros) {
    // Ignora fechas de ingreso futuras (datos mal cargados).
    if (diffMeses(m.joinMes, mesActual) > 0) continue;
    const arr = porCohorte.get(m.joinMes) ?? [];
    arr.push(m);
    porCohorte.set(m.joinMes, arr);
  }

  return [...porCohorte.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cohorte, integrantes]) => {
      const transcurridos = diffMeses(mesActual, cohorte); // 0..N
      const celdas: CeldaRetencion[] = [];
      for (let mes = 0; mes <= transcurridos; mes++) {
        const mesCalendario = sumarMes(cohorte, mes);
        const retenidos = integrantes.filter((m) => m.mesesAsistidos.has(mesCalendario)).length;
        celdas.push({
          mes,
          retenidos,
          pct: integrantes.length ? Math.round((retenidos / integrantes.length) * 100) : 0,
        });
      }
      return { cohorte, tamano: integrantes.length, celdas };
    });
}
