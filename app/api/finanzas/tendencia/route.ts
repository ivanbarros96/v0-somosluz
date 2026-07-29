import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/finanzas/tendencia?meses=6 — totales de ingresos/egresos por mes
// calendario, para el gráfico de tendencia del Panel Principal (solo pastor).
// Nota: el cliente (supabase anon) no tiene policy de lectura sobre las
// tablas de finanzas a propósito — por eso este endpoint existe, en vez de
// que el dashboard consulte Supabase directo como hace con el resto de sus datos.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const n = Math.min(Math.max(Number(req.nextUrl.searchParams.get('meses')) || 6, 1), 24);
  const db = getSupabaseAdmin();

  const [{ data: ingresos, error: errIng }, { data: egresos, error: errEgr }] = await Promise.all([
    db.from('finanzas_ingresos').select('fecha, monto'),
    db.from('finanzas_egresos').select('fecha, monto'),
  ]);

  if (errIng || errEgr) {
    return NextResponse.json({ error: (errIng ?? errEgr)!.message }, { status: 500 });
  }

  const porMes: Record<string, { ingresos: number; egresos: number }> = {};
  for (const i of ingresos ?? []) {
    const key = i.fecha.slice(0, 7);
    porMes[key] ??= { ingresos: 0, egresos: 0 };
    porMes[key].ingresos += Number(i.monto);
  }
  for (const e of egresos ?? []) {
    const key = e.fecha.slice(0, 7);
    porMes[key] ??= { ingresos: 0, egresos: 0 };
    porMes[key].egresos += Number(e.monto);
  }

  // Nota: usa el mes calendario del servidor (Vercel corre en UTC), por lo
  // que en las últimas horas del último día del mes (noche en Chile) el
  // "mes actual" del gráfico podría adelantarse un día — límite conocido y
  // aceptable para un gráfico de tendencia, no para las fechas que el pastor
  // registra a mano (esas sí se corrigieron para usar hora de Chile).
  const ahora = new Date();
  const meses = [];
  for (let idx = n - 1; idx >= 0; idx--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - idx, 1);
    const key = d.toISOString().slice(0, 7);
    const label = format(d, 'MMM', { locale: es });
    const datos = porMes[key] ?? { ingresos: 0, egresos: 0 };
    meses.push({
      mes: key,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      ingresos: datos.ingresos,
      egresos: datos.egresos,
    });
  }

  return NextResponse.json({ meses });
}
