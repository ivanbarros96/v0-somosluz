import { NextRequest, NextResponse } from 'next/server';
import { getResend } from '@/lib/resend';

// ⚠️ TEMPORAL — endpoint de diagnóstico del envío de correo (Resend).
// Borrar en cuanto se confirme que la notificación de oración funciona.
// Protegido con un token en la URL para que no sea de acceso libre.
const DEBUG_TOKEN = 'somosluz-debug-2026';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('token') !== DEBUG_TOKEN) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.ORACION_NOTIFY_FROM || 'Somos Luz <onboarding@resend.dev>';
  const to = searchParams.get('to') || process.env.ORACION_NOTIFY_TO || 'torressepulvedanicole@gmail.com';

  // Estado de configuración (sin exponer el valor de la key)
  const config = {
    tieneApiKey: !!key,
    largoApiKey: key ? key.length : 0,
    prefijoApiKey: key ? key.slice(0, 3) : null, // 're_' esperado
    from,
    to,
  };

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ config, envio: 'NO SE INTENTÓ: falta RESEND_API_KEY' });
  }

  // Envío real. En Resend v6 el error viene en el objeto, no como excepción.
  const resultado = await resend.emails.send({
    from,
    to,
    subject: '✅ Prueba de diagnóstico — Somos Luz',
    text: 'Si ves este correo, el envío desde el sitio funciona correctamente.',
  });

  return NextResponse.json({
    config,
    resend: {
      idMensaje: resultado.data?.id ?? null,
      error: resultado.error ?? null,
    },
  });
}
