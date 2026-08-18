import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esRolCopastor, MAX_CONTACTOS } from '@/lib/roles';

// Casos de seguimiento y sus contactos.
//
// Quién puede qué (decisión del cliente):
//   · Co-pastor  → registra y ve
//   · Pastor     → solo ve (supervisa la labor, no anota)
//   · el resto   → nada. Las notas traen información pastoral sensible
//                  (salud, problemas personales), así que este endpoint es el
//                  único lugar por donde se leen.
function puedeVer(role: string) {
  return role === 'pastor' || esRolCopastor(role);
}

// GET /api/seguimiento — casos con sus contactos.
//   ?estado=abierto|cerrado  (default: todos)
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!puedeVer(session.role)) {
    return NextResponse.json({ error: 'Tu perfil no ve el seguimiento pastoral' }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const estado = new URL(req.url).searchParams.get('estado');

  let query = db
    .from('seguimiento_casos')
    .select('id, persona_id, motivo, estado, desenlace, cerrado_en, created_at')
    .order('created_at', { ascending: false });
  if (estado === 'abierto' || estado === 'cerrado') query = query.eq('estado', estado);

  const { data: casos, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (casos ?? []).map((c) => c.id);
  const { data: contactos, error: errC } = ids.length
    ? await db
        .from('seguimiento_contactos')
        .select('id, caso_id, canal, resultado, nota, registrado_por, created_at')
        .in('caso_id', ids)
        .order('created_at', { ascending: true })
    : { data: [], error: null };
  if (errC) return NextResponse.json({ error: errC.message }, { status: 500 });

  const porCaso = new Map<number, typeof contactos>();
  for (const c of contactos ?? []) {
    const arr = porCaso.get(c.caso_id) ?? [];
    arr.push(c);
    porCaso.set(c.caso_id, arr);
  }

  return NextResponse.json({
    casos: (casos ?? []).map((c) => ({ ...c, contactos: porCaso.get(c.id) ?? [] })),
  });
}

// POST /api/seguimiento — abre un caso y registra su primer contacto, o agrega
// un contacto a un caso ya abierto. Un solo endpoint porque en la práctica es
// una sola acción: "acabo de llamar a esta persona".
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  // El Pastor supervisa pero no registra: así queda claro de quién es el
  // trabajo y las notas no se mezclan.
  if (!esRolCopastor(session.role)) {
    return NextResponse.json(
      { error: 'Solo el Co-pastor registra contactos de seguimiento' },
      { status: 403 },
    );
  }

  const { persona_id, motivo, canal, resultado, nota } = await req.json().catch(() => ({}));
  if (!persona_id || !canal || !resultado) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Reutiliza el ciclo abierto de esa persona si ya existe. El índice único
  // parcial de la base garantiza que no haya dos.
  const { data: existente } = await db
    .from('seguimiento_casos')
    .select('id')
    .eq('persona_id', persona_id)
    .eq('estado', 'abierto')
    .maybeSingle();

  let casoId = existente?.id;

  if (!casoId) {
    const { data: creado, error: errCaso } = await db
      .from('seguimiento_casos')
      .insert({
        persona_id,
        motivo: motivo === 'nuevo_en_la_fe' ? 'nuevo_en_la_fe' : 'ausencia',
        abierto_por: session.role,
      })
      .select('id')
      .single();
    if (errCaso || !creado) {
      return NextResponse.json({ error: errCaso?.message ?? 'No se pudo abrir el caso' }, { status: 500 });
    }
    casoId = creado.id;
  } else {
    // Tope de intentos: al llegar a 3 hay que cerrar con un desenlace, no
    // seguir llamando indefinidamente.
    const { count } = await db
      .from('seguimiento_contactos')
      .select('id', { count: 'exact', head: true })
      .eq('caso_id', casoId);
    if ((count ?? 0) >= MAX_CONTACTOS) {
      return NextResponse.json(
        { error: `Ya son ${MAX_CONTACTOS} intentos. Cierra el caso con un desenlace.` },
        { status: 409 },
      );
    }
  }

  const { error } = await db.from('seguimiento_contactos').insert({
    caso_id: casoId,
    canal,
    resultado,
    nota: typeof nota === 'string' && nota.trim() ? nota.trim().slice(0, 500) : null,
    registrado_por: session.role,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, casoId });
}
