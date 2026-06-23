import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// PATCH /api/cultos/[id] — actualizar culto (ej. cerrar: activo=false)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Solo permitimos alternar 'activo' por ahora.
  const patch: Record<string, unknown> = {};
  if ('activo' in body) patch.activo = !!body.activo;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('cultos').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
