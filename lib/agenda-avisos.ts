// ⚠️ SOLO servidor. Avisos por correo de la agenda compartida.
//
// Dos avisos, en los dos sentidos (decisión de Iván, 29/08/2026):
//   1. Alguien propone una fecha  → se avisa a quienes pueden confirmarla.
//   2. Se confirma o se rechaza   → se avisa a quien la solicitó.
//
// Fallback seguro en todo: cualquier fallo de correo se registra y se ignora.
// Un aviso que no sale JAMÁS debe impedir que el evento se guarde o se
// confirme — el mismo criterio que ya usa el aviso de peticiones de oración.

import { getResend } from './resend';
import { ROLES, esRolValido } from './roles';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Paleta del manual de marca (mismos colores que los correos de n8n).
const BOSQUE = '#223F2F';
const CREMA = '#ECE9D8';
const MOCHA = '#6E4E37';
const SALVIA = '#6C7C5B';

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * '2026-09-12' → '12 de septiembre de 2026'.
 *
 * Se parte el string a mano en vez de usar `new Date(iso)`: ese constructor
 * interpreta 'YYYY-MM-DD' como medianoche UTC, y al formatearlo en Chile
 * (UTC-4) devuelve el día ANTERIOR. Es exactamente el error que tuvimos en la
 * vista de cumpleaños.
 */
export function fechaLegible(iso: string): string {
  const [anio, mes, dia] = String(iso).split('-').map(Number);
  if (!anio || !mes || !dia) return String(iso);
  return `${dia} de ${MESES[mes - 1] ?? ''} de ${anio}`;
}

function nombreRol(role: string): string {
  // 'publico' es el caso normal, no un error: pedir una fecha es abierto y la
  // mayoría de las solicitudes entran sin sesión.
  if (role === 'publico') return 'Un líder';
  return esRolValido(role) ? ROLES[role].name : role;
}

/** Correos de quienes confirman. Coma-separados en la variable de entorno. */
function destinatariosAprobadores(): string[] {
  const raw = process.env.AGENDA_NOTIFY_TO || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function remitente(): string {
  // En modo prueba de Resend el remitente debe ser onboarding@resend.dev.
  // Con el dominio verificado, cambiar a algo como agenda@somosluziglesia.cl.
  return process.env.AGENDA_NOTIFY_FROM || 'Somos Luz <onboarding@resend.dev>';
}

function envoltorio(titulo: string, cuerpo: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f3eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 18px">
    <div style="background:${BOSQUE};border-radius:12px;padding:22px;text-align:center;margin-bottom:20px">
      <div style="font-size:28px;line-height:1">📅</div>
      <div style="color:${CREMA};font-size:20px;font-weight:700;margin-top:8px">${escapeHtml(titulo)}</div>
      <div style="color:#bca286;font-size:13px;margin-top:5px">Agenda · Somos Luz Iglesia</div>
    </div>
    ${cuerpo}
    <p style="font-size:12px;color:#8a8578;text-align:center;margin:26px 0 0;line-height:1.5">
      Aviso automático de la intranet · Somos Luz Iglesia
    </p>
  </div>
</body></html>`;
}

function ficha(e: { titulo: string; fecha: string; hora: string | null; solicitante: string }): string {
  return `<div style="background:#fff;border:1px solid #dcd6cf;border-radius:12px;padding:18px;margin:0 0 18px">
    <div style="font-size:18px;font-weight:700;color:${BOSQUE};margin-bottom:8px">${escapeHtml(e.titulo)}</div>
    <div style="font-size:14px;color:${MOCHA};line-height:1.7">
      📆 ${escapeHtml(fechaLegible(e.fecha))}${e.hora ? ` · ${escapeHtml(e.hora.slice(0, 5))} hrs` : ''}<br>
      🙋 Lo solicita: <strong>${escapeHtml(e.solicitante)}</strong>
    </div>
  </div>`;
}

interface EventoAviso {
  titulo: string;
  fecha: string;
  hora: string | null;
  solicitante: string;
  propuestoPor: string;
}

/** Aviso 1: hay una fecha nueva esperando confirmación. */
export async function notificarPropuestaNueva(e: EventoAviso): Promise<void> {
  const resend = getResend();
  if (!resend) return; // Sin RESEND_API_KEY no se envía (no rompe nada).

  const destinos = destinatariosAprobadores();
  if (destinos.length === 0) {
    // Sin AGENDA_NOTIFY_TO configurada no hay a quién avisar. No es un error:
    // la agenda funciona igual, el badge del menú ya marca lo pendiente.
    return;
  }

  const cuerpo = `
    <p style="font-size:15px;color:#2b2521;line-height:1.6;margin:0 0 16px">
      <strong>${escapeHtml(nombreRol(e.propuestoPor))}</strong> propuso una fecha nueva en la agenda.
      Queda tentativa hasta que alguien la confirme.
    </p>
    ${ficha(e)}
    <a href="https://somosluziglesia.cl/intranet/dashboard/agenda"
       style="display:inline-block;background:${SALVIA};color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;font-size:14px">
      Revisar en la agenda
    </a>`;

  try {
    await resend.emails.send({
      from: remitente(),
      to: destinos,
      subject: `📅 Fecha por confirmar: ${e.titulo} (${fechaLegible(e.fecha)})`,
      text: `${nombreRol(e.propuestoPor)} propuso una fecha en la agenda.\n\n${e.titulo}\n${fechaLegible(e.fecha)}${e.hora ? ` · ${e.hora.slice(0, 5)} hrs` : ''}\nLo solicita: ${e.solicitante}\n\nConfirmar o rechazar: https://somosluziglesia.cl/intranet/dashboard/agenda`,
      html: envoltorio('Una fecha espera confirmación', cuerpo),
    });
  } catch (err) {
    console.error('[agenda] fallo al avisar de la propuesta', err);
  }
}

/** Aviso 2: la fecha que alguien pidió quedó confirmada o rechazada. */
export async function notificarResolucion(e: {
  titulo: string;
  fecha: string;
  hora: string | null;
  solicitante: string;
  emailSolicitante: string | null;
  confirmada: boolean;
  motivo: string | null;
  resueltoPor: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  // El correo es obligatorio en el formulario, así que normalmente está. Se
  // valida igual: una solicitud vieja o cargada a mano podría no tenerlo, y
  // ahí simplemente no se avisa — la resolución ya quedó guardada y visible.
  const destino = (e.emailSolicitante ?? '').trim();
  if (!destino) return;

  const veredicto = e.confirmada ? 'confirmada' : 'rechazada';
  const color = e.confirmada ? SALVIA : '#b03a2e';

  const cuerpo = `
    <p style="font-size:15px;color:#2b2521;line-height:1.6;margin:0 0 16px">
      Hola ${escapeHtml(e.solicitante.split(/\s+/)[0] || e.solicitante)}, la fecha que pediste quedó
      <strong style="color:${color}">${veredicto}</strong> por ${escapeHtml(nombreRol(e.resueltoPor))}.
    </p>
    ${ficha(e)}
    ${e.motivo ? `<div style="background:${CREMA};border-radius:8px;padding:14px;font-size:14px;color:#2b2521;line-height:1.55;margin:0 0 18px"><strong>Motivo:</strong> ${escapeHtml(e.motivo)}</div>` : ''}`;

  try {
    await resend.emails.send({
      from: remitente(),
      to: destino,
      subject: e.confirmada
        ? `✅ Confirmada: ${e.titulo} (${fechaLegible(e.fecha)})`
        : `❌ No se pudo agendar: ${e.titulo} (${fechaLegible(e.fecha)})`,
      text: `Tu solicitud "${e.titulo}" del ${fechaLegible(e.fecha)} quedó ${veredicto} por ${nombreRol(e.resueltoPor)}.${e.motivo ? `\n\nMotivo: ${e.motivo}` : ''}`,
      html: envoltorio(e.confirmada ? 'Tu fecha quedó confirmada' : 'Tu fecha no se pudo agendar', cuerpo),
    });
  } catch (err) {
    console.error('[agenda] fallo al avisar la resolución', err);
  }
}
