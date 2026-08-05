import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { rangoMes, esCategoriaEgreso } from '@/lib/finanzas';
import { subirComprobante, MAX_COMPROBANTES_POR_EGRESO } from '@/lib/finanzas-comprobantes';

// GET /api/finanzas/egresos?mes=YYYY-MM|general — listar egresos (solo pastor)
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const mesParam = req.nextUrl.searchParams.get('mes');
  const db = getSupabaseAdmin();

  let query = db
    .from('finanzas_egresos')
    .select(
      'id, fecha, detalle, monto, categoria, categoria_personalizada, persona_id, persona_nombre, created_at',
    );

  if (mesParam !== 'general') {
    const { desde, hasta } = rangoMes(mesParam);
    query = query.gte('fecha', desde).lt('fecha', hasta);
  }

  const { data, error } = await query
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (data ?? []).map((e) => e.id);
  const { data: comprobantesRows, error: errComp } = ids.length
    ? await db.from('finanzas_egresos_comprobantes').select('id, egreso_id, storage_path').in('egreso_id', ids)
    : { data: [], error: null };
  if (errComp) {
    return NextResponse.json({ error: errComp.message }, { status: 500 });
  }

  // El bucket es privado: generamos una URL firmada de corta duración por cada
  // comprobante en vez de exponer el bucket como público.
  const porEgreso = new Map<number, { id: number; storage_path: string }[]>();
  for (const c of comprobantesRows ?? []) {
    const arr = porEgreso.get(c.egreso_id) ?? [];
    arr.push(c);
    porEgreso.set(c.egreso_id, arr);
  }

  const egresos = await Promise.all(
    (data ?? []).map(async (e) => {
      const propios = porEgreso.get(e.id) ?? [];
      const comprobantes = await Promise.all(
        propios.map(async (c) => {
          const { data: signed } = await db.storage
            .from('comprobantes')
            .createSignedUrl(c.storage_path, 3600);
          return { id: c.id, url: signed?.signedUrl ?? null };
        }),
      );
      return { ...e, comprobantes };
    }),
  );

  return NextResponse.json({ egresos });
}

// POST /api/finanzas/egresos — registrar un egreso con foto(s) de comprobante (solo pastor)
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const fecha = form.get('fecha');
  const detalle = form.get('detalle');
  const montoRaw = form.get('monto');
  const categoriaRaw = form.get('categoria');
  const categoriaPersonalizadaRaw = form.get('categoriaPersonalizada');
  const personaIdRaw = form.get('personaId');
  const personaNombreRaw = form.get('personaNombre');
  const files = form.getAll('comprobantes');

  if (
    typeof fecha !== 'string' ||
    typeof detalle !== 'string' ||
    !detalle.trim() ||
    !(Number(montoRaw) > 0)
  ) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  if (files.length > MAX_COMPROBANTES_POR_EGRESO) {
    return NextResponse.json({ error: `Máximo ${MAX_COMPROBANTES_POR_EGRESO} fotos por egreso` }, { status: 400 });
  }

  // La categoría es opcional: solo se valida si viene informada.
  let categoria: string | null = null;
  let categoriaPersonalizada: string | null = null;
  if (typeof categoriaRaw === 'string' && categoriaRaw.trim()) {
    if (!esCategoriaEgreso(categoriaRaw)) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
    }
    categoria = categoriaRaw;
    if (categoria === 'otros') {
      const texto = typeof categoriaPersonalizadaRaw === 'string' ? categoriaPersonalizadaRaw.trim() : '';
      if (!texto) {
        return NextResponse.json({ error: 'Escribe el nombre de la categoría' }, { status: 400 });
      }
      categoriaPersonalizada = texto;
    }
  }

  const personaNombre =
    typeof personaNombreRaw === 'string' && personaNombreRaw.trim() ? personaNombreRaw.trim() : null;
  const personaId = personaNombre && personaIdRaw ? Number(personaIdRaw) : null;

  const db = getSupabaseAdmin();

  let paths: (string | null)[];
  try {
    paths = await Promise.all(files.map((f) => subirComprobante(db, f, fecha)));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const pathsValidos = paths.filter((p): p is string => !!p);

  const { data, error } = await db
    .from('finanzas_egresos')
    .insert({
      fecha,
      detalle: detalle.trim(),
      monto: Number(montoRaw),
      categoria,
      categoria_personalizada: categoriaPersonalizada,
      persona_id: personaId,
      persona_nombre: personaNombre,
    })
    .select()
    .single();

  if (error) {
    // Si la fila no se pudo crear, no dejamos huérfanas las fotos ya subidas.
    if (pathsValidos.length) await db.storage.from('comprobantes').remove(pathsValidos);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (pathsValidos.length) {
    const { error: errComp } = await db
      .from('finanzas_egresos_comprobantes')
      .insert(pathsValidos.map((storage_path) => ({ egreso_id: data.id, storage_path })));
    if (errComp) {
      return NextResponse.json({ error: errComp.message }, { status: 500 });
    }
  }

  return NextResponse.json({ egreso: data });
}
