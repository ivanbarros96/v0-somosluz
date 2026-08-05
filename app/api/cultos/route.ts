import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esCultoTipo } from '@/lib/cultos-tipos';
import { ministerioDeRol } from '@/lib/roles';

// GET /api/cultos — lectura de cultos. Requiere sesión.
// Sustituye la lectura directa con anon key (ver GET /api/personas).
//   ?tipo=general         → solo ese tipo
//   ?tipoDistinto=general → todo menos ese tipo (reuniones de ministerio)
//   ?orden=asc|desc       → por fecha (default: desc)
export async function GET(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let query = getSupabaseAdmin().from('cultos').select('id, fecha, descripcion, activo, tipo');

  const tipo = searchParams.get('tipo');
  if (tipo) {
    if (!esCultoTipo(tipo)) {
      return NextResponse.json({ error: 'Tipo de culto inválido' }, { status: 400 });
    }
    query = query.eq('tipo', tipo);
  }

  const tipoDistinto = searchParams.get('tipoDistinto');
  if (tipoDistinto) {
    if (!esCultoTipo(tipoDistinto)) {
      return NextResponse.json({ error: 'Tipo de culto inválido' }, { status: 400 });
    }
    query = query.neq('tipo', tipoDistinto);
  }

  const { data, error } = await query.order('fecha', {
    ascending: searchParams.get('orden') === 'asc',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cultos: data ?? [] });
}

// POST /api/cultos — crear culto. Devuelve la fila creada (el cliente la necesita).
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { fecha, descripcion, tipo } = await req.json().catch(() => ({}));
  if (!fecha) {
    return NextResponse.json({ error: 'Falta la fecha' }, { status: 400 });
  }
  if (tipo !== undefined && !esCultoTipo(tipo)) {
    return NextResponse.json({ error: 'Tipo de culto inválido' }, { status: 400 });
  }

  // Un rol de ministerio solo puede crear reuniones de su propio tipo
  const ministerio = ministerioDeRol(session.role);
  if (ministerio && tipo !== ministerio) {
    return NextResponse.json({ error: 'Tu perfil solo puede crear reuniones de su ministerio' }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('cultos')
    .insert({ fecha, descripcion, activo: true, tipo: tipo ?? 'general' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ culto: data });
}
