import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { rangoMes, esCategoriaEgreso } from '@/lib/finanzas';

// Margen bajo el límite de payload de Vercel Serverless Functions (ver advertencia
// al usuario: Hobby ~4.5MB por request). 5MB de foto ya viene comprimido por el
// celular en la mayoría de los casos, pero fotos muy grandes pueden fallar antes
// de llegar aquí — el error se vería como 413 en el navegador.
const MAX_BYTES = 5 * 1024 * 1024;

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
    .select('id, fecha, detalle, monto, categoria, comprobante_path, created_at');

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

  // El bucket es privado: generamos una URL firmada de corta duración por cada
  // comprobante en vez de exponer el bucket como público.
  const egresos = await Promise.all(
    (data ?? []).map(async (e) => {
      if (!e.comprobante_path) return { ...e, comprobante_url: null };
      const { data: signed } = await db.storage
        .from('comprobantes')
        .createSignedUrl(e.comprobante_path, 3600);
      return { ...e, comprobante_url: signed?.signedUrl ?? null };
    }),
  );

  return NextResponse.json({ egresos });
}

// POST /api/finanzas/egresos — registrar un egreso con foto de comprobante (solo pastor)
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
  const file = form.get('comprobante');

  if (
    typeof fecha !== 'string' ||
    typeof detalle !== 'string' ||
    !detalle.trim() ||
    !(Number(montoRaw) > 0)
  ) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // La categoría es opcional: solo se valida si viene informada.
  let categoria: string | null = null;
  if (typeof categoriaRaw === 'string' && categoriaRaw.trim()) {
    if (!esCategoriaEgreso(categoriaRaw)) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
    }
    categoria = categoriaRaw;
  }

  const db = getSupabaseAdmin();
  let comprobante_path: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La foto no puede superar 5 MB' }, { status: 400 });
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${fecha}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage
      .from('comprobantes')
      .upload(path, buffer, { contentType: file.type || 'image/jpeg' });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    comprobante_path = path;
  }

  const { data, error } = await db
    .from('finanzas_egresos')
    .insert({ fecha, detalle: detalle.trim(), monto: Number(montoRaw), categoria, comprobante_path })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ egreso: data });
}
