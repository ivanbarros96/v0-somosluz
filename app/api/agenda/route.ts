import { NextRequest, NextResponse, after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { notificarPropuestaNueva } from '@/lib/agenda-avisos';

// Lee cookie de sesión => siempre dinámico, nunca cacheado.
export const dynamic = 'force-dynamic';

// GET /api/agenda — todos los eventos de la agenda compartida.
//
// Sin filtro por rol: la gracia de esta pantalla es justamente que todos vean
// las fechas de todos, para no chocar entre ministerios. Lo que sí cambia por
// rol es quién puede confirmar (ver PATCH en [id]).
export async function GET(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('agenda_eventos')
    .select(
      'id, titulo, fecha, hora, ministerio, nota, solicitante_id, solicitante_nombre, estado, creado_por, resuelto_por, resuelto_at, motivo_rechazo, created_at',
    )
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: true });

  if (error) {
    return NextResponse.json({ error: 'No pudimos cargar la agenda' }, { status: 500 });
  }

  return NextResponse.json({ eventos: data ?? [] });
}

// POST /api/agenda — proponer una fecha.
//
// Cualquier rol con sesión puede proponer, incluidos los ministerios: es el
// punto de la agenda. Todo nace como 'propuesta' y espera confirmación de
// Secretaría, Pastor o Co-pastor — nadie confirma su propia fecha de entrada,
// ni siquiera quien tiene permiso para confirmar, así queda el registro de
// que alguien la revisó.
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
  const fecha = typeof body.fecha === 'string' ? body.fecha.trim() : '';
  const hora = typeof body.hora === 'string' && body.hora.trim() ? body.hora.trim() : null;
  const ministerio =
    typeof body.ministerio === 'string' && body.ministerio.trim() ? body.ministerio.trim() : null;
  const nota = typeof body.nota === 'string' && body.nota.trim() ? body.nota.trim() : null;
  const solicitanteId = typeof body.solicitante_id === 'number' ? body.solicitante_id : null;

  if (!titulo || !fecha) {
    return NextResponse.json({ error: 'El título y la fecha son obligatorios' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }
  if (hora && !/^\d{2}:\d{2}$/.test(hora)) {
    return NextResponse.json({ error: 'Hora inválida' }, { status: 400 });
  }
  if (titulo.length > 120) {
    return NextResponse.json({ error: 'El título es demasiado largo' }, { status: 400 });
  }
  if (nota && nota.length > 500) {
    return NextResponse.json({ error: 'La nota es demasiado larga' }, { status: 400 });
  }
  if (!solicitanteId) {
    return NextResponse.json({ error: 'Indica quién solicita el evento' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // El nombre y el correo se resuelven ACÁ y no se reciben del cliente: si
  // llegaran en el body, cualquiera podría mandar el aviso a un correo
  // arbitrario haciéndolo pasar por un miembro.
  const { data: persona, error: errPersona } = await db
    .from('personas')
    .select('nombre, email')
    .eq('id', solicitanteId)
    .maybeSingle();

  if (errPersona) {
    return NextResponse.json({ error: errPersona.message }, { status: 500 });
  }
  if (!persona) {
    return NextResponse.json({ error: 'Esa persona no existe' }, { status: 404 });
  }

  const { data: creado, error } = await db
    .from('agenda_eventos')
    .insert({
      titulo,
      fecha,
      hora,
      ministerio,
      nota,
      solicitante_id: solicitanteId,
      solicitante_nombre: persona.nombre,
      creado_por: session.role,
    })
    .select('id, titulo, fecha, hora, solicitante_nombre')
    .single();

  if (error) {
    return NextResponse.json({ error: 'No pudimos guardar el evento' }, { status: 500 });
  }

  // Se avisa DESPUÉS de responder: no le agrega espera a quien propuso, y si
  // el correo falla el evento ya quedó guardado igual.
  after(() =>
    notificarPropuestaNueva({
      titulo: creado.titulo,
      fecha: creado.fecha,
      hora: creado.hora,
      solicitante: creado.solicitante_nombre,
      propuestoPor: session.role,
    }),
  );

  return NextResponse.json({ ok: true, id: creado.id });
}
