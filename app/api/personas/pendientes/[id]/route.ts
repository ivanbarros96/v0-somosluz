import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { soloTomaAsistencia } from '@/lib/roles';

// Aprobar o rechazar una ficha llegada por el formulario público.
//
// Las dos operaciones filtran por `pendiente_revision = true` además del id.
// Eso es a propósito: aunque alguien llame al endpoint a mano con el id de un
// miembro real, no puede borrarlo ni tocarlo por acá — este camino solo
// alcanza a lo que está esperando revisión.

function guardia(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  // Los perfiles que solo toman asistencia (ministerios y Kids) no administran
  // fichas.
  if (soloTomaAsistencia(session.role)) {
    return NextResponse.json({ error: 'Tu perfil no revisa registros' }, { status: 403 });
  }
  return null;
}

// POST — aprobar: la persona pasa a ser miembro normal y aparece en todos lados.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rechazo = guardia(req);
  if (rechazo) return rechazo;

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('personas')
    .update({ pendiente_revision: false })
    .eq('id', id)
    .eq('pendiente_revision', true)
    .select('id, nombre')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: 'Ese registro ya no está pendiente' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, nombre: data.nombre });
}

// DELETE — rechazar: se descarta la ficha. No pide clave del pastor porque
// todavía no es un miembro: es una solicitud sin aprobar y no tiene historial
// que perder.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rechazo = guardia(req);
  if (rechazo) return rechazo;

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('personas')
    .delete()
    .eq('id', id)
    .eq('pendiente_revision', true)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: 'Ese registro ya no está pendiente' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
