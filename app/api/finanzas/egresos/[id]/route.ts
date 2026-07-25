import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// DELETE /api/finanzas/egresos/[id] — elimina el registro y su comprobante en Storage
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const db = getSupabaseAdmin();

  // Primero leemos el path del comprobante para poder limpiarlo del bucket
  // después de borrar la fila (si el borrado de la fila falla, no tocamos Storage).
  const { data: egreso } = await db
    .from('finanzas_egresos')
    .select('comprobante_path')
    .eq('id', id)
    .single();

  const { error } = await db.from('finanzas_egresos').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (egreso?.comprobante_path) {
    await db.storage.from('comprobantes').remove([egreso.comprobante_path]);
  }

  return NextResponse.json({ ok: true });
}
