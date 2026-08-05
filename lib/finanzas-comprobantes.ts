// ⚠️ SOLO servidor. Sube comprobantes al bucket 'comprobantes' — compartido
// entre POST /api/finanzas/egresos (crear) y PATCH /api/finanzas/egresos/[id]
// (agregar fotos a un egreso existente).

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// Margen bajo el límite de payload de Vercel Serverless Functions (Hobby
// ~4.5MB por request). 5MB de foto ya viene comprimido por el celular en la
// mayoría de los casos, pero fotos muy grandes pueden fallar antes de llegar
// aquí — el error se vería como 413 en el navegador.
export const MAX_BYTES_COMPROBANTE = 5 * 1024 * 1024;
export const MAX_COMPROBANTES_POR_EGRESO = 5;

// El formulario solo ofrece imágenes (accept="image/*"). Se valida también
// aquí para no depender únicamente del allowlist del bucket, y para devolver
// un error entendible en vez del genérico de Storage.
const MIME_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
];

// Extensión derivada del tipo real declarado, no del nombre del archivo: así
// un "factura.pdf.jpg" no decide por sí solo cómo se guarda el objeto.
const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
};

// Sube un archivo de comprobante y devuelve su storage_path, o null si el
// campo venía vacío (no es un File real). Lanza si el archivo no pasa las
// validaciones o si falla la subida.
export async function subirComprobante(
  db: SupabaseClient,
  file: FormDataEntryValue | null,
  fecha: string,
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;

  if (file.size > MAX_BYTES_COMPROBANTE) throw new Error('Cada foto no puede superar 5 MB');

  const contentType = (file.type || '').toLowerCase();
  if (!MIME_PERMITIDOS.includes(contentType)) {
    throw new Error('El comprobante debe ser una imagen (JPG, PNG, WEBP, HEIC o GIF).');
  }

  const ext = EXT_POR_MIME[contentType];
  const path = `${fecha}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage.from('comprobantes').upload(path, buffer, { contentType });
  if (error) throw new Error(error.message);

  return path;
}
