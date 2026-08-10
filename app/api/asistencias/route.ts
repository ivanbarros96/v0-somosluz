import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ministerioDeRol, esRolKids, TIPOS_MARCABLES_KIDS } from '@/lib/roles';

interface Body {
  cultoId?: number | string;
  personaId?: number | string;
  miembroNuevoId?: number | string;
}

// Un rol de ministerio solo puede marcar asistencia en cultos de su tipo
async function cultoFueraDeAlcance(role: string, cultoId: number | string): Promise<boolean> {
  const ministerio = ministerioDeRol(role);
  if (!ministerio) return false;
  const { data } = await getSupabaseAdmin().from('cultos').select('tipo').eq('id', cultoId).single();
  return !data || data.tipo !== ministerio;
}

// Kids: además de la regla de ministerio (que ya lo limita a cultos de tipo
// 'kids'), solo mientras el culto siga abierto y solo sobre niños o visitantes.
// Se valida aquí y no solo en la UI porque ocultar un botón no impide llamar
// al endpoint a mano. Devuelve el motivo del rechazo o null.
async function kidsFueraDeAlcance(
  role: string,
  cultoId: number | string,
  personaId?: number | string,
): Promise<string | null> {
  if (!esRolKids(role)) return null;

  const db = getSupabaseAdmin();
  const { data: culto } = await db.from('cultos').select('activo').eq('id', cultoId).single();
  if (!culto) return 'El culto no existe';
  if (!culto.activo) {
    return 'La clase ya fue cerrada junto con el culto dominical';
  }

  // Sin personaId es un visitante (miembros_nuevos): no trae categoría y Kids
  // sí puede marcarlo — ver TIPOS_MARCABLES_KIDS.
  if (personaId) {
    const { data: persona } = await db
      .from('personas')
      .select('source_tipo')
      .eq('id', personaId)
      .single();
    if (!persona || !TIPOS_MARCABLES_KIDS.includes(persona.source_tipo)) {
      return 'Tu perfil solo puede marcar la asistencia de los niños';
    }
  }

  return null;
}

// GET /api/asistencias — lectura de asistencias. Requiere sesión.
// Sustituye la lectura directa con anon key (ver GET /api/personas).
//   ?cultoId=N       → { asistencias: [{persona_id, miembro_nuevo_id}] } de ese culto
//   ?conFechaCulto=1 → { asistencias: [{persona_id, cultos: {fecha}}] } (solo personas)
//   (sin parámetros) → { asistencias: [{culto_id, persona_id, miembro_nuevo_id}] }
export async function GET(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const db = getSupabaseAdmin();

  const cultoId = searchParams.get('cultoId');
  if (cultoId) {
    const { data, error } = await db
      .from('asistencias')
      .select('persona_id, miembro_nuevo_id')
      .eq('culto_id', cultoId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ asistencias: data ?? [] });
  }

  if (searchParams.get('conFechaCulto')) {
    const { data, error } = await db
      .from('asistencias')
      .select('persona_id, cultos(fecha)')
      .not('persona_id', 'is', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ asistencias: data ?? [] });
  }

  const { data, error } = await db
    .from('asistencias')
    .select('culto_id, persona_id, miembro_nuevo_id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ asistencias: data ?? [] });
}

// POST /api/asistencias — marcar presente
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { cultoId, personaId, miembroNuevoId }: Body = await req.json().catch(() => ({}));
  if (!cultoId || (!personaId && !miembroNuevoId)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  if (await cultoFueraDeAlcance(session.role, cultoId)) {
    return NextResponse.json({ error: 'Este culto no pertenece a tu ministerio' }, { status: 403 });
  }
  const rechazoKids = await kidsFueraDeAlcance(session.role, cultoId, personaId);
  if (rechazoKids) {
    return NextResponse.json({ error: rechazoKids }, { status: 403 });
  }

  const row: Record<string, unknown> = { culto_id: cultoId, fecha_registro: new Date().toISOString() };
  if (miembroNuevoId) row.miembro_nuevo_id = miembroNuevoId;
  else row.persona_id = personaId;

  const { error } = await getSupabaseAdmin().from('asistencias').insert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await reflejarEnDominical(cultoId, personaId, miembroNuevoId);

  return NextResponse.json({ ok: true });
}

// Estar en la clase de Kids implica haber venido a la iglesia, así que marcar
// a alguien en el culto de Kids lo marca también en el dominical de esa fecha.
//
// La relación NO es simétrica y eso es a propósito:
//  - dominical sí, Kids no  → vino a la iglesia pero no entró a la sala. Dato
//    válido: se deja tal cual.
//  - Kids sí, dominical no  → imposible en la realidad, así que se completa.
//  - al DESMARCAR de Kids no se toca el dominical: que la maestra corrija su
//    lista no borra el hecho de que el niño vino a la iglesia.
async function reflejarEnDominical(
  cultoId: number | string,
  personaId?: number | string,
  miembroNuevoId?: number | string,
): Promise<void> {
  const db = getSupabaseAdmin();

  const { data: culto } = await db.from('cultos').select('fecha, tipo').eq('id', cultoId).single();
  if (culto?.tipo !== 'kids') return;

  const { data: dominical } = await db
    .from('cultos')
    .select('id')
    .eq('tipo', 'general')
    .eq('fecha', culto.fecha)
    .maybeSingle();
  if (!dominical) return; // sin dominical esa fecha no hay nada que reflejar

  const fechaRegistro = new Date().toISOString();

  try {
    if (personaId) {
      // La restricción UNIQUE(culto_id, persona_id) hace que, si Somos Luz ya
      // lo había marcado, esto no duplique ni pise la marca original.
      await db.from('asistencias').upsert(
        { culto_id: dominical.id, persona_id: personaId, fecha_registro: fechaRegistro },
        { onConflict: 'culto_id,persona_id', ignoreDuplicates: true },
      );
    } else if (miembroNuevoId) {
      // Los visitantes no tienen restricción única, así que se comprueba a mano.
      const { data: yaEsta } = await db
        .from('asistencias')
        .select('id')
        .eq('culto_id', dominical.id)
        .eq('miembro_nuevo_id', miembroNuevoId)
        .maybeSingle();
      if (!yaEsta) {
        await db.from('asistencias').insert({
          culto_id: dominical.id,
          miembro_nuevo_id: miembroNuevoId,
          fecha_registro: fechaRegistro,
        });
      }
    }
  } catch (e) {
    // La marca en Kids —que es lo que pidió la maestra— ya quedó guardada.
    // Un fallo acá no debe devolver error ni bloquear la toma de asistencia.
    console.error('No se pudo reflejar la asistencia en el dominical:', e);
  }
}

// DELETE /api/asistencias — desmarcar presente
export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { cultoId, personaId, miembroNuevoId }: Body = await req.json().catch(() => ({}));
  if (!cultoId || (!personaId && !miembroNuevoId)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  if (await cultoFueraDeAlcance(session.role, cultoId)) {
    return NextResponse.json({ error: 'Este culto no pertenece a tu ministerio' }, { status: 403 });
  }
  const rechazoKids = await kidsFueraDeAlcance(session.role, cultoId, personaId);
  if (rechazoKids) {
    return NextResponse.json({ error: rechazoKids }, { status: 403 });
  }

  let query = getSupabaseAdmin().from('asistencias').delete().eq('culto_id', cultoId);
  query = miembroNuevoId
    ? query.eq('miembro_nuevo_id', miembroNuevoId)
    : query.eq('persona_id', personaId!);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
