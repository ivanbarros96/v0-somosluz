import { Resend } from 'resend';

// ⚠️ SOLO servidor. Cliente de Resend para correos transaccionales.
// Inicialización lazy + fallback seguro: si falta RESEND_API_KEY devuelve null
// para que la ausencia de credenciales NUNCA rompa el flujo que la usa.
let client: Resend | null = null;

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}
