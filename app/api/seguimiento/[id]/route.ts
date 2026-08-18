import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esRolCopastor } from '@/lib/roles';

const DESENLACES = ['volvio', 'se_retiro', 'sin_contacto'] as const;

// PATCH /api/seguimiento/[id] — cerrar un caso con su desenlace.
//
// Cerrar es lo que da sentido al límite de 3 intentos: la persona sale de la
// bandeja con un final registrado. Si el desenlace es 'se_retiro', la interfaz
// ofrece además darlo de baja (POST /api/retiros), que es una acción aparte y
// explícita — cerrar un caso NO da de baja a nadie por su cuenta.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esRolCopastor(session.role)) {
    return NextResponse.json(
      { error: 'Solo el Co-pastor cierra casos de seguimiento' },
      { status: 403 },
    );
  }

  const { id } = await params;
  const { desenlace } = await req.json().catch(() => ({}));
  if (!DESENLACES.includes(desenlace)) {
    return NextResponse.json({ error: 'Desenlace inválido' }, { status: 400 });
  }

  // Se filtra por estado='abierto' además del id: un caso ya cerrado no se
  // reescribe, así el historial no cambia después.
  const { data, error } = await getSupabaseAdmin()
    .from('seguimiento_casos')
    .update({ estado: 'cerrado', desenlace, cerrado_en: new Date().toISOString() })
    .eq('id', id)
    .eq('estado', 'abierto')
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Ese caso ya está cerrado' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
