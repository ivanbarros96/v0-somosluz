import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getSession } from '@/lib/session';
import { puedeVerOracion } from '@/lib/roles';
import { etiquetaCategoria } from '@/lib/oracion-categorias';
import { ORIGENES_ORACION, esOrigenOracion } from '@/lib/oracion-origen';

export const dynamic = 'force-dynamic';
// exceljs es una librería de Node, no corre en el runtime Edge.
export const runtime = 'nodejs';

// GET /api/oracion/exportar — informe de peticiones en Excel (.xlsx).
//
// Reemplaza el informe que hoy se arma A MANO cada semana. Las columnas siguen
// las del documento real ("INFORMACION SEMANAL DE PETICIONES") para que se
// reconozca de inmediato, y lo que agrega es lo que al de papel le faltaba: la
// FECHA de cada contacto y los días que lleva sin noticias.
//
// Es un .xlsx de verdad y no un CSV (pedido de Iván, 07/09/2026: "en modo tabla
// y bien organizado"). Eso permite tabla con filtros, anchos de columna,
// encabezado fijo al desplazar y colores del kit de marca — nada de eso cabe en
// un CSV.

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'En espera',
  orando: 'Orando',
  contestada: 'Contestada',
};

// Kit de marca. ExcelJS pide ARGB sin '#'.
const BOSQUE = 'FF223F2F';
const CREMA = 'FFECE9D8';
const ARENA = 'FFBCA286';
const AMBAR_SUAVE = 'FFFDF3E0';
const ROJO_SUAVE = 'FFFBE9E7';

/** 'YYYY-MM-DD' → 'DD-MM-YYYY', partiendo el texto (nunca con Date). */
function fechaCL(iso: string | null): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}-${m}-${a}` : '';
}

/** Día en que ocurrió, en Chile, a partir de un timestamptz. */
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

// Ancho en caracteres de cada columna. Van a mano y no automáticos: la
// descripción y el seguimiento son textos largos que, sin un tope, harían una
// columna de medio metro y volverían la hoja inservible.
const COLUMNAS: { titulo: string; clave: string; ancho: number; envolver?: boolean }[] = [
  { titulo: 'ID',                clave: 'id',        ancho: 10 },
  { titulo: 'Fecha',             clave: 'fecha',     ancho: 12 },
  { titulo: 'Quién la trae',     clave: 'trae',      ancho: 24 },
  { titulo: 'Por quién se ora',  clave: 'porQuien',  ancho: 24 },
  { titulo: 'Petición',          clave: 'peticion',  ancho: 48, envolver: true },
  { titulo: 'Categoría',         clave: 'categoria', ancho: 20 },
  { titulo: 'Equipo',            clave: 'equipo',    ancho: 20 },
  { titulo: 'Estado',            clave: 'estado',    ancho: 13 },
  { titulo: 'Procedencia',       clave: 'origen',    ancho: 20 },
  { titulo: 'Teléfono',          clave: 'telefono',  ancho: 16 },
  { titulo: 'Último contacto',   clave: 'contacto',  ancho: 15 },
  { titulo: 'Días sin contacto', clave: 'dias',      ancho: 16 },
  { titulo: 'Seguimiento',       clave: 'seguimiento', ancho: 60, envolver: true },
];

const DIAS_SIN_NOTICIAS = 14;

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

  // El rango va sobre la fecha de LLEGADA. `hasta` incluye el día completo: sin
  // el corte al final del día, una petición de esa misma tarde quedaría fuera.
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

  const porPeticion = new Map<string, { fecha: string; nota: string }[]>();
  for (const s of seguimientos ?? []) {
    const lista = porPeticion.get(s.peticion_id);
    if (lista) lista.push(s);
    else porPeticion.set(s.peticion_id, [s]);
  }

  // ── Construcción del libro ────────────────────────────────────────────────
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Somos Luz';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Peticiones', {
    // Encabezado fijo: con 30 filas se pierde de vista qué columna es cuál.
    views: [{ state: 'frozen', ySplit: 2 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  hoja.columns = COLUMNAS.map((c) => ({ key: c.clave, width: c.ancho }));

  // Fila 1: título, para que el archivo se explique solo al abrirlo.
  const periodo =
    desde || hasta
      ? `Del ${fechaCL(desde) || 'inicio'} al ${fechaCL(hasta) || 'hoy'}`
      : 'Todas las peticiones activas';
  const titulo = hoja.getRow(1);
  titulo.getCell(1).value = `Peticiones de oración · ${periodo}`;
  hoja.mergeCells(1, 1, 1, COLUMNAS.length);
  titulo.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: BOSQUE } };
  titulo.getCell(1).alignment = { vertical: 'middle' };
  titulo.height = 26;

  // Fila 2: encabezados.
  const cabecera = hoja.getRow(2);
  COLUMNAS.forEach((c, i) => {
    const celda = cabecera.getCell(i + 1);
    celda.value = c.titulo;
    celda.font = { name: 'Calibri', size: 11, bold: true, color: { argb: CREMA } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BOSQUE } };
    celda.alignment = { vertical: 'middle', horizontal: 'left' };
    celda.border = { bottom: { style: 'thin', color: { argb: ARENA } } };
  });
  cabecera.height = 22;

  for (const p of peticiones ?? []) {
    const historial = porPeticion.get(p.id) ?? [];
    const ultimo = historial[0];
    const dias = ultimo ? diasDesde(ultimo.fecha) : null;

    const fila = hoja.addRow({
      id: `PET-${String(p.numero).padStart(3, '0')}`,
      fecha: fechaCLdeTimestamp(p.created_at),
      trae: p.nombre,
      // Si no hay beneficiario se ora por quien la trae. Se repite el nombre a
      // propósito: una celda vacía haría dudar de si falta el dato.
      porQuien: p.beneficiario ?? p.nombre,
      peticion: p.peticion,
      categoria: etiquetaCategoria(p.categoria),
      equipo: p.equipo_id ? nombreEquipo.get(p.equipo_id) ?? '' : 'Sin asignar',
      estado: ESTADO_LABEL[p.estado] ?? p.estado,
      origen: esOrigenOracion(p.origen) ? ORIGENES_ORACION[p.origen].nombre : '',
      telefono: p.telefono ?? '',
      contacto: fechaCL(ultimo?.fecha ?? null),
      // Número cuando hubo contacto, para poder ordenar y filtrar de mayor a
      // menor: así se encuentra a quién llamar. Las que nunca tuvieron contacto
      // van como TEXTO y no en blanco, porque Excel manda las celdas vacías al
      // final de cualquier orden — y justamente esas son las más urgentes. Al
      // ordenar de mayor a menor, el texto queda arriba, que es lo correcto.
      dias: dias ?? 'Sin contacto',
      seguimiento: historial.map((s) => `${fechaCL(s.fecha)}: ${s.nota}`).join('\n'),
    });

    fila.alignment = { vertical: 'top', wrapText: true };
    fila.font = { name: 'Calibri', size: 10 };

    // Se pinta la fila cuando lleva demasiado sin noticias. El color acompaña
    // al dato, no lo reemplaza: la columna "Días sin contacto" sigue ahí para
    // quien imprima en blanco y negro o no distinga los tonos.
    const sinNoticias = dias === null || dias >= DIAS_SIN_NOTICIAS;
    if (sinNoticias && p.estado !== 'contestada') {
      fila.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: dias === null ? ROJO_SUAVE : AMBAR_SUAVE },
      };
    }
  }

  const ultimaFila = hoja.rowCount;

  // Tabla con filtros en el encabezado: es lo que pidió Iván ("en modo tabla").
  // Se usa autoFilter y no addTable() a propósito — addTable reescribe el
  // formato de las celdas y perdería el pintado de las filas sin noticias.
  if (ultimaFila > 2) {
    hoja.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: ultimaFila, column: COLUMNAS.length },
    };
  }

  const buffer = await libro.xlsx.writeBuffer();

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const sufijo = desde || hasta ? `${desde ?? 'inicio'}_a_${hasta ?? hoy}` : hoy;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="peticiones-oracion-${sufijo}.xlsx"`,
    },
  });
}
