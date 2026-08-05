import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/finanzas/categorias-frecuentes — nombres de categoría personalizada
// ("Otros: X") que se repitieron más de 2 veces en TODO el historial (no solo
// el mes filtrado). Se ofrecen como atajo en el selector de categoría para no
// tener que volver a escribirlas cada vez.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('finanzas_egresos')
    .select('categoria_personalizada')
    .eq('categoria', 'otros')
    .not('categoria_personalizada', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const conteo = new Map<string, number>();
  for (const row of data ?? []) {
    const texto = row.categoria_personalizada?.trim();
    if (!texto) continue;
    conteo.set(texto, (conteo.get(texto) ?? 0) + 1);
  }

  const categorias = [...conteo.entries()]
    .filter(([, n]) => n > 2)
    .sort((a, b) => b[1] - a[1])
    .map(([texto]) => texto);

  return NextResponse.json({ categorias });
}
