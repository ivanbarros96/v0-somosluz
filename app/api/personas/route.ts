import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/personas — lectura de personas. Requiere sesión.
//
// Antes el cliente leía esta tabla directamente con la anon key, que viaja al
// navegador: cualquiera podía extraer la ficha completa de la congregación
// (teléfonos, direcciones, datos de apoderados de menores). Ahora la lectura
// pasa por aquí, con service_role y sesión validada.
//
// Modos:
//   ?nombreExacto=X[&excluirId=N] → { existe: boolean }  (chequeo de duplicados)
//   ?buscar=X[&tipo=adulto]       → { personas: [{id, nombre, telefono}] }  (autocompletar)
//   (sin parámetros)              → { personas: [fila completa, ...] }
export async function GET(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const db = getSupabaseAdmin();

  const nombreExacto = searchParams.get('nombreExacto');
  if (nombreExacto !== null) {
    const termino = nombreExacto.trim();
    if (!termino) return NextResponse.json({ existe: false });

    let query = db.from('personas').select('id').ilike('nombre', termino);
    const excluirId = searchParams.get('excluirId');
    if (excluirId) query = query.neq('id', excluirId);

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ existe: !!data });
  }

  const buscar = searchParams.get('buscar');
  if (buscar !== null) {
    const termino = buscar.trim();
    if (!termino) return NextResponse.json({ personas: [] });

    let query = db.from('personas').select('id, nombre, telefono').ilike('nombre', `%${termino}%`);
    const tipo = searchParams.get('tipo');
    if (tipo) query = query.eq('source_tipo', tipo);

    const { data, error } = await query.order('nombre').limit(8);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ personas: data ?? [] });
  }

  const { data, error } = await db
    .from('personas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ personas: data ?? [] });
}

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
