import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeVerOracion } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// Seguimiento de las peticiones: cada vez que se habló con quien la trae.
//
// Existe porque antes era UN solo campo en la petición y cada anotación pisaba
// la anterior — no se podía ver la evolución, que en el informe real de la Red
// es justamente la información ("como cada semana refiere que…").

// GET /api/oracion/seguimientos — todos, para pintar el historial de cada
// petición sin una consulta por tarjeta. A esta escala (decenas de peticiones,
// unas pocas notas cada una) traerlos juntos es más barato que N consultas.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('seguimientos_oracion')
    .select('id, peticion_id, fecha, nota, registrado_por, created_at')
    // Del más reciente al más antiguo: es el orden en que se lee un historial.
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'No pudimos cargar el seguimiento' }, { status: 500 });
  }
  return NextResponse.json({ seguimientos: data ?? [] });
}

// POST /api/oracion/seguimientos — anotar un contacto.
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const peticionId = typeof body.peticion_id === 'string' ? body.peticion_id : '';
  const fecha = typeof body.fecha === 'string' ? body.fecha : '';
  const nota = typeof body.nota === 'string' ? body.nota.trim() : '';

  if (!peticionId) {
    return NextResponse.json({ error: 'Falta la petición' }, { status: 400 });
  }
  // 'YYYY-MM-DD' tal cual llega del <input type="date">, sin pasar por Date:
  // convertirla correría el día en Chile.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }
  if (!nota) {
    return NextResponse.json({ error: 'Escribe qué se supo' }, { status: 400 });
  }
  if (nota.length > 1000) {
    return NextResponse.json({ error: 'La nota es demasiado larga' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('seguimientos_oracion')
    .insert({ peticion_id: peticionId, fecha, nota, registrado_por: session.role })
    .select('id, peticion_id, fecha, nota, registrado_por, created_at')
    .single();

  if (error) {
    // Clave foránea rota = la petición ya no existe (la borraron mientras tanto).
    if (error.code === '23503') {
      return NextResponse.json({ error: 'Esa petición ya no existe' }, { status: 404 });
    }
    return NextResponse.json({ error: 'No pudimos guardar el seguimiento' }, { status: 500 });
  }

  return NextResponse.json({ seguimiento: data });
}

// DELETE /api/oracion/seguimientos?id=… — borrar una anotación mal puesta.
export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta la anotación' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('seguimientos_oracion')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'No pudimos eliminar' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Esa anotación ya no existe' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
