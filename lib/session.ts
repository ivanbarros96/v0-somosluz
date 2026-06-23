import type { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export type SessionRole = 'pastor' | 'somosluz';
export interface Session {
  role: SessionRole;
}

// Verifica el token HMAC del cookie sl_session (mismo formato que login/middleware).
// Devuelve la sesión o null. Comparación en tiempo constante.
export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const parts = token.split(':');
  if (parts.length !== 3) return null;

  const [role, timestamp, hash] = parts;
  if (role !== 'pastor' && role !== 'somosluz') return null;

  const payload = `${role}:${timestamp}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  const a = Buffer.from(hash);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const age = Date.now() - parseInt(timestamp, 10);
  if (Number.isNaN(age) || age > 8 * 60 * 60 * 1000) return null;

  return { role: role as SessionRole };
}

// Helper para route handlers: lee el cookie del request y verifica.
export function getSession(req: NextRequest): Session | null {
  return verifySessionToken(req.cookies.get('sl_session')?.value);
}
