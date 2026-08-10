import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esRolKids } from '@/lib/roles';

// POST /api/miembros-nuevos/[id]/convertir — convierte un visitante en miembro
// conservando su historial de asistencias.
//
// El historial es el punto delicado: la tabla `asistencias` guarda O
// `persona_id` O `miembro_nuevo_id`, así que convertir es re-apuntar esas
// filas de una columna a la otra. Las MISMAS filas cambian de dueño, no se
// borran ni se recrean: si el visitante tenía 5 asistencias, el miembro nuevo
// nace con esas 5.
//
// Supabase no expone transacciones desde el cliente JS, así que el orden de
// los pasos es la protección: nunca se borra nada antes de haber movido el
// historial, y si un paso falla se deshace el anterior.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  // Mismas reglas que POST /api/personas: el Pastor no registra y Kids solo
  // toma asistencia.
  if (session.role === 'pastor') {
    return NextResponse.json({ error: 'El perfil Pastor no registra miembros.' }, { status: 403 });
  }
  if (esRolKids(session.role)) {
    return NextResponse.json({ error: 'Tu perfil no registra miembros.' }, { status: 403 });
  }

  const { id } = await params;
  const ficha = await req.json().catch(() => null);
  if (!ficha || typeof ficha !== 'object' || !ficha.nombre || !ficha.source_tipo) {
    return NextResponse.json({ error: 'Faltan datos de la ficha' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: visitante, error: errVisita } = await db
    .from('miembros_nuevos')
    .select('id, nombre')
    .eq('id', id)
    .maybeSingle();
  if (errVisita) return NextResponse.json({ error: errVisita.message }, { status: 500 });
  if (!visitante) {
    return NextResponse.json({ error: 'Ese visitante ya no existe' }, { status: 404 });
  }

  // Paso 1 — crear la ficha de miembro.
  const { data: persona, error: errPersona } = await db
    .from('personas')
    .insert({ ...ficha, fecha_registro: ficha.fecha_registro ?? new Date().toISOString() })
    .select('id')
    .single();
  if (errPersona || !persona) {
    return NextResponse.json(
      { error: errPersona?.message ?? 'No se pudo crear la ficha' },
      { status: 500 },
    );
  }

  // Paso 2 — mover el historial. Si falla, se borra la ficha recién creada
  // para no dejar un miembro a medias, y el visitante queda intacto.
  const { error: errHistorial } = await db
    .from('asistencias')
    .update({ persona_id: persona.id, miembro_nuevo_id: null })
    .eq('miembro_nuevo_id', id);
  if (errHistorial) {
    await db.from('personas').delete().eq('id', persona.id);
    return NextResponse.json(
      { error: `No se pudo mover el historial: ${errHistorial.message}` },
      { status: 500 },
    );
  }

  // Paso 3 — recién ahora se elimina el registro de visitante. Si esto falla,
  // el historial ya está a salvo en la ficha nueva: queda un visitante
  // duplicado sin asistencias, que se puede borrar a mano. Nunca se pierde
  // historial, que es lo que importa.
  const { error: errBorrado } = await db.from('miembros_nuevos').delete().eq('id', id);
  if (errBorrado) {
    return NextResponse.json(
      {
        error:
          'El miembro se creó con su historial, pero no se pudo eliminar el registro de visitante. Avisa al administrador.',
        personaId: persona.id,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, personaId: persona.id });
}
