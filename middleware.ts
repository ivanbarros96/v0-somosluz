import { NextRequest, NextResponse } from 'next/server';

async function verifySession(token: string): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [role, timestamp, hash] = parts;
  if (role !== 'pastor' && role !== 'somosluz') return false;

  const payload = `${role}:${timestamp}`;
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (hash !== expected) return false;

  const age = Date.now() - parseInt(timestamp, 10);
  if (age > 8 * 60 * 60 * 1000) return false;

  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/intranet/dashboard')) {
    const token = req.cookies.get('sl_session')?.value;
    if (!token || !(await verifySession(token))) {
      return NextResponse.redirect(new URL('/intranet', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/intranet/dashboard/:path*'],
};
