import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/finanzas/rango — fecha del primer registro (ingreso o egreso), para
// armar el listado de meses del selector. null si todavía no hay nada.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const [{ data: ingreso }, { data: egreso }] = await Promise.all([
    db.from('finanzas_ingresos').select('fecha').order('fecha', { ascending: true }).limit(1).maybeSingle(),
    db.from('finanzas_egresos').select('fecha').order('fecha', { ascending: true }).limit(1).maybeSingle(),
  ]);

  const fechas = [ingreso?.fecha, egreso?.fecha].filter(Boolean) as string[];
  const desde = fechas.length ? fechas.sort()[0] : null;

  return NextResponse.json({ desde });
}
