'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Baby } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, SinDatos, Titular, COLOR, EJE, GRID, CURSOR } from './chart-kit';

export interface CoberturaKidsDomingo {
  fecha: string;
  label: string;
  enIglesia: number; // niños marcados en el culto dominical
  enKids: number;    // niños marcados en la clase de Kids
}

export function KidsCoberturaChart({ data }: { data: CoberturaKidsDomingo[] }) {
  // Promedio ponderado (total sobre total), no promedio de porcentajes: un
  // domingo con 3 niños no puede pesar lo mismo que uno con 20.
  const totalIglesia = data.reduce((s, d) => s + d.enIglesia, 0);
  const totalKids = data.reduce((s, d) => s + d.enKids, 0);
  const cobertura = totalIglesia > 0 ? Math.round((totalKids / totalIglesia) * 100) : null;

  const ultimo = data[data.length - 1];
  const coberturaUltimo =
    ultimo && ultimo.enIglesia > 0 ? Math.round((ultimo.enKids / ultimo.enIglesia) * 100) : null;

  const tono = cobertura == null ? 'normal'
    : cobertura >= 75 ? 'bueno'
    : cobertura >= 50 ? 'atencion'
    : 'grave';

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Cobertura de la clase de Kids</CardTitle>
        <p className="text-xs text-muted-foreground">
          De los niños que vinieron a la iglesia, cuántos entraron a la sala
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {data.length === 0 ? (
          <SinDatos icono={<Baby className="h-6 w-6" aria-hidden />}>
            Todavía no hay ningún domingo con clase de Kids registrada. El dato aparece
            solo cuando existan las dos asistencias del mismo domingo: la del culto y la
            de la sala.
          </SinDatos>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <Titular
                valor={cobertura ?? '—'}
                unidad="%"
                tono={tono}
                pie={
                  <>
                    Promedio de {data.length}{' '}
                    {data.length === 1 ? 'domingo' : 'domingos'} · {totalKids} de{' '}
                    {totalIglesia} niños
                  </>
                }
              />
              {coberturaUltimo != null && (
                <p className="text-xs text-muted-foreground">
                  Último domingo:{' '}
                  <span className="font-semibold tabular-nums text-foreground">
                    {coberturaUltimo}%
                  </span>
                </p>
              )}
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="label" {...EJE} />
                <YAxis allowDecimals={false} {...EJE} />
                <Tooltip content={<ChartTooltip sufijo="niños" />} cursor={CURSOR} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {/* Dos series, así que la leyenda es obligatoria: el color por sí
                    solo no puede ser lo único que distinga una barra de la otra. */}
                <Bar
                  dataKey="enIglesia"
                  name="Vinieron a la iglesia"
                  fill={COLOR.petroleo}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="enKids"
                  name="Entraron a Kids"
                  fill={COLOR.salvia}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
