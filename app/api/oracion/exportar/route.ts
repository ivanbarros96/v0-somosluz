import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { puedeVerOracion } from '@/lib/roles';
import { generarInformeOracion, MIME_XLSX } from '@/lib/oracion-informe';

export const dynamic = 'force-dynamic';
// exceljs es una librería de Node, no corre en el runtime Edge.
export const runtime = 'nodejs';

// GET /api/oracion/exportar — descarga el informe de peticiones en Excel.
// El armado vive en lib/oracion-informe: es el mismo archivo que se le envía
// al pastor desde POST /api/oracion/enviar-informe.
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || !puedeVerOracion(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams;

  try {
    const { buffer, nombreArchivo } = await generarInformeOracion({
      desde: q.get('desde'),
      hasta: q.get('hasta'),
      estado: q.get('estado'),
      origen: q.get('origen'),
      categoria: q.get('categoria'),
      equipo: q.get('equipo'),
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': MIME_XLSX,
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      },
    });
  } catch (err) {
    console.error('[oracion/exportar]', err);
    return NextResponse.json({ error: 'No pudimos armar el informe' }, { status: 500 });
  }
}
