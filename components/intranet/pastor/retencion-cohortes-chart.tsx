'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SinDatos } from './chart-kit';
import type { CohorteRetencion } from '@/lib/cohortes';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function etiquetaCohorte(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES_CORTOS[m - 1]} ${y}`;
}

// Color secuencial: un solo tono (salvia) que se oscurece con el %. Es la regla
// de la skill dataviz para magnitud — nunca un arcoíris. color-mix mantiene el
// texto a opacidad plena mientras solo el fondo varía.
function fondoCelda(pct: number): string {
  return `color-mix(in oklch, var(--chart-1) ${Math.round(pct)}%, transparent)`;
}
const textoCelda = (pct: number) => (pct >= 55 ? 'var(--primary-foreground)' : 'var(--foreground)');

// Cohortes muy chicas dan porcentajes que saltan (1 de 2 = 50%). Se marcan para
// que el pastor no lea de más un número armado con poca gente.
const COHORTE_CHICA = 4;

export function RetencionCohortesChart({ data }: { data: CohorteRetencion[] }) {
  const maxMeses = data.reduce((m, c) => Math.max(m, c.celdas.length), 0);

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Retención de miembros por cohorte</CardTitle>
        <p className="text-xs text-muted-foreground">
          De los que se unieron cada mes, qué porcentaje siguió asistiendo en los meses
          siguientes. Incluye a los que después se dieron de baja.
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {data.length === 0 ? (
          <SinDatos>Aún no hay miembros suficientes para armar cohortes por mes de ingreso.</SinDatos>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">
                      Se unieron en
                    </th>
                    {Array.from({ length: maxMeses }, (_, m) => (
                      <th key={m} className="px-2 py-1 text-center text-xs font-medium text-muted-foreground">
                        {m === 0 ? 'Mes 0' : `+${m}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.cohorte}>
                      <th className="whitespace-nowrap px-2 py-1 text-left font-normal">
                        <span className="text-foreground">{etiquetaCohorte(c.cohorte)}</span>
                        <span className={`ml-1.5 text-xs ${c.tamano < COHORTE_CHICA ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`}>
                          ({c.tamano})
                        </span>
                      </th>
                      {Array.from({ length: maxMeses }, (_, m) => {
                        const celda = c.celdas[m];
                        if (!celda) return <td key={m} />;
                        return (
                          <td
                            key={m}
                            className="rounded-md px-2 py-1.5 text-center tabular-nums"
                            style={{ backgroundColor: fondoCelda(celda.pct), color: textoCelda(celda.pct) }}
                            title={`${celda.retenidos} de ${c.tamano}`}
                          >
                            {celda.pct}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              <strong>Mes 0</strong> es el mes en que se unieron; <strong>+1</strong>, el
              siguiente, y así. El número entre paréntesis es el tamaño de la cohorte:{' '}
              <span className="text-amber-600 dark:text-amber-500">en ámbar</span> las de menos
              de {COHORTE_CHICA} personas, donde el porcentaje es poco confiable.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
