import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeVerOracion } from '@/lib/roles';

// Lee cookie de sesión => siempre dinámico, nunca cacheado.
export const dynamic = 'force-dynamic';

// GET /api/oracion/pendientes — conteo de peticiones sin revisar (pastor y
// perfil Oración). Liviano: head+count, no trae filas. Alimenta el badge del
// sidebar vía polling.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { count, error } = await getSupabaseAdmin()
    .from('peticiones_oracion')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente');

  if (error) {
    return NextResponse.json({ error: 'No pudimos contar' }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
