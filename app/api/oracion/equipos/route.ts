import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeVerOracion } from '@/lib/roles';
import { esColorEquipo } from '@/lib/oracion-equipos';

export const dynamic = 'force-dynamic';

// Equipos de oración: grupos de personas que se hacen cargo de peticiones.
// Los administra el perfil Oración (y el Pastor), igual que las peticiones.

// GET /api/oracion/equipos — los activos, en orden alfabético.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('equipos_oracion')
    .select('id, nombre, descripcion, color, created_at')
    .is('archivado_en', null)
    .order('nombre', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'No pudimos cargar los equipos' }, { status: 500 });
  }
  return NextResponse.json({ equipos: data ?? [] });
}

// POST /api/oracion/equipos — crear.
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
  const color = esColorEquipo(body.color) ? body.color : 'salvia';

  if (!nombre) return NextResponse.json({ error: 'Ponle un nombre al equipo' }, { status: 400 });
  if (nombre.length > 60) return NextResponse.json({ error: 'El nombre es demasiado largo' }, { status: 400 });
  if (descripcion.length > 300) return NextResponse.json({ error: 'La descripción es demasiado larga' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('equipos_oracion')
    .insert({ nombre, descripcion: descripcion || null, color })
    .select('id, nombre, descripcion, color, created_at')
    .single();

  if (error) {
    // Índice único sobre los activos: ya hay un equipo con ese nombre.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un equipo con ese nombre' }, { status: 409 });
    }
    return NextResponse.json({ error: 'No pudimos crear el equipo' }, { status: 500 });
  }
  return NextResponse.json({ equipo: data });
}

// PATCH /api/oracion/equipos — renombrar o cambiar el color.
export async function PATCH(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id, nombre, descripcion, color } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'Falta el equipo' }, { status: 400 });

  const cambios: Record<string, unknown> = {};
  if (nombre !== undefined) {
    const n = typeof nombre === 'string' ? nombre.trim() : '';
    if (!n) return NextResponse.json({ error: 'El nombre no puede quedar vacío' }, { status: 400 });
    if (n.length > 60) return NextResponse.json({ error: 'El nombre es demasiado largo' }, { status: 400 });
    cambios.nombre = n;
  }
  if (descripcion !== undefined) {
    const d = typeof descripcion === 'string' ? descripcion.trim() : '';
    if (d.length > 300) return NextResponse.json({ error: 'La descripción es demasiado larga' }, { status: 400 });
    cambios.descripcion = d || null;
  }
  if (color !== undefined) {
    if (!esColorEquipo(color)) return NextResponse.json({ error: 'Color inválido' }, { status: 400 });
    cambios.color = color;
  }
  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que cambiar' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('equipos_oracion')
    .update(cambios)
    .eq('id', id)
    .is('archivado_en', null)
    .select('id, nombre, descripcion, color, created_at')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un equipo con ese nombre' }, { status: 409 });
    }
    return NextResponse.json({ error: 'No pudimos guardar' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Ese equipo ya no existe' }, { status: 404 });
  return NextResponse.json({ equipo: data });
}

// DELETE /api/oracion/equipos?id=… — archivar.
//
// No borra: un equipo puede tener historial y borrarlo dejaría sus peticiones
// sin explicación. Las peticiones asignadas quedan SIN equipo (la clave foránea
// es ON DELETE SET NULL, pero acá ni siquiera se borra la fila), así que
// vuelven a la bandeja de "sin asignar" en vez de desaparecer.
export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el equipo' }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('equipos_oracion')
    .update({ archivado_en: new Date().toISOString() })
    .eq('id', id)
    .is('archivado_en', null)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'No pudimos eliminar' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Ese equipo ya no existe' }, { status: 404 });

  // Sus peticiones vuelven a "sin asignar": si quedaran apuntando a un equipo
  // archivado no se verían en ningún lado y nadie se haría cargo de ellas.
  const { count } = await db
    .from('peticiones_oracion')
    .update({ equipo_id: null }, { count: 'exact' })
    .eq('equipo_id', id);

  return NextResponse.json({ ok: true, liberadas: count ?? 0 });
}
