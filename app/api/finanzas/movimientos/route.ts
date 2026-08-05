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
      let comprobantesUrls: string[] = [];
      if (m.tipo === 'egreso' && m.comprobantesPaths?.length) {
        const signed = await Promise.all(
          m.comprobantesPaths.map((path) =>
            db.storage.from('comprobantes').createSignedUrl(path, 3600),
          ),
        );
        comprobantesUrls = signed.map((s) => s.data?.signedUrl).filter((u): u is string => !!u);
      }
      return {
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        detalle: m.detalle,
        categoria: m.categoria ?? null,
        categoriaPersonalizada: m.categoriaPersonalizada ?? null,
        personaNombre: m.personaNombre ?? null,
        monto: m.monto,
        saldo: m.saldo,
        comprobantesUrls,
      };
    }),
  );

  return NextResponse.json({ movimientos: movimientos.reverse() });
}
