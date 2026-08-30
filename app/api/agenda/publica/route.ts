import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/agenda/publica — el calendario para quien NO tiene cuenta.
//
// Existe separado del GET privado por una razón de privacidad, no de comodidad:
// acá se devuelve SOLO lo confirmado y SOLO los campos que un calendario
// necesita. Nunca sale el correo de quien pidió la fecha, ni el motivo de un
// rechazo, ni las solicitudes que están esperando respuesta — eso es
// conversación interna y no tiene por qué verla cualquiera que abra la URL.
//
// Los líderes sin cuenta necesitan ver qué fechas ya están tomadas antes de
// pedir la suya; para eso alcanza con el título, el día y el ministerio.
export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('agenda_eventos')
    .select('id, titulo, fecha, hora, ministerio')
    .eq('estado', 'confirmada')
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true, nullsFirst: true });

  if (error) {
    return NextResponse.json({ error: 'No pudimos cargar el calendario' }, { status: 500 });
  }

  return NextResponse.json({ eventos: data ?? [] });
}
