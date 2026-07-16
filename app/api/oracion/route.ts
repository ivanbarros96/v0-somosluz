import { NextRequest, NextResponse, after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { getResend } from '@/lib/resend';

const ESTADOS = ['pendiente', 'orando', 'completada'] as const;

// Escapa texto de formulario público antes de meterlo en el HTML del correo.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Notifica al pastor por correo. Fallback seguro: cualquier fallo se registra
// y se ignora; jamás debe afectar el guardado de la petición.
async function notificarPastor(nombre: string, email: string, peticion: string) {
  const resend = getResend();
  if (!resend) return; // Sin RESEND_API_KEY no se envía (no rompe nada).

  const destino = process.env.ORACION_NOTIFY_TO || 'ivan.dariobc96@gmail.com';
  // En modo prueba de Resend el remitente debe ser onboarding@resend.dev.
  // Con el dominio verificado, cambiar a algo como oracion@somosluziglesia.cl.
  const remitente = process.env.ORACION_NOTIFY_FROM || 'Somos Luz <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from: remitente,
      to: destino,
      replyTo: email || undefined,
      subject: `🙏 Nueva petición de oración — ${nombre}`,
      text: `Nueva petición de oración desde el sitio de Somos Luz.\n\nDe: ${nombre}${email ? ` (${email})` : ''}\n\n${peticion}\n\nVer en la intranet: https://somosluziglesia.cl/intranet/dashboard/oracion`,
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#1f2937">
  <h2 style="margin:0 0 4px">🙏 Nueva petición de oración</h2>
  <p style="color:#6b7280;margin:0 0 16px;font-size:14px">Enviada desde el sitio de Somos Luz</p>
  <p style="margin:0 0 12px"><strong>${escapeHtml(nombre)}</strong>${email ? ` · ${escapeHtml(email)}` : ''}</p>
  <blockquote style="border-left:3px solid #f97316;margin:0 0 16px;padding:4px 0 4px 12px;white-space:pre-wrap;color:#374151">${escapeHtml(peticion)}</blockquote>
  <a href="https://somosluziglesia.cl/intranet/dashboard/oracion" style="color:#0f766e;font-weight:600;text-decoration:none">Ver en la intranet →</a>
</div>`,
    });
  } catch (err) {
    console.error('[oracion] fallo al notificar por correo', err);
  }
}

// GET /api/oracion — listar peticiones (SOLO pastor)
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('peticiones_oracion')
    .select('id, nombre, email, peticion, estado, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'No pudimos cargar las peticiones' }, { status: 500 });
  }

  return NextResponse.json({ peticiones: data ?? [] });
}

// PATCH /api/oracion — cambiar el estado de una petición (SOLO pastor)
export async function PATCH(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id, estado } = await req.json().catch(() => ({}));
  if (!id || !ESTADOS.includes(estado)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('peticiones_oracion')
    .update({ estado })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'No pudimos actualizar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// POST /api/oracion — recibir petición de oración (endpoint PÚBLICO, sin sesión)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { nombre, email, peticion, telefono } = body as Record<string, unknown>;

  // Honeypot: los humanos nunca ven este campo; si viene lleno es un bot.
  // Respondemos ok para no darle señales al bot.
  if (typeof telefono === 'string' && telefono.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const n = typeof nombre === 'string' ? nombre.trim() : '';
  const p = typeof peticion === 'string' ? peticion.trim() : '';
  const e = typeof email === 'string' ? email.trim() : '';

  if (!n || !p) {
    return NextResponse.json({ error: 'Nombre y petición son obligatorios' }, { status: 400 });
  }
  if (n.length > 100 || p.length > 2000 || e.length > 200) {
    return NextResponse.json({ error: 'Datos demasiado largos' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('peticiones_oracion').insert({
    nombre: n,
    email: e || null,
    peticion: p,
  });

  if (error) {
    return NextResponse.json({ error: 'No pudimos guardar tu petición' }, { status: 500 });
  }

  // Notifica al pastor DESPUÉS de responder: no añade latencia al formulario
  // y un fallo del correo no afecta al visitante que ya quedó guardado.
  after(() => notificarPastor(n, e, p));

  return NextResponse.json({ ok: true });
}
