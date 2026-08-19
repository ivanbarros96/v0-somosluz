import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeVerOracion } from '@/lib/roles';

// POST /api/oracion/interna — registrar una petición de un miembro desde la
// intranet. Distinto del POST público de /api/oracion (que es sin sesión y
// siempre externa): este exige sesión y marca la petición como interna.
//
// Híbrido a propósito: la persona puede venir vinculada a un miembro
// registrado (persona_id) o solo como nombre libre, para no frenar la
// anotación cuando alguien aún no está en la base.
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const personaId = typeof body.persona_id === 'number' ? body.persona_id : null;
  const visitaId = typeof body.miembro_nuevo_id === 'number' ? body.miembro_nuevo_id : null;
  const nombreLibre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const peticion = typeof body.peticion === 'string' ? body.peticion.trim() : '';

  if (!peticion) {
    return NextResponse.json({ error: 'La petición es obligatoria' }, { status: 400 });
  }
  if (peticion.length > 2000) {
    return NextResponse.json({ error: 'La petición es demasiado larga' }, { status: 400 });
  }
  if (!personaId && !visitaId && !nombreLibre) {
    return NextResponse.json(
      { error: 'Indica a la persona o escribe un nombre' },
      { status: 400 },
    );
  }
  // La base tiene un CHECK que lo impide; se rechaza antes para dar un error
  // claro en vez de un fallo de restricción.
  if (personaId && visitaId) {
    return NextResponse.json(
      { error: 'Una petición pertenece a un miembro o a una visita, no a ambos' },
      { status: 400 },
    );
  }

  const db = getSupabaseAdmin();

  // El nombre se guarda SIEMPRE (aunque haya persona_id): así la lista se lee
  // sin un join y la petición sobrevive intacta si luego se borra la persona.
  let nombre = nombreLibre;
  if (personaId) {
    const { data: persona, error } = await db
      .from('personas')
      .select('nombre')
      .eq('id', personaId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!persona) {
      return NextResponse.json({ error: 'Ese miembro no existe' }, { status: 404 });
    }
    nombre = persona.nombre;
  } else if (visitaId) {
    // Las visitas viven en su propia tabla hasta que se las convierte en
    // miembros. Al convertirlas, sus peticiones se mueven a la ficha nueva
    // (ver api/miembros-nuevos/[id]/convertir).
    const { data: visita, error } = await db
      .from('miembros_nuevos')
      .select('nombre')
      .eq('id', visitaId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!visita) {
      return NextResponse.json({ error: 'Esa visita no existe' }, { status: 404 });
    }
    nombre = visita.nombre;
  }

  if (nombre.length > 100) {
    return NextResponse.json({ error: 'El nombre es demasiado largo' }, { status: 400 });
  }

  const { error } = await db.from('peticiones_oracion').insert({
    nombre,
    peticion,
    origen: 'interna',
    persona_id: personaId,
    miembro_nuevo_id: visitaId,
    registrado_por: session.role,
  });
  if (error) {
    return NextResponse.json({ error: 'No pudimos guardar la petición' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
