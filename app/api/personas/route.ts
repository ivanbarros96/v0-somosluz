import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// POST /api/personas — crear persona (adulto/niño)
export async function POST(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const row = await req.json().catch(() => null);
  if (!row || typeof row !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('personas').insert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
