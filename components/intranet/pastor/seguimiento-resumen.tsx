'use client';

import { ArrowRight, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Titular } from './chart-kit';

export interface ResumenRiesgo {
  bajo: number;
  medio: number;
  alto: number;
  /** Los de mayor riesgo, para dar nombres y no solo un número. */
  nombresAlto: string[];
}

// Titular del estado de seguimiento. El home dice CUÁNTOS y QUIÉNES; la
// pantalla de Seguimiento (menú izquierdo) trae la lista completa con los
// motivos y el botón de llamar.
export function SeguimientoResumen({ data }: { data: ResumenRiesgo }) {
  const total = data.bajo + data.medio + data.alto;
  const tono = data.alto > 0 ? 'grave' : data.medio > 0 ? 'atencion' : 'bueno';

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" aria-hidden />
          Quién necesita seguimiento
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Según ausencias seguidas, caída de asistencia y antigüedad
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay datos suficientes para evaluar el seguimiento.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <Titular
                valor={data.alto}
                tono={tono as 'bueno' | 'atencion' | 'grave'}
                pie={data.alto === 1 ? 'persona en riesgo alto' : 'personas en riesgo alto'}
              />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold tabular-nums text-foreground">{data.medio}</span>{' '}
                  en atención
                </span>
                <span>
                  <span className="font-semibold tabular-nums text-foreground">{data.bajo}</span>{' '}
                  al día
                </span>
              </div>
            </div>

            {data.nombresAlto.length > 0 && (
              <p className="mb-3 text-sm text-foreground">
                {data.nombresAlto.join(' · ')}
                {data.alto > data.nombresAlto.length && (
                  <span className="text-muted-foreground">
                    {' '}y {data.alto - data.nombresAlto.length} más
                  </span>
                )}
              </p>
            )}

            <a
              href="/intranet/dashboard/seguimiento"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver la lista y llamar
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}
