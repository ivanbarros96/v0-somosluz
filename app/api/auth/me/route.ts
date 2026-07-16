import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { ROLES, esRolValido } from '@/lib/roles';

function verifySession(token: string): { role: string } | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const parts = token.split(':');
  if (parts.length !== 3) return null;

  const [role, timestamp, hash] = parts;
  if (!esRolValido(role)) return null;

  const payload = `${role}:${timestamp}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  if (hash !== expected) return null;

  const age = Date.now() - parseInt(timestamp, 10);
  if (age > 8 * 60 * 60 * 1000) return null;

  return { role };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('sl_session')?.value;
  if (!token) return NextResponse.json(null);

  const session = verifySession(token);
  if (!session) return NextResponse.json(null);

  return NextResponse.json({
    username: session.role,
    role: session.role,
    name: esRolValido(session.role) ? ROLES[session.role].name : session.role,
  });
}
