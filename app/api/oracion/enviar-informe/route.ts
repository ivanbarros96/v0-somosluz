import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { esRolOracion } from '@/lib/roles';
import {
  generarInformeOracion, DIAS_SIN_NOTICIAS, ESTADO_LABEL, ESTADOS_ORDEN,
  type ResumenInforme,
} from '@/lib/oracion-informe';
import { PERIODOS_INFORME, esPeriodoInforme, rangoDePeriodo } from '@/lib/oracion-periodos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Espera la respuesta de n8n (WhatsApp + Gmail): unos segundos, con holgura.
export const maxDuration = 60;

// POST /api/oracion/enviar-informe — el perfil Oración le envía el informe al
// pastor por WhatsApp y/o correo.
//
// Reparto del trabajo (decisión del 14/09/2026):
// - La intranet ARMA: el mismo Excel que se descarga, el resumen y los textos.
// - n8n REPARTE: WhatsApp por Evolution y correo por Gmail, las dos
//   integraciones que ya usa con el pastor. Los destinatarios están fijos en
//   n8n y NO viajan desde acá: aunque se filtrara la clave, no se podría
//   mandar el informe a otra persona.
//
// Solo Oración aprieta el botón (pedido de Iván): es quien lleva las peticiones
// y decide cuándo el informe está listo para el pastor.

const TIMEOUT_N8N_MS = 45_000;

type EstadoCanal = { estado: 'enviado' | 'omitido' | 'error'; detalle?: string };

const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ICONO_ESTADO: Record<string, string> = { pendiente: '⏳', orando: '🙏', contestada: '✅' };
// En plural para el mensaje ("Contestadas: 2"); el Excel usa ESTADO_LABEL
// porque ahí etiqueta a cada petición por separado.
const ESTADO_PLURAL: Record<string, string> = { ...ESTADO_LABEL, contestada: 'Contestadas' };

/** WhatsApp: *negrita* y _cursiva_ en su propio formato, sin HTML. */
function textoWhatsapp(r: ResumenInforme, etiquetaPeriodo: string): string {
  const g = r.general;
  const lineas = [`📊 *Informe de oración*`, `_${etiquetaPeriodo} · ${r.periodo}_`, ''];

  if (g.total === 0) {
    lineas.push('No llegaron peticiones en este período.');
  } else {
    for (const e of ESTADOS_ORDEN) {
      const extra = e === 'contestada' ? ` (${pct(g.contestada, g.total)}%)` : '';
      lineas.push(`${ICONO_ESTADO[e]} ${ESTADO_PLURAL[e]}: ${g[e]}${extra}`);
    }
    lineas.push(`*Total: ${g.total}*`, '');
    lineas.push('⚠️ *Necesitan contacto*');
    lineas.push(`• Nunca contactadas: ${r.nuncaContactadas}`);
    lineas.push(`• ${DIAS_SIN_NOTICIAS} días o más sin noticias: ${r.sinNoticiasLargo}`, '');
    lineas.push('*Por categoría*');
    for (const f of r.porCategoria) lineas.push(`• ${f.nombre}: ${f.c.total}`);
  }

  lineas.push('', '📎 El detalle de cada petición va en el Excel adjunto.');
  return lineas.join('\n');
}

function htmlCorreo(r: ResumenInforme, etiquetaPeriodo: string): string {
  const g = r.general;
  const BOSQUE = '#223F2F', CREMA = '#ECE9D8', MOCHA = '#6E4E37';

  const fila = (a: string, b: string | number, fondo = '#fff', negrita = false) =>
    `<tr style="background:${fondo}"><td style="padding:8px 12px;border-bottom:1px solid #eee;${negrita ? 'font-weight:700' : ''}">${a}</td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;${negrita ? 'font-weight:700' : ''}">${b}</td></tr>`;

  const tabla = (filas: string) =>
    `<table style="width:100%;border-collapse:collapse;font-size:14px;color:#2b2521;margin:0 0 18px">${filas}</table>`;

  const titulo = (t: string) =>
    `<p style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${MOCHA};font-weight:700;margin:0 0 8px">${t}</p>`;

  let cuerpo: string;
  if (g.total === 0) {
    cuerpo = `<p style="font-size:15px;color:#2b2521">No llegaron peticiones en este período.</p>`;
  } else {
    cuerpo =
      titulo('Estado general') +
      tabla(
        ESTADOS_ORDEN.map((e) =>
          fila(`${ICONO_ESTADO[e]} ${ESTADO_PLURAL[e]}`, e === 'contestada' ? `${g[e]} (${pct(g[e], g.total)}%)` : g[e]),
        ).join('') + fila('Total', g.total, CREMA, true),
      ) +
      titulo('Necesitan contacto') +
      tabla(
        fila('Nunca contactadas', r.nuncaContactadas, '#FBE9E7') +
        fila(`${DIAS_SIN_NOTICIAS} días o más sin noticias`, r.sinNoticiasLargo, '#FDF3E0'),
      ) +
      titulo('Por categoría') +
      tabla(r.porCategoria.map((f) => fila(escapeHtml(f.nombre), f.c.total)).join('')) +
      titulo('Por equipo') +
      tabla(r.porEquipo.map((f) => fila(escapeHtml(f.nombre), f.c.total)).join(''));
  }

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f3eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 18px">
    <div style="background:${BOSQUE};border-radius:12px;padding:22px;text-align:center;margin-bottom:20px">
      <div style="font-size:28px;line-height:1">📊</div>
      <div style="color:${CREMA};font-size:20px;font-weight:700;margin-top:8px">Informe de oración</div>
      <div style="color:#bca286;font-size:13px;margin-top:5px">${escapeHtml(etiquetaPeriodo)} · ${escapeHtml(r.periodo)}</div>
    </div>
    <div style="background:#fff;border:1px solid #dcd6cf;border-radius:12px;padding:18px">${cuerpo}</div>
    <p style="font-size:13px;color:#2b2521;margin:18px 0 0">📎 El detalle de cada petición, con su seguimiento, va en el Excel adjunto.</p>
    <p style="font-size:12px;color:#8a8578;text-align:center;margin:26px 0 0;line-height:1.5">
      Enviado por la Red de Oración desde la intranet · Somos Luz Iglesia<br>
      Contiene información sensible de las personas: no reenviar.
    </p>
  </div>
</body></html>`;
}

function esEstadoCanal(v: unknown): v is EstadoCanal {
  return !!v && typeof v === 'object' && ['enviado', 'omitido', 'error'].includes((v as EstadoCanal).estado);
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || !esRolOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const url = process.env.N8N_INFORME_ORACION_URL;
  const clave = process.env.N8N_INFORME_ORACION_CLAVE;
  if (!url || !clave) {
    console.error('[oracion/enviar-informe] faltan N8N_INFORME_ORACION_URL o N8N_INFORME_ORACION_CLAVE');
    return NextResponse.json({ error: 'El envío al pastor todavía no está configurado' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const { periodo, canales } = body as { periodo?: unknown; canales?: { whatsapp?: unknown; correo?: unknown } };
  if (!esPeriodoInforme(periodo)) {
    return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
  }
  const whatsapp = canales?.whatsapp === true;
  const correo = canales?.correo === true;
  if (!whatsapp && !correo) {
    return NextResponse.json({ error: 'Elige al menos un canal' }, { status: 400 });
  }

  let informe: Awaited<ReturnType<typeof generarInformeOracion>>;
  try {
    // Sin los filtros de pantalla: al pastor le llega el período completo.
    informe = await generarInformeOracion(rangoDePeriodo(periodo));
  } catch (err) {
    console.error('[oracion/enviar-informe] no se pudo armar el informe', err);
    return NextResponse.json({ error: 'No pudimos armar el informe' }, { status: 500 });
  }

  const etiqueta = PERIODOS_INFORME.find((p) => p.valor === periodo)!.label;
  const { resumen } = informe;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-somosluz-clave': clave },
      body: JSON.stringify({
        canales: { whatsapp, correo },
        textoWhatsapp: textoWhatsapp(resumen, etiqueta),
        asunto: `📊 Informe de oración · ${etiqueta} (${resumen.periodo})`,
        htmlCorreo: htmlCorreo(resumen, etiqueta),
        archivo: { nombre: informe.nombreArchivo, base64: informe.buffer.toString('base64') },
      }),
      signal: AbortSignal.timeout(TIMEOUT_N8N_MS),
    });
  } catch (err) {
    console.error('[oracion/enviar-informe] n8n no respondió', err);
    return NextResponse.json({ error: 'El servicio de envío no respondió. Inténtalo en unos minutos.' }, { status: 504 });
  }

  if (!res.ok) {
    console.error('[oracion/enviar-informe] n8n respondió', res.status, (await res.text().catch(() => '')).slice(0, 300));
    return NextResponse.json(
      { error: res.status === 403 ? 'El servicio de envío rechazó la clave' : 'El servicio de envío falló' },
      { status: 502 },
    );
  }

  const datos = (await res.json().catch(() => null)) as { whatsapp?: unknown; correo?: unknown } | null;
  if (!datos || !esEstadoCanal(datos.whatsapp) || !esEstadoCanal(datos.correo)) {
    console.error('[oracion/enviar-informe] respuesta inesperada de n8n', datos);
    return NextResponse.json({ error: 'No pudimos confirmar el envío' }, { status: 502 });
  }

  return NextResponse.json({ whatsapp: datos.whatsapp, correo: datos.correo, total: resumen.general.total });
}
