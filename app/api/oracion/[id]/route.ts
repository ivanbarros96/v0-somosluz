import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeVerOracion } from '@/lib/roles';

// DELETE /api/oracion/[id] — borra una petición.
//
// El pastor NO reingresa su clave: su sesión ya es la prueba de identidad,
// igual que al eliminar un miembro (ver api/personas/[id]). Pedírsela de
// nuevo sería autenticarlo dos veces para la misma acción.
//
// El perfil Oración sí la necesita: administra estados libremente, pero
// borrar es definitivo y no deja rastro, así que ahí se pide autorización del
// pastor — comprobada ACÁ y no solo en la pantalla, porque si el candado
// viviera únicamente en el cliente bastaría con llamar a este endpoint sin
// pasar por el diálogo para borrar sin autorización.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (session.role !== 'pastor') {
    const { password } = await req.json().catch(() => ({ password: '' }));
    const esperada = process.env.PASTOR_PASSWORD;
    if (!esperada || typeof password !== 'string' || password !== esperada) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 403 });
    }
  }

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('peticiones_oracion')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'No pudimos eliminar' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Esa petición ya no existe' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
