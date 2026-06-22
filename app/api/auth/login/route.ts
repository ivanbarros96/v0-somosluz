import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function buildToken(role: string): string {
  const secret = process.env.AUTH_SECRET!;
  const timestamp = Date.now().toString();
  const payload = `${role}:${timestamp}`;
  const hash = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${hash}`;
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  let role: string | null = null;

  if (username === 'pastor' && password === process.env.PASTOR_PASSWORD) {
    role = 'pastor';
  } else if (username === 'somosluz' && password === process.env.SOMOSLUZ_PASSWORD) {
    role = 'somosluz';
  }

  if (!role) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const user = {
    username: role,
    role,
    name: role === 'pastor' ? 'Pastor' : 'Somos Luz',
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
