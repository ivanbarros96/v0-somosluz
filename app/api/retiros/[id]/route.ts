import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// DELETE /api/retiros/[id] — reactivar a un miembro dado de baja.
//
// Dar de baja no borra a la persona: solo agrega una fila en `retiros`, y esa
// fila es la que la saca de todos los listados (ver GET /api/personas).
// Reactivar es, entonces, borrar esa fila: la persona vuelve tal cual estaba,
// con su historial de asistencias intacto, porque nunca se tocó.
//
// Para borrar a la persona de verdad está DELETE /api/personas/[id], que es
// otra cosa y pide la clave del pastor.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  // La pantalla de Retiros es solo del pastor; el guardia va igual acá porque
  // ocultar una pantalla no impide llamar al endpoint a mano.
  if (session.role !== 'pastor') {
    return NextResponse.json({ error: 'Solo el pastor puede reactivar miembros' }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin().from('retiros').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
