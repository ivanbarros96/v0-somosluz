// ⚠️ SOLO servidor. Informe de peticiones de oración en Excel (.xlsx).
//
// Lo usan dos rutas: la descarga (GET /api/oracion/exportar) y el envío al
// pastor (POST /api/oracion/enviar-informe). Vive acá para que ambas produzcan
// EXACTAMENTE el mismo archivo y el mismo resumen: el informe que Nicole
// descarga y el que le llega al pastor no pueden decir cosas distintas.
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

import ExcelJS from 'exceljs';
import { getSupabaseAdmin } from './supabase-admin';
import { CATEGORIA_KEYS, etiquetaCategoria } from './oracion-categorias';
import { ORIGENES_ORACION, ORIGEN_KEYS, esOrigenOracion } from './oracion-origen';

export const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'En espera',
  orando: 'Orando',
  contestada: 'Contestada',
};

export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// A partir de acá una petición lleva demasiado sin noticias.
export const DIAS_SIN_NOTICIAS = 14;

// Kit de marca. ExcelJS pide ARGB sin '#'.
const BOSQUE = 'FF223F2F';
const CREMA = 'FFECE9D8';
const ARENA = 'FFBCA286';
const AMBAR_SUAVE = 'FFFDF3E0';
const ROJO_SUAVE = 'FFFBE9E7';

/** 'YYYY-MM-DD' → 'DD-MM-YYYY', partiendo el texto (nunca con Date). */
export function fechaCL(iso: string | null | undefined): string {
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

function hoyEnChile(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

function diasDesde(fecha: string): number {
  const [a1, m1, d1] = fecha.split('-').map(Number);
  const [a2, m2, d2] = hoyEnChile().split('-').map(Number);
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

// ── Resumen ─────────────────────────────────────────────────────────────────
//
// Pedido de Iván (14/09/2026): la lista dice el estado de CADA petición, pero
// no el avance de un vistazo. El resumen responde eso — cuántas hay en cada
// estado, qué porcentaje está contestada y cuáles necesitan un llamado — y va
// como PRIMERA pestaña para que sea lo que se ve al abrir el archivo. Es
// también lo que se escribe en el WhatsApp y el correo al pastor.
//
// Todo sale de las mismas peticiones que la lista (mismo período y filtros):
// si no, los números del resumen y los de la lista podrían no cuadrar.

type Estado = 'pendiente' | 'orando' | 'contestada';
export type Conteo = Record<Estado, number> & { total: number };

export const ESTADOS_ORDEN: Estado[] = ['pendiente', 'orando', 'contestada'];

export interface FilaDesglose {
  nombre: string;
  c: Conteo;
}

export interface ResumenInforme {
  /** "Del 08-09-2026 al 14-09-2026" o "Todas las peticiones activas". */
  periodo: string;
  general: Conteo;
  nuncaContactadas: number;
  sinNoticiasLargo: number;
  porCategoria: FilaDesglose[];
  porEquipo: FilaDesglose[];
  porOrigen: FilaDesglose[];
}

export interface FiltrosInforme {
  /** 'YYYY-MM-DD', por fecha de llegada. */
  desde?: string | null;
  hasta?: string | null;
  estado?: string | null;
  origen?: string | null;
  categoria?: string | null;
  equipo?: string | null;
}

function conteoVacio(): Conteo {
  return { pendiente: 0, orando: 0, contestada: 0, total: 0 };
}

function contar(c: Conteo, estado: string) {
  if (estado === 'pendiente' || estado === 'orando' || estado === 'contestada') c[estado]++;
  c.total++;
}

function sumar(mapa: Map<string, Conteo>, clave: string, estado: string) {
  let c = mapa.get(clave);
  if (!c) mapa.set(clave, (c = conteoVacio()));
  contar(c, estado);
}

function estiloCabecera(celda: ExcelJS.Cell) {
  celda.font = { name: 'Calibri', size: 11, bold: true, color: { argb: CREMA } };
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BOSQUE } };
  celda.alignment = { vertical: 'middle', horizontal: 'left' };
}

function tituloSeccion(hoja: ExcelJS.Worksheet, fila: number, texto: string) {
  const celda = hoja.getCell(fila, 1);
  celda.value = texto;
  celda.font = { name: 'Calibri', size: 12, bold: true, color: { argb: BOSQUE } };
  hoja.getRow(fila).height = 20;
}

/**
 * Tabla de desglose: una fila por grupo con sus cantidades por estado.
 * Devuelve la primera fila libre después de la tabla (dejando un espacio).
 */
function tablaDesglose(
  hoja: ExcelJS.Worksheet,
  inicio: number,
  titulo: string,
  grupo: string,
  filas: FilaDesglose[],
): number {
  tituloSeccion(hoja, inicio, titulo);
  const cab = hoja.getRow(inicio + 1);
  [grupo, 'En espera', 'Orando', 'Contestada', 'Total', '% contestadas'].forEach((t, i) => {
    const celda = cab.getCell(i + 1);
    celda.value = t;
    estiloCabecera(celda);
  });

  let r = inicio + 2;
  for (const { nombre, c } of filas) {
    const fila = hoja.getRow(r);
    fila.values = [nombre, c.pendiente, c.orando, c.contestada, c.total, c.total ? c.contestada / c.total : null];
    fila.font = { name: 'Calibri', size: 10 };
    fila.getCell(6).numFmt = '0%';
    r++;
  }
  return r + 1;
}

/**
 * Arma el informe completo. Lanza error si falla la consulta: cada ruta decide
 * cómo contestarle al usuario.
 */
export async function generarInformeOracion(filtros: FiltrosInforme): Promise<{
  buffer: Buffer;
  nombreArchivo: string;
  resumen: ResumenInforme;
}> {
  const { desde, hasta, estado, origen, categoria, equipo } = filtros;
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

  if (error) throw new Error(`No se pudieron leer las peticiones: ${error.message}`);

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

  // Se crea antes que la lista para que sea la primera pestaña; se llena al
  // final, cuando ya están los conteos.
  const hojaResumen = libro.addWorksheet('Resumen', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

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

  const general = conteoVacio();
  const porCategoria = new Map<string, Conteo>();
  const porEquipo = new Map<string, Conteo>();
  const porOrigen = new Map<string, Conteo>();
  let nuncaContactadas = 0;
  let sinNoticiasLargo = 0;

  for (const p of peticiones ?? []) {
    const historial = porPeticion.get(p.id) ?? [];
    const ultimo = historial[0];
    const dias = ultimo ? diasDesde(ultimo.fecha) : null;

    contar(general, p.estado);
    sumar(porCategoria, p.categoria ?? 'sin', p.estado);
    sumar(porEquipo, p.equipo_id ? nombreEquipo.get(p.equipo_id) ?? 'Equipo archivado' : 'Sin asignar', p.estado);
    sumar(porOrigen, p.origen ?? '', p.estado);
    // Las contestadas no necesitan un llamado: no cuentan como pendientes de contacto.
    if (p.estado !== 'contestada') {
      if (dias === null) nuncaContactadas++;
      else if (dias >= DIAS_SIN_NOTICIAS) sinNoticiasLargo++;
    }

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

  const ordenar = (a: FilaDesglose, b: FilaDesglose) => b.c.total - a.c.total;
  const resumen: ResumenInforme = {
    periodo,
    general,
    nuncaContactadas,
    sinNoticiasLargo,
    porCategoria: [
      ...CATEGORIA_KEYS.filter((k) => porCategoria.has(k)).map((k) => ({ nombre: etiquetaCategoria(k), c: porCategoria.get(k)! })),
      ...(porCategoria.has('sin') ? [{ nombre: 'Sin clasificar', c: porCategoria.get('sin')! }] : []),
    ],
    porEquipo: [...porEquipo].map(([nombre, c]) => ({ nombre, c })).sort(ordenar),
    porOrigen: ORIGEN_KEYS.filter((k) => porOrigen.has(k)).map((k) => ({ nombre: ORIGENES_ORACION[k].nombre, c: porOrigen.get(k)! })),
  };

  // ── Llenado de la hoja Resumen ───────────────────────────────────────────
  hojaResumen.columns = [{ width: 34 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 11 }, { width: 15 }];

  const hayFiltros = Boolean(estado || origen || categoria || equipo);
  hojaResumen.getCell('A1').value = `Resumen de peticiones de oración · ${periodo}`;
  hojaResumen.mergeCells('A1:F1');
  hojaResumen.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: BOSQUE } };
  hojaResumen.getRow(1).height = 26;
  hojaResumen.getCell('A2').value =
    `Generado el ${fechaCLdeTimestamp(new Date().toISOString())}` +
    (hayFiltros ? ' · con los filtros aplicados en pantalla' : '') +
    ' · El detalle está en la pestaña "Peticiones"';
  hojaResumen.mergeCells('A2:F2');
  hojaResumen.getCell('A2').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF6B7280' } };

  if (general.total === 0) {
    hojaResumen.getCell('A4').value = 'No hay peticiones en este período.';
    hojaResumen.getCell('A4').font = { name: 'Calibri', size: 11 };
  } else {
    // Estado general
    tituloSeccion(hojaResumen, 4, 'Estado general');
    ['Estado', 'Cantidad', '% del total'].forEach((t, i) => {
      const celda = hojaResumen.getCell(5, i + 1);
      celda.value = t;
      estiloCabecera(celda);
    });
    let r = 6;
    for (const e of ESTADOS_ORDEN) {
      const fila = hojaResumen.getRow(r++);
      fila.values = [ESTADO_LABEL[e], general[e], general[e] / general.total];
      fila.font = { name: 'Calibri', size: 11 };
      fila.getCell(3).numFmt = '0%';
    }
    const total = hojaResumen.getRow(r++);
    total.values = ['Total', general.total, 1];
    total.getCell(3).numFmt = '0%';
    total.font = { name: 'Calibri', size: 11, bold: true };
    [1, 2, 3].forEach((c) => {
      total.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREMA } };
    });

    // Necesitan un llamado: mismos colores que las filas pintadas de la lista.
    r++;
    tituloSeccion(hojaResumen, r++, 'Necesitan contacto (sin contar las contestadas)');
    const alertas: [string, number, string][] = [
      ['Nunca contactadas', nuncaContactadas, ROJO_SUAVE],
      [`${DIAS_SIN_NOTICIAS} días o más sin noticias`, sinNoticiasLargo, AMBAR_SUAVE],
    ];
    for (const [texto, cantidad, color] of alertas) {
      const fila = hojaResumen.getRow(r++);
      fila.values = [texto, cantidad];
      fila.font = { name: 'Calibri', size: 11 };
      // Se pintan solo las dos celdas: pintar la fila entera la tiñe hasta el
      // final de la hoja.
      [1, 2].forEach((c) => {
        fila.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      });
    }

    r++;
    r = tablaDesglose(hojaResumen, r, 'Por categoría', 'Categoría', resumen.porCategoria);
    r = tablaDesglose(hojaResumen, r, 'Por equipo', 'Equipo', resumen.porEquipo);
    tablaDesglose(hojaResumen, r, 'Por procedencia', 'Procedencia', resumen.porOrigen);
  }

  const buffer = Buffer.from((await libro.xlsx.writeBuffer()) as ArrayBuffer);

  const hoy = hoyEnChile();
  const sufijo = desde || hasta ? `${desde ?? 'inicio'}_a_${hasta ?? hoy}` : hoy;

  return { buffer, nombreArchivo: `peticiones-oracion-${sufijo}.xlsx`, resumen };
}
