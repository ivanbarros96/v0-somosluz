import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { esRolKids } from '@/lib/roles';

// PATCH y DELETE de una visita. Espeja app/api/personas/[id] para que editar y
// eliminar funcionen igual en las dos listas, aunque vivan en tablas distintas
// (`personas` y `miembros_nuevos`).

/** Solo se dejan tocar estos campos: una visita no tiene ficha completa. */
const CAMPOS = ['nombre', 'telefono', 'email'] as const;

// PATCH /api/miembros-nuevos/[id] — corregir nombre, teléfono o email.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  // Mismas reglas que POST /api/personas: Kids solo toma asistencia.
  if (esRolKids(session.role)) {
    return NextResponse.json({ error: 'Tu perfil no edita visitas.' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Se arma el update campo por campo en vez de pasar el body entero: así un
  // cliente no puede escribir columnas que no le corresponden.
  const cambios: Record<string, string | null> = {};
  for (const campo of CAMPOS) {
    if (!(campo in body)) continue;
    const valor = body[campo];
    if (valor === null || valor === '') {
      cambios[campo] = null;
    } else if (typeof valor === 'string') {
      cambios[campo] = valor.trim();
    }
  }

  if (!cambios.nombre && 'nombre' in body) {
    return NextResponse.json({ error: 'El nombre no puede quedar vacío' }, { status: 400 });
  }
  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'No hay nada que actualizar' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Evita crear un duplicado al renombrar. Se excluye la propia fila, o se
  // detectaría a sí misma.
  if (cambios.nombre) {
    const { data: repetido } = await db
      .from('miembros_nuevos')
      .select('id')
      .ilike('nombre', cambios.nombre)
      .neq('id', id)
      .limit(1)
      .maybeSingle();
    if (repetido) {
      return NextResponse.json(
        { error: 'Ya hay otra visita registrada con ese nombre' },
        { status: 409 },
      );
    }
  }

  const { data, error } = await db
    .from('miembros_nuevos')
    .update(cambios)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Esa visita ya no existe' }, { status: 404 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/miembros-nuevos/[id] — eliminar una visita.
//
// Igual que con los miembros: el pastor borra directo porque su sesión ya lo
// identifica; cualquier otro perfil manda la clave del pastor en el cuerpo.
// La clave se valida ACÁ y no solo en la pantalla — si el candado viviera en
// el cliente bastaría con llamar al endpoint para saltárselo.
//
// Ojo con el historial: `asistencias.miembro_nuevo_id` es ON DELETE CASCADE,
// así que borrar la visita se lleva sus marcas de asistencia. Por eso la
// pantalla avisa cuántas son y ofrece convertirla en miembro, que sí conserva
// todo. Las peticiones de oración usan ON DELETE SET NULL: sobreviven con el
// nombre, sin vínculo.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (esRolKids(session.role)) {
    return NextResponse.json({ error: 'Tu perfil no elimina visitas.' }, { status: 403 });
  }

  if (session.role !== 'pastor') {
    const { password } = await req.json().catch(() => ({ password: '' }));
    if (!password || password !== process.env.PASTOR_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña del pastor incorrecta.' }, { status: 403 });
    }
  }

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('miembros_nuevos')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Esa visita ya no existe' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
