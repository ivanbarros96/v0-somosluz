import { NextRequest, NextResponse, after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeAutorizarAgenda } from '@/lib/roles';
import { notificarResolucion } from '@/lib/agenda-avisos';
import { normalizarHora } from '../route';

export const dynamic = 'force-dynamic';

// PATCH /api/agenda/[id] — confirmar, rechazar o corregir un evento.
//
// Todo esto es exclusivo de Secretaría, Pastor y Co-pastor (decisión de Iván,
// 29/08/2026): el líder propone y ahí queda. Se comprueba ACÁ y no sólo
// ocultando los botones — si el candado viviera únicamente en la pantalla,
// bastaría con llamar al endpoint para confirmarse la propia fecha.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || !puedeAutorizarAgenda(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const accion = typeof body.accion === 'string' ? body.accion : '';
  const db = getSupabaseAdmin();

  if (accion === 'editar') {
    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
    const fecha = typeof body.fecha === 'string' ? body.fecha.trim() : '';
    // Acepta "HH:MM" y "HH:MM:SS" (algunos navegadores agregan segundos) y
    // guarda "HH:MM". Ver normalizarHora en ../route.
    const hora = normalizarHora(body.hora);
    const ministerio =
      typeof body.ministerio === 'string' && body.ministerio.trim() ? body.ministerio.trim() : null;
    const nota = typeof body.nota === 'string' && body.nota.trim() ? body.nota.trim() : null;

    if (!titulo || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ error: 'Título y fecha son obligatorios' }, { status: 400 });
    }
    if (hora === 'ERR') {
      return NextResponse.json({ error: 'Hora inválida' }, { status: 400 });
    }
    if (titulo.length > 120 || (nota && nota.length > 500)) {
      return NextResponse.json({ error: 'Datos demasiado largos' }, { status: 400 });
    }

    const { error } = await db
      .from('agenda_eventos')
      .update({ titulo, fecha, hora, ministerio, nota })
      .eq('id', id);

    if (error) return NextResponse.json({ error: 'No pudimos guardar' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (accion !== 'confirmar' && accion !== 'rechazar') {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }

  const confirmada = accion === 'confirmar';
  const motivo =
    !confirmada && typeof body.motivo === 'string' && body.motivo.trim()
      ? body.motivo.trim().slice(0, 500)
      : null;

  const { data: evento, error } = await db
    .from('agenda_eventos')
    .update({
      estado: confirmada ? 'confirmada' : 'rechazada',
      resuelto_por: session.role,
      resuelto_at: new Date().toISOString(),
      motivo_rechazo: motivo,
    })
    .eq('id', id)
    .select('titulo, fecha, hora, solicitante_nombre, solicitante_email')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'No pudimos actualizar' }, { status: 500 });
  }
  if (!evento) {
    return NextResponse.json({ error: 'Ese evento no existe' }, { status: 404 });
  }

  // El correo sale de la propia solicitud: lo escribió quien la mandó desde el
  // formulario público. No se busca en `personas` porque quien pide una fecha
  // no tiene por qué estar en el padrón.
  after(() =>
    notificarResolucion({
      titulo: evento.titulo,
      fecha: evento.fecha,
      hora: evento.hora,
      solicitante: evento.solicitante_nombre,
      emailSolicitante: evento.solicitante_email,
      confirmada,
      motivo,
      resueltoPor: session.role,
    }),
  );

  return NextResponse.json({ ok: true });
}

// DELETE /api/agenda/[id] — borrar un evento. Mismo candado que arriba.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || !puedeAutorizarAgenda(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('agenda_eventos')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'No pudimos borrar' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Ese evento no existe' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
