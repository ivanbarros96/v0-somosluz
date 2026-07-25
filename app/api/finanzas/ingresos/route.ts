import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esTipoIngreso, rangoMes } from '@/lib/finanzas';

// GET /api/finanzas/ingresos?mes=YYYY-MM — listar ingresos del mes (solo pastor)
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { desde, hasta } = rangoMes(req.nextUrl.searchParams.get('mes'));

  const { data, error } = await getSupabaseAdmin()
    .from('finanzas_ingresos')
    .select('id, fecha, tipo, monto, notas, created_at')
    .gte('fecha', desde)
    .lt('fecha', hasta)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ingresos: data ?? [] });
}

// POST /api/finanzas/ingresos — registrar un ingreso (solo pastor)
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { fecha, tipo, monto, notas } = await req.json().catch(() => ({}));

  if (!fecha || !esTipoIngreso(tipo) || !(Number(monto) > 0)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('finanzas_ingresos')
    .insert({
      fecha,
      tipo,
      monto: Number(monto),
      notas: typeof notas === 'string' && notas.trim() ? notas.trim() : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ingreso: data });
}
