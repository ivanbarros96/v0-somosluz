import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';

// Lee cookie de sesión => siempre dinámico, nunca cacheado.
export const dynamic = 'force-dynamic';

// Cuántas solicitudes acepta un mismo origen por día.
//
// Es el límite "por navegador" que pidió Iván. No se implementa en el
// navegador —localStorage se borra con un clic y no frena nada— sino contando
// del lado del servidor cuántas entraron hoy desde el mismo origen.
const MAX_POR_DIA = 5;

/**
 * Huella del origen de la petición. Se guarda el HMAC, nunca la IP.
 *
 * Alcanza para contar cuántas solicitudes mandó el mismo origen hoy, pero no
 * deja un registro de direcciones reales en la base. Se firma con AUTH_SECRET
 * para que el hash no se pueda reconstruir probando IPs.
 */
function huellaOrigen(req: NextRequest): string | null {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    '';
  const secret = process.env.AUTH_SECRET;
  if (!ip || !secret) return null; // En local no hay IP: no se limita nada.
  return createHmac('sha256', secret).update(ip).digest('hex');
}

// GET /api/agenda — todos los eventos. Esto SÍ pide sesión.
//
// El formulario para pedir una fecha es abierto, pero la agenda armada no:
// muestra qué hace cada ministerio y quién lo pidió.
export async function GET(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('agenda_eventos')
    .select(
      'id, titulo, fecha, hora, ministerio, nota, solicitante_nombre, solicitante_email, estado, creado_por, resuelto_por, resuelto_at, motivo_rechazo, created_at',
    )
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: true });

  if (error) {
    return NextResponse.json({ error: 'No pudimos cargar la agenda' }, { status: 500 });
  }

  return NextResponse.json({ eventos: data ?? [] });
}

// POST /api/agenda — pedir una fecha. Endpoint PÚBLICO, sin sesión.
//
// Va sin login a propósito (decisión de Iván, 29/08/2026): varios líderes de
// ministerio no tienen cuenta en la intranet, y eran justamente los que
// necesitaban coordinar fechas. Es la ÚNICA vía para pedir una fecha —
// también la usan los que sí tienen cuenta, así hay un solo flujo.
//
// Al ser abierto lleva tres defensas: honeypot, tope diario por origen y
// validación de largos. Confirmar sigue siendo privado (ver [id]/route.ts).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Honeypot: invisible para las personas, los bots lo rellenan. Se responde
  // ok para no darle pistas al bot de que fue descartado.
  //
  // Se llama `sitio_web` y NO `telefono`, que es el error que ya cometimos en
  // el formulario de oración: ahí el honeypot ocupaba el nombre de un campo
  // real y toda petición con teléfono se descartaba en silencio.
  if (typeof body.sitio_web === 'string' && body.sitio_web.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
  const fecha = typeof body.fecha === 'string' ? body.fecha.trim() : '';
  const hora = typeof body.hora === 'string' && body.hora.trim() ? body.hora.trim() : null;
  const ministerio =
    typeof body.ministerio === 'string' && body.ministerio.trim() ? body.ministerio.trim() : null;
  const nota = typeof body.nota === 'string' && body.nota.trim() ? body.nota.trim() : null;
  const nombre = typeof body.solicitante_nombre === 'string' ? body.solicitante_nombre.trim() : '';
  const email = typeof body.solicitante_email === 'string' ? body.solicitante_email.trim() : '';

  if (!titulo || !fecha || !nombre || !email) {
    return NextResponse.json(
      { error: 'Tu nombre, tu correo, el título y la fecha son obligatorios' },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }
  if (hora && !/^\d{2}:\d{2}$/.test(hora)) {
    return NextResponse.json({ error: 'Hora inválida' }, { status: 400 });
  }
  // Validación deliberadamente laxa: sólo descarta lo que claramente no es un
  // correo. Una expresión estricta rechaza direcciones válidas y raras.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ese correo no se ve válido' }, { status: 400 });
  }
  if (titulo.length > 120 || nombre.length > 100 || email.length > 200) {
    return NextResponse.json({ error: 'Datos demasiado largos' }, { status: 400 });
  }
  if (nota && nota.length > 500) {
    return NextResponse.json({ error: 'La nota es demasiado larga' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const ipHash = huellaOrigen(req);

  if (ipHash) {
    // Ventana móvil de 24 horas, no "desde medianoche": así no se libera el
    // cupo entero de golpe a las 00:00.
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from('agenda_eventos')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', desde);

    if ((count ?? 0) >= MAX_POR_DIA) {
      return NextResponse.json(
        { error: 'Ya enviaste varias solicitudes hoy. Inténtalo mañana o avísale a Secretaría.' },
        { status: 429 },
      );
    }
  }

  // Si la petición trae sesión se deja registrado el rol; si no, 'publico'.
  // Sirve para saber de dónde entró, sin cambiar en nada el permiso.
  const session = getSession(req);

  const { data: creado, error } = await db
    .from('agenda_eventos')
    .insert({
      titulo,
      fecha,
      hora,
      ministerio,
      nota,
      solicitante_nombre: nombre,
      solicitante_email: email,
      creado_por: session?.role ?? 'publico',
      ip_hash: ipHash,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: 'No pudimos guardar tu solicitud' }, { status: 500 });
  }

  // No se manda correo a quienes confirman: se enteran por el contador naranja
  // del menú, igual que con las fichas de miembros esperando autorización. Es
  // el patrón que el equipo ya tiene incorporado, y agregarle un correo encima
  // sería ruido — entran a la agenda cuando pueden.
  //
  // El correo SÍ existe en el otro sentido (ver PATCH en [id]/route.ts): a
  // quien pidió la fecha hay que avisarle, porque puede ser un líder sin
  // cuenta y no tiene dónde ir a mirar si le aprobaron.

  return NextResponse.json({ ok: true, id: creado.id });
}
