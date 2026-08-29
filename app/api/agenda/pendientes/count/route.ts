import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeAutorizarAgenda } from '@/lib/roles';

// Lee cookie de sesión => siempre dinámico, nunca cacheado.
export const dynamic = 'force-dynamic';

// GET /api/agenda/pendientes/count — cuántas fechas esperan confirmación.
//
// Liviano a propósito: head + count, sin traer filas. Alimenta el badge del
// menú por polling, igual que las fichas pendientes y las peticiones de
// oración. Sin él habría que entrar a la agenda para enterarse de que alguien
// propuso algo.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  // Misma regla que confirmar: el aviso sólo tiene sentido para quien puede
  // actuar sobre él.
  if (!session || !puedeAutorizarAgenda(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { count, error } = await getSupabaseAdmin()
    .from('agenda_eventos')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'propuesta');

  if (error) {
    return NextResponse.json({ error: 'No pudimos contar' }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
