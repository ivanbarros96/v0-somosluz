'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Grid3x3, Loader2 } from 'lucide-react';
import { getPersonas, getCultos, getAsistencias } from '@/lib/datos';
import {
  MapaAsistencia, type DomingoColumna, type FilaAsistencia,
} from '@/components/intranet/pastor/mapa-asistencia';

// Cuántos domingos mostrar. Más que esto y la grilla se vuelve ilegible sin
// scroll horizontal en pantallas normales.
const DOMINGOS = 12;

export default function MapaAsistenciaPage() {
  const [domingos, setDomingos] = useState<DomingoColumna[]>([]);
  const [filas, setFilas] = useState<FilaAsistencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        // getPersonas() ya excluye dados de baja y pendientes de aprobación.
        const [personas, cultos, asist] = await Promise.all([
          getPersonas(),
          getCultos({ tipo: 'general', orden: 'asc' }),
          getAsistencias(),
        ]);

        const porPersona = new Map<number, Set<number>>();
        for (const a of asist) {
          if (a.persona_id == null) continue;
          const pid = Number(a.persona_id);
          if (!porPersona.has(pid)) porPersona.set(pid, new Set());
          porPersona.get(pid)!.add(Number(a.culto_id));
        }

        const ahora = Date.now();
        setDomingos(
          cultos
            .filter((c) => new Date(c.fecha).getTime() <= ahora)
            .slice(-DOMINGOS)
            .map((c) => ({
              id: Number(c.id),
              fecha: c.fecha,
              label: format(parseISO(c.fecha), 'd MMM', { locale: es }),
            })),
        );
        setFilas(
          personas.map((p) => ({
            id: Number(p.id),
            nombre: p.nombre,
            tipo: p.source_tipo,
            asistio: porPersona.get(Number(p.id)) ?? new Set<number>(),
            // Las celdas anteriores a su ingreso no cuentan como falta.
            desde: new Date((p.fecha_registro ?? p.created_at) as string).getTime(),
          })),
        );
      } catch {
        // Silencioso: la tarjeta muestra su propio estado vacío.
      }
      setLoading(false);
    }
    cargar();
  }, []);

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
          <Grid3x3 className="h-6 w-6 text-primary" />
          Mapa de asistencia
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Cada fila es una persona y cada columna uno de los últimos {DOMINGOS} domingos. Se
          ven de un vistazo los patrones: quién viene una semana sí y otra no, y quién dejó
          de venir.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <MapaAsistencia domingos={domingos} filas={filas} conEncabezado={false} />
      )}
    </div>
  );
}
