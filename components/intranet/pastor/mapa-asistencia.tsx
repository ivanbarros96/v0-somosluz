'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SinDatos } from './chart-kit';

export interface DomingoColumna {
  id: number;
  fecha: string;
  label: string; // '9 ago'
}

export interface FilaAsistencia {
  id: number;
  nombre: string;
  tipo: string; // source_tipo
  asistio: Set<number>; // culto_id a los que asistió
  desde: number; // ms en que se unió: antes de eso las celdas no aplican
}

// Cuántas personas se muestran antes de pedir "ver todas". Mantiene la tarjeta
// legible sin cortar información: el buscador y el botón dan acceso al resto.
const VISIBLES = 25;

const TIPO_CORTO: Record<string, string> = { adulto: 'Adulto', joven: 'Joven', nino: 'Niño' };

export function MapaAsistencia({
  domingos, filas, conEncabezado = true,
}: {
  domingos: DomingoColumna[];
  filas: FilaAsistencia[];
  /** false cuando la página ya pone su propio título, para no repetirlo. */
  conEncabezado?: boolean;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [verTodas, setVerTodas] = useState(false);

  // Orden: primero quien menos vino en el período. Lo que el pastor necesita
  // mirar queda arriba, sin tener que buscarlo.
  const ordenadas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas
      .filter((f) => !q || f.nombre.toLowerCase().includes(q))
      .map((f) => {
        const aplicables = domingos.filter((d) => new Date(d.fecha).getTime() >= f.desde);
        const vino = aplicables.filter((d) => f.asistio.has(d.id)).length;
        return { ...f, vino, aplicables: aplicables.length };
      })
      .sort((a, b) => {
        const ra = a.aplicables ? a.vino / a.aplicables : 1;
        const rb = b.aplicables ? b.vino / b.aplicables : 1;
        return ra - rb || a.nombre.localeCompare(b.nombre);
      });
  }, [filas, domingos, busqueda]);

  const mostradas = verTodas ? ordenadas : ordenadas.slice(0, VISIBLES);

  return (
    <Card>
      {conEncabezado && (
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base">Mapa de asistencia</CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada fila es una persona y cada columna un domingo. Se ven de un vistazo los
            patrones: quién viene una semana sí y otra no, y quién dejó de venir.
          </p>
        </CardHeader>
      )}
      <CardContent className={conEncabezado ? 'p-4 md:p-6 pt-0' : 'p-4 md:p-6'}>
        {domingos.length === 0 || filas.length === 0 ? (
          <SinDatos>Todavía no hay domingos con asistencia registrada.</SinDatos>
        ) : (
          <>
            <Input
              className="mb-3"
              placeholder="Buscar persona..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-[3px] text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-card px-2 py-1 text-left text-xs font-medium text-muted-foreground">
                      Persona
                    </th>
                    {domingos.map((d) => (
                      <th
                        key={d.id}
                        className="px-1 py-1 text-center text-[10px] font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {d.label}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-center text-xs font-medium text-muted-foreground">
                      Vino
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mostradas.map((f) => (
                    <tr key={f.id}>
                      <th className="sticky left-0 z-10 max-w-[190px] truncate bg-card px-2 py-1 text-left font-normal">
                        <span className="text-foreground">{f.nombre}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {TIPO_CORTO[f.tipo] ?? f.tipo}
                        </span>
                      </th>
                      {domingos.map((d) => {
                        const aplica = new Date(d.fecha).getTime() >= f.desde;
                        const vino = f.asistio.has(d.id);
                        // Tres estados distinguibles sin depender solo del color:
                        // el "aún no era miembro" va casi transparente y con
                        // título explícito.
                        const estilo = !aplica
                          ? 'bg-muted/30'
                          : vino
                            ? 'bg-[var(--chart-1)]'
                            : 'bg-muted';
                        const titulo = !aplica
                          ? `${f.nombre} — aún no se había unido (${d.label})`
                          : `${f.nombre} — ${vino ? 'asistió' : 'faltó'} el ${d.label}`;
                        return (
                          <td key={d.id} className="p-0">
                            <div
                              className={`h-6 w-6 rounded-[4px] ${estilo}`}
                              title={titulo}
                              aria-label={titulo}
                            />
                          </td>
                        );
                      })}
                      <td className="px-2 text-center text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {f.vino}/{f.aplicables}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {ordenadas.length > VISIBLES && (
              <button
                type="button"
                onClick={() => setVerTodas((v) => !v)}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                {verTodas
                  ? 'Mostrar solo los primeros 25'
                  : `Ver las ${ordenadas.length} personas`}
              </button>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] bg-[var(--chart-1)]" aria-hidden /> Asistió
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] bg-muted" aria-hidden /> Faltó
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] bg-muted/30" aria-hidden /> Aún no era miembro
              </span>
              <span>· Ordenado por menor asistencia primero</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
