import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function verifySession(token: string): boolean {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [role, timestamp, hash] = parts;
  if (role !== 'pastor' && role !== 'somosluz') return false;

  const payload = `${role}:${timestamp}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  if (hash !== expected) return false;

  // Sesión válida 8 horas
  const age = Date.now() - parseInt(timestamp, 10);
  if (age > 8 * 60 * 60 * 1000) return false;

  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/intranet/dashboard')) {
    const token = req.cookies.get('sl_session')?.value;
    if (!token || !verifySession(token)) {
      return NextResponse.redirect(new URL('/intranet', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/intranet/dashboard/:path*'],
};
