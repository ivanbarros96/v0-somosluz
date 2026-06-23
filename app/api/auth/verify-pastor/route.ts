import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// Valida que exista una sesión activa (cualquier rol) antes de comprobar la clave
function hasValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [role, timestamp, hash] = parts;
  if (role !== 'pastor' && role !== 'somosluz') return false;
  const payload = `${role}:${timestamp}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  if (hash !== expected) return false;
  const age = Date.now() - parseInt(timestamp, 10);
  if (age > 8 * 60 * 60 * 1000) return false;
  return true;
}

// Comprueba la contraseña del pastor para autorizar acciones sensibles
// (p. ej. eliminar un miembro desde el perfil operativo). Nunca devuelve la clave.
export async function POST(req: NextRequest) {
  if (!hasValidSession(req.cookies.get('sl_session')?.value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { password } = await req.json().catch(() => ({ password: '' }));
  const ok =
    typeof password === 'string' &&
    password.length > 0 &&
    password === process.env.PASTOR_PASSWORD;
  return NextResponse.json({ ok });
}
