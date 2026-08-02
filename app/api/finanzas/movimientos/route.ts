import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { calcularMovimientos } from '@/lib/finanzas-movimientos';

// GET /api/finanzas/movimientos?mes=YYYY-MM|general — ingresos + egresos
// combinados en orden cronológico con saldo corrido (estilo cartola bancaria).
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const mesParam = req.nextUrl.searchParams.get('mes');
  const db = getSupabaseAdmin();

  let visibles;
  try {
    visibles = await calcularMovimientos(mesParam);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // Firmamos URL solo de los comprobantes que realmente se van a mostrar.
  const movimientos = await Promise.all(
    visibles.map(async (m) => {
      let comprobante_url: string | null = null;
      if (m.tipo === 'egreso' && m.comprobante_path) {
        const { data: signed } = await db.storage
          .from('comprobantes')
          .createSignedUrl(m.comprobante_path, 3600);
        comprobante_url = signed?.signedUrl ?? null;
      }
      return {
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        detalle: m.detalle,
        categoria: m.categoria ?? null,
        personaNombre: m.personaNombre ?? null,
        monto: m.monto,
        saldo: m.saldo,
        comprobante_url,
      };
    }),
  );

  return NextResponse.json({ movimientos: movimientos.reverse() });
}
