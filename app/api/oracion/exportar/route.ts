import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeVerOracion } from '@/lib/roles';
import { etiquetaCategoria } from '@/lib/oracion-categorias';
import { ORIGENES_ORACION, esOrigenOracion } from '@/lib/oracion-origen';

export const dynamic = 'force-dynamic';

// GET /api/oracion/exportar — informe de peticiones en CSV (abre en Excel).
//
// Reemplaza el informe que hoy se arma A MANO cada semana. Las columnas siguen
// las del documento real ("INFORMACION SEMANAL DE PETICIONES") para que se
// reconozca: número, fecha, quién la trae, por quién se ora, descripción,
// estado y observaciones. Lo que agrega es lo que al de papel le faltaba —
// la FECHA de cada contacto y los días que lleva sin noticias.
//
// Se usa CSV con ';' y BOM, igual que el export de Finanzas: es lo que Excel en
// Windows abre bien sin pedirle nada al usuario ni sumar dependencias.

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'En espera',
  orando: 'Orando',
  contestada: 'Contestada',
};

function csvCell(valor: string | number): string {
  const s = String(valor);
  // Excel entiende los saltos de línea dentro de una celda entrecomillada:
  // así el historial de seguimiento cabe entero en una sola columna.
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 'YYYY-MM-DD' → 'DD-MM-YYYY', partiendo el texto (nunca con Date). */
function fechaCL(iso: string | null): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}-${m}-${a}` : '';
}

/** Fecha de un timestamptz, en el día que fue en Chile. */
function fechaCLdeTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function diasDesde(fecha: string): number {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const [a1, m1, d1] = fecha.split('-').map(Number);
  const [a2, m2, d2] = hoy.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams;
  const desde = q.get('desde'); // 'YYYY-MM-DD', por fecha de llegada
  const hasta = q.get('hasta');
  const estado = q.get('estado');
  const origen = q.get('origen');
  const categoria = q.get('categoria');
  const equipo = q.get('equipo');

  const db = getSupabaseAdmin();

  let consulta = db
    .from('peticiones_oracion')
    .select('id, numero, nombre, beneficiario, categoria, equipo_id, telefono, peticion, estado, origen, created_at')
    .is('archivada_en', null)
    .order('numero', { ascending: true });

  // El rango va sobre la fecha de LLEGADA. `hasta` incluye el día completo:
  // sin el corte al final del día, una petición de esa misma tarde quedaría
  // fuera del informe.
  if (desde) consulta = consulta.gte('created_at', `${desde}T00:00:00-04:00`);
  if (hasta) consulta = consulta.lte('created_at', `${hasta}T23:59:59-04:00`);
  if (estado) consulta = consulta.eq('estado', estado);
  if (origen) consulta = consulta.eq('origen', origen);
  if (categoria === 'sin') consulta = consulta.is('categoria', null);
  else if (categoria) consulta = consulta.eq('categoria', categoria);
  if (equipo === 'sin') consulta = consulta.is('equipo_id', null);
  else if (equipo) consulta = consulta.eq('equipo_id', equipo);

  const [{ data: peticiones, error }, { data: equipos }, { data: seguimientos }] = await Promise.all([
    consulta,
    db.from('equipos_oracion').select('id, nombre'),
    db.from('seguimientos_oracion').select('peticion_id, fecha, nota').order('fecha', { ascending: false }),
  ]);

  if (error) {
    return NextResponse.json({ error: 'No pudimos armar el informe' }, { status: 500 });
  }

  const nombreEquipo = new Map((equipos ?? []).map((e) => [e.id, e.nombre]));

  // Historial por petición, del más reciente al más antiguo.
  const porPeticion = new Map<string, { fecha: string; nota: string }[]>();
  for (const s of seguimientos ?? []) {
    const lista = porPeticion.get(s.peticion_id);
    if (lista) lista.push(s);
    else porPeticion.set(s.peticion_id, [s]);
  }

  const columnas = [
    'ID Petición',
    'Fecha',
    'Quién la trae',
    'Por quién se ora',
    'Descripción de la petición',
    'Categoría',
    'Equipo',
    'Estado',
    'Procedencia',
    'Teléfono',
    'Último contacto',
    'Días sin contacto',
    'Seguimiento',
  ];

  const filas = (peticiones ?? []).map((p) => {
    const historial = porPeticion.get(p.id) ?? [];
    const ultimo = historial[0];
    return [
      csvCell(`PET-${String(p.numero).padStart(3, '0')}`),
      csvCell(fechaCLdeTimestamp(p.created_at)),
      csvCell(p.nombre),
      // Si no hay beneficiario, se ora por quien la trae. Se repite el nombre a
      // propósito: una celda vacía haría dudar de si falta el dato.
      csvCell(p.beneficiario ?? p.nombre),
      csvCell(p.peticion),
      csvCell(etiquetaCategoria(p.categoria)),
      csvCell(p.equipo_id ? nombreEquipo.get(p.equipo_id) ?? '' : 'Sin asignar'),
      csvCell(ESTADO_LABEL[p.estado] ?? p.estado),
      csvCell(esOrigenOracion(p.origen) ? ORIGENES_ORACION[p.origen].nombre : ''),
      csvCell(p.telefono ?? ''),
      csvCell(fechaCL(ultimo?.fecha ?? null)),
      // Lo que al informe de papel le faltaba: un "sin información" no dice si
      // es de hace tres días o de hace tres semanas.
      csvCell(ultimo ? diasDesde(ultimo.fecha) : 'Sin contacto'),
      // Todo el historial en una celda, una línea por contacto.
      csvCell(historial.map((s) => `${fechaCL(s.fecha)}: ${s.nota}`).join('\n')),
    ].join(';');
  });

  // BOM UTF-8: sin esto Excel en Windows rompe las tildes y la ñ.
  const csv = `﻿${columnas.join(';')}\r\n${filas.join('\r\n')}\r\n`;

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const sufijo = desde || hasta ? `${desde ?? 'inicio'}_a_${hasta ?? hoy}` : hoy;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="peticiones-oracion-${sufijo}.csv"`,
    },
  });
}
