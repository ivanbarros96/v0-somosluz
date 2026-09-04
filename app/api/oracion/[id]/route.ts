import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeVerOracion } from '@/lib/roles';

// DELETE /api/oracion/[id] — elimina una petición.
//
// Quien administra las peticiones puede eliminarlas por su cuenta, sin la
// clave del pastor (permiso pedido por Nicole, decidido por Iván el
// 03/09/2026). Antes el perfil Oración tenía que pedírsela, lo que la dejaba
// bloqueada para limpiar duplicados o pruebas.
//
// A cambio, el borrado dejó de ser destructivo: marca `archivada_en` en vez de
// borrar la fila. Desde la app se comporta igual —desaparece de la lista— pero
// se puede deshacer en el momento (PATCH con restaurar) y el dato sigue ahí si
// alguna vez hay que recuperarlo. Una petición de oración es algo que una
// persona confió a la iglesia; un toque equivocado no debería borrarla para
// siempre.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('peticiones_oracion')
    .update({ archivada_en: new Date().toISOString() })
    .eq('id', id)
    .is('archivada_en', null)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'No pudimos eliminar' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Esa petición ya no existe' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
