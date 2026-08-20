import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/directorio?buscar=X[&tipo=visita|miembro][&incluirInactivos=1]
//
// Busca en la vista `directorio_unificado`, que junta `personas` (miembros) y
// `miembros_nuevos` (visitas) en una sola lista.
//
// Existe porque las dos tablas estaban aisladas: el buscador de Miembros solo
// miraba `personas`, así que una visita ya registrada era invisible y se
// volvía a cargar como miembro. De ahí salieron los duplicados reales.
//
// La vista trae `nombre_norm` y `telefono_norm` (sin tildes, sin formato), así
// que "benjamin" encuentra a "Benjamín" y "977411603" a "+56 977411603" —
// justo los dos casos que se colaban antes.

// Marcas de acento que NFD deja sueltas (U+0300–U+036F).
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Misma normalización que la vista: sin tildes y en minúscula. */
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim();
}

export async function GET(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const termino = normalizar(searchParams.get('buscar') ?? '');
  if (!termino) return NextResponse.json({ resultados: [] });

  let query = getSupabaseAdmin()
    .from('directorio_unificado')
    .select('uid, tipo_registro, id, nombre, telefono, email, source_tipo, retirado, pendiente_revision');

  const tipo = searchParams.get('tipo');
  if (tipo === 'visita' || tipo === 'miembro') {
    query = query.eq('tipo_registro', tipo);
  }

  // PostgREST parte el filtro `or=(...)` en comas y paréntesis, y `%`/`_` son
  // comodines de LIKE. Sin limpiarlos, un nombre con coma rompe la consulta y
  // un "%" suelto devuelve el directorio completo.
  const seguro = termino.replace(/[,()%_\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!seguro) return NextResponse.json({ resultados: [] });

  // Solo dígitos → está buscando por teléfono.
  query = /^[0-9]+$/.test(seguro)
    ? query.like('telefono_norm', `%${seguro}%`)
    : query.or(`nombre_norm.like.%${seguro}%,telefono_norm.like.%${seguro}%`);

  const { data, error } = await query.order('nombre').limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Por defecto se ocultan los dados de baja y los auto-registros sin aprobar,
  // igual que en GET /api/personas. `incluirInactivos=1` los trae para el
  // chequeo de duplicados, donde justamente interesa saber que ya existen.
  const resultados = searchParams.get('incluirInactivos')
    ? (data ?? [])
    : (data ?? []).filter((r) => !r.retirado && !r.pendiente_revision);

  return NextResponse.json({ resultados });
}
