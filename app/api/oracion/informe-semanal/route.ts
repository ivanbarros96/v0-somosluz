import { NextRequest, NextResponse } from 'next/server';
import {
  generarInformeOracion, textoWhatsappInforme, htmlCorreoInforme,
} from '@/lib/oracion-informe';
import { PERIODOS_INFORME, esPeriodoInforme, rangoDePeriodo } from '@/lib/oracion-periodos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/oracion/informe-semanal — devuelve el informe listo para el pastor.
//
// Lo consulta n8n cada lunes por la tarde (workflow 📊 Informe de oración →
// Pastor). El reparto del trabajo (15/09/2026):
// - La intranet ARMA acá: el mismo Excel que se descarga + el resumen + los
//   textos de WhatsApp y correo.
// - n8n REPARTE: agenda el lunes, llama a este endpoint y manda al pastor por
//   WhatsApp (Evolution) y Gmail. Los destinatarios viven en n8n, nunca acá.
//
// No usa sesión de intranet: es una máquina (n8n) la que llama, así que se
// protege con una clave compartida en el header (misma en Vercel y en n8n).
// La respuesta trae datos sensibles (salud, adicciones): la clave es su candado.
export async function GET(req: NextRequest) {
  const claveEsperada = process.env.N8N_INFORME_ORACION_CLAVE;
  if (!claveEsperada) {
    console.error('[oracion/informe-semanal] falta N8N_INFORME_ORACION_CLAVE');
    return NextResponse.json({ error: 'No configurado' }, { status: 503 });
  }
  if (req.headers.get('x-somosluz-clave') !== claveEsperada) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Por defecto la última semana; se puede pedir otro período con ?periodo=.
  const periodoParam = req.nextUrl.searchParams.get('periodo') ?? 'semana';
  if (!esPeriodoInforme(periodoParam)) {
    return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
  }

  try {
    const informe = await generarInformeOracion(rangoDePeriodo(periodoParam));
    const etiqueta = PERIODOS_INFORME.find((p) => p.valor === periodoParam)!.label;
    const { resumen } = informe;

    return NextResponse.json({
      total: resumen.general.total,
      textoWhatsapp: textoWhatsappInforme(resumen, etiqueta),
      asunto: `📊 Informe de oración · ${etiqueta} (${resumen.periodo})`,
      htmlCorreo: htmlCorreoInforme(resumen, etiqueta),
      archivo: { nombre: informe.nombreArchivo, base64: informe.buffer.toString('base64') },
    });
  } catch (err) {
    console.error('[oracion/informe-semanal] no se pudo armar el informe', err);
    return NextResponse.json({ error: 'No pudimos armar el informe' }, { status: 500 });
  }
}
