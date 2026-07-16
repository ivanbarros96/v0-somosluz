import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { ROLES, esRolValido } from '@/lib/roles';

function buildToken(role: string): string {
  const secret = process.env.AUTH_SECRET!;
  const timestamp = Date.now().toString();
  const payload = `${role}:${timestamp}`;
  const hash = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${hash}`;
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  // Cada rol tiene su contraseña en una env var propia (ver lib/roles.ts).
  // Si la env var no está configurada, ese usuario simplemente no puede entrar.
  let role: string | null = null;
  if (esRolValido(username) && typeof password === 'string' && password.length > 0) {
    const esperada = process.env[ROLES[username].envVar];
    if (esperada && password === esperada) role = username;
  }

  if (!role || !esRolValido(role)) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const user = {
    username: role,
    role,
    name: ROLES[role].name,
  };

  const res = NextResponse.json(user);
  res.cookies.set('sl_session', buildToken(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return res;
}
