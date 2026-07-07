import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';

const ESTADOS = ['pendiente', 'orando', 'completada'] as const;

// GET /api/oracion — listar peticiones (SOLO pastor)
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('peticiones_oracion')
    .select('id, nombre, email, peticion, estado, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'No pudimos cargar las peticiones' }, { status: 500 });
  }

  return NextResponse.json({ peticiones: data ?? [] });
}

// PATCH /api/oracion — cambiar el estado de una petición (SOLO pastor)
export async function PATCH(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id, estado } = await req.json().catch(() => ({}));
  if (!id || !ESTADOS.includes(estado)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('peticiones_oracion')
    .update({ estado })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'No pudimos actualizar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// POST /api/oracion — recibir petición de oración (endpoint PÚBLICO, sin sesión)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { nombre, email, peticion, telefono } = body as Record<string, unknown>;

  // Honeypot: los humanos nunca ven este campo; si viene lleno es un bot.
  // Respondemos ok para no darle señales al bot.
  if (typeof telefono === 'string' && telefono.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const n = typeof nombre === 'string' ? nombre.trim() : '';
  const p = typeof peticion === 'string' ? peticion.trim() : '';
  const e = typeof email === 'string' ? email.trim() : '';

  if (!n || !p) {
    return NextResponse.json({ error: 'Nombre y petición son obligatorios' }, { status: 400 });
  }
  if (n.length > 100 || p.length > 2000 || e.length > 200) {
    return NextResponse.json({ error: 'Datos demasiado largos' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('peticiones_oracion').insert({
    nombre: n,
    email: e || null,
    peticion: p,
  });

  if (error) {
    return NextResponse.json({ error: 'No pudimos guardar tu petición' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
