import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/cumpleanos?dias=400 — próximos cumpleaños. Requiere sesión.
//
// Delega el cálculo a la función de Postgres `cumpleanos_proximos`, que es la
// fuente única de verdad: la usan tanto esta ruta como los flujos de n8n, así
// no hay dos cálculos que puedan discrepar. La función ya excluye a las
// personas retiradas y resuelve a quién se le escribe (la persona o su
// apoderado, según el caso).
//
// El filtrado por audiencia de ministerio se hace en el cliente, con las
// mismas reglas de lib/cultos-tipos.ts que ya usan Miembros y Asistencia —
// esos roles ya pueden ver a toda la congregación con el toggle "Ver todos",
// así que no expone nada nuevo.
export async function GET(req: NextRequest) {
  if (!getSession(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const diasRaw = req.nextUrl.searchParams.get('dias');
  const dias = Number(diasRaw);
  const diasAdelante = Number.isFinite(dias) && dias > 0 && dias <= 400 ? Math.floor(dias) : 400;

  const { data, error } = await getSupabaseAdmin().rpc('cumpleanos_proximos', {
    dias_adelante: diasAdelante,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cumpleanos: data ?? [] });
}
