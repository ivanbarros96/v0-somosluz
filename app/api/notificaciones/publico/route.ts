import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { VALID_ROLES, type UserRole, puedeAutorizarFichas, puedeAutorizarAgenda, puedeVerOracion, abreCultos, ministerioDeRol } from '@/lib/roles';
import { cultosSinCerrar } from '@/lib/cultos-abiertos';

export const dynamic = 'force-dynamic';

// GET /api/notificaciones/publico
//
// Cuántos avisos tiene cada perfil, para el contador de la pantalla de acceso.
// Es el ÚNICO endpoint de notificaciones sin sesión, así que se diseñó para
// filtrar todo lo que no sea estrictamente el número.
//
// Qué SÍ devuelve: { somosluz: 3, oracion: 0, ... } — un entero por perfil.
// Qué NO devuelve, a propósito: de qué son los avisos, de quién, de cuándo, ni
// el desglose por tipo. Un desconocido que abra la URL sólo puede saber que
// "Secretaría tiene 3 cosas por hacer", nunca que hay una petición de oración
// de fulano ni quién se registró. Decisión conversada con Iván (03/09/2026):
// él pidió el contador y nada más que el contador.
//
// El número va TOPADO en 9: además de que la UI muestra "9+", un tope evita
// que el conteo exacto revele el tamaño de la congregación o el volumen real
// de peticiones.
//
// OJO — este contador NO se apaga al leer los avisos, a diferencia del de
// adentro. La marca de "visto" vive en el navegador (localStorage) y esta
// pantalla es pública y suele abrirse desde otro equipo o teléfono, donde esa
// marca no existe. Acá el número dice "hay 3 cosas esperando", que sigue
// siendo cierto aunque alguien ya las haya mirado. Para que también se apagara
// habría que guardar el "leído" en la base por usuario, no por navegador.
const TOPE = 9;

// Caché corta en memoria: la pantalla de acceso la puede pedir cualquiera, así
// que sin esto un refresco insistente golpearía la base sin límite. 60 s es
// suficiente para que el contador se sienta al día.
let cache: { hasta: number; datos: Record<string, number> } | null = null;
const CACHE_MS = 60_000;

export async function GET() {
  if (cache && Date.now() < cache.hasta) {
    return NextResponse.json({ conteos: cache.datos });
  }

  const db = getSupabaseAdmin();

  const [fichas, agenda, oracion, cultos] = await Promise.all([
    db.from('personas').select('id', { count: 'exact', head: true }).eq('pendiente_revision', true),
    db.from('agenda_eventos').select('id', { count: 'exact', head: true }).eq('estado', 'propuesta'),
    db.from('peticiones_oracion').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    db.from('cultos').select('id, fecha, tipo, activo').eq('activo', true),
  ]);

  const nFichas = fichas.count ?? 0;
  const nAgenda = agenda.count ?? 0;
  const nOracion = oracion.count ?? 0;
  const abiertos = cultos.data ?? [];

  const conteos: Record<string, number> = {};
  for (const role of VALID_ROLES as UserRole[]) {
    let n = 0;
    if (puedeAutorizarFichas(role)) n += nFichas;
    if (puedeAutorizarAgenda(role)) n += nAgenda;
    if (puedeVerOracion(role)) n += nOracion;
    // Mismo cálculo que la campana y el menú, para que el número de la pantalla
    // de acceso no pueda contradecir al de adentro.
    if (abreCultos(role)) n += cultosSinCerrar(abiertos, ministerioDeRol(role)).length;
    conteos[role] = Math.min(n, TOPE);
  }

  cache = { hasta: Date.now() + CACHE_MS, datos: conteos };
  return NextResponse.json({ conteos });
}
