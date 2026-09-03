'use client';

// "¿Cómo nos fue la última vez?" — el titular de la sección de Asistencia.
//
// El resto de las gráficas responden "cómo venimos"; ésta responde lo primero
// que uno mira al entrar: la última reunión, comparada con lo normal de ESA
// reunión. Sin la comparación el número no dice nada — 48 personas es mucho o
// poco según a qué esté acostumbrado ese servicio.

import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SinDatos, Titular } from './chart-kit';
import { CULTO_TIPOS, type CultoTipo } from '@/lib/cultos-tipos';
import type { Pulso } from '@/lib/pulso-asistencia';

// Una caída del 12% no es una emergencia: eso es amarillo, no rojo. El rojo se
// reserva para un desplome real, para que no pierda significado por usarse de más.
const CAIDA_GRAVE = -25;

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { timeZone: 'UTC', day: 'numeric', month: 'long' });

export function PulsoAsistenciaCard({
  pulso,
  tipo,
  fechaUltima,
  sinRegistrar = [],
}: {
  pulso: Pulso | null;
  tipo: CultoTipo;
  /** Fecha ISO de la última reunión CON asistencia, para situar el número. */
  fechaUltima: string | null;
  /** Reuniones ya pasadas donde nadie quedó marcado (asistencia sin cerrar). */
  sinRegistrar?: string[];
}) {
  const label = CULTO_TIPOS[tipo].label;
  const fecha = fechaUltima ? fmt(fechaUltima) : null;

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Cómo nos fue la última vez</CardTitle>
        <p className="text-xs text-muted-foreground">
          {label}
          {fecha ? ` · ${fecha}` : ''}
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 space-y-4">
        {/* Una reunión sin nadie marcado se deja FUERA de todas las cifras de
            este bloque — pero no se esconde: si no se avisara, el pastor vería
            números que no cuadran con lo que recuerda y no sabría por qué. */}
        {sinRegistrar.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
            <AlertCircle
              className="mt-px h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500"
              aria-hidden
            />
            <span>
              {sinRegistrar.length === 1
                ? `La reunión del ${fmt(sinRegistrar[0])} todavía no tiene asistencia registrada, así que no entra en estos números.`
                : `Hay ${sinRegistrar.length} reuniones sin asistencia registrada (la última, el ${fmt(sinRegistrar[sinRegistrar.length - 1])}); no entran en estos números.`}
            </span>
          </p>
        )}

        {!pulso ? (
          <SinDatos>
            Hacen falta al menos 4 reuniones registradas de este servicio para poder decir
            si una asistencia está sobre o bajo lo normal.
          </SinDatos>
        ) : (
          (() => {
            const { nivel, desvioPct, ultima, normal, base } = pulso;
            const tono =
              nivel === 'arriba' ? 'bueno'
              : nivel === 'normal' ? 'normal'
              : desvioPct <= CAIDA_GRAVE ? 'grave'
              : 'atencion';
            const Icono =
              nivel === 'arriba' ? TrendingUp : nivel === 'abajo' ? TrendingDown : Minus;
            const lectura =
              nivel === 'arriba' ? `${desvioPct}% sobre lo normal`
              : nivel === 'abajo' ? `${Math.abs(desvioPct)}% bajo lo normal`
              : 'dentro de lo normal';

            return (
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <Titular
                  valor={ultima}
                  tono={tono}
                  pie={
                    <span className="inline-flex items-center gap-1">
                      <Icono className="h-3.5 w-3.5" aria-hidden />
                      {lectura}
                    </span>
                  }
                />
                <div className="text-xs text-muted-foreground">
                  <p>
                    Lo normal:{' '}
                    <span className="font-semibold tabular-nums text-foreground">{normal}</span>{' '}
                    personas
                  </p>
                  <p className="mt-0.5">promedio de las últimas {base} reuniones</p>
                </div>
              </div>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}
