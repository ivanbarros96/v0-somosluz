import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeAutorizarFichas } from '@/lib/roles';

// Lee cookie de sesión => siempre dinámico, nunca cacheado.
export const dynamic = 'force-dynamic';

// GET /api/personas/pendientes/count — cuántos auto-registros esperan revisión.
//
// Liviano a propósito: head + count, sin traer filas. Alimenta el badge del
// menú, que se refresca por polling — el mismo patrón que las peticiones de
// oración. Antes había que entrar a la pestaña Pendientes para enterarse de
// que alguien se había registrado, y nadie está mirando esa pantalla todo el
// día.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  // Misma regla que autorizar: el aviso solo tiene sentido para quien puede
  // actuar sobre él. Mostrarle el badge a alguien que no puede aprobar sería
  // pedirle que haga algo que el sistema le va a rechazar.
  if (!session || !puedeAutorizarFichas(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { count, error } = await getSupabaseAdmin()
    .from('personas')
    .select('id', { count: 'exact', head: true })
    .eq('pendiente_revision', true);

  if (error) {
    return NextResponse.json({ error: 'No pudimos contar' }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
