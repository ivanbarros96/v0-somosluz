import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { calcularMovimientos } from '@/lib/finanzas-movimientos';
import { formatFechaCL, LABEL_CATEGORIA_EGRESO, type CategoriaEgreso } from '@/lib/finanzas';

// Escapa un valor para CSV: si contiene ; " o salto de línea, lo entrecomilla
// y duplica las comillas internas (regla estándar de CSV/Excel).
function csvCell(valor: string | number): string {
  const s = String(valor);
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /api/finanzas/exportar?mes=YYYY-MM|general — descarga CSV (abre en Excel)
// del historial de movimientos con saldo corrido (solo pastor).
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'pastor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const mesParam = req.nextUrl.searchParams.get('mes');

  let movimientos;
  try {
    movimientos = await calcularMovimientos(mesParam);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const filas = movimientos.slice().reverse(); // más reciente primero, igual que la vista

  const encabezado = ['Fecha', 'Tipo', 'Categoría', 'Persona', 'Detalle', 'Monto', 'Saldo'].join(';');
  const cuerpo = filas
    .map((m) =>
      [
        csvCell(formatFechaCL(m.fecha)),
        csvCell(m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'),
        csvCell(m.categoria ? LABEL_CATEGORIA_EGRESO[m.categoria as CategoriaEgreso] : ''),
        csvCell(m.personaNombre ?? ''),
        csvCell(m.detalle),
        csvCell(m.tipo === 'ingreso' ? m.monto : -m.monto),
        csvCell(m.saldo),
      ].join(';'),
    )
    .join('\n');

  // BOM UTF-8 al inicio: sin esto, Excel en Windows muestra mal las tildes/ñ.
  const csv = `\uFEFF${encabezado}\n${cuerpo}\n`;
  const nombreArchivo = `finanzas-${mesParam ?? 'general'}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  });
}
