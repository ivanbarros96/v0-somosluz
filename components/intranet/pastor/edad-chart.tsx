'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, SinDatos, COLOR, EJE, GRID, CURSOR } from './chart-kit';

export interface EdadRango {
  rango: string;
  total: number;
}

export function EdadChart({ data, sinDato }: { data: EdadRango[]; sinDato: number }) {
  const hayDatos = data.some((d) => d.total > 0);

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Rangos de Edad</CardTitle>
        <p className="text-xs text-muted-foreground">
          Composición etaria de la congregación
          {sinDato > 0 && ` · ${sinDato} sin fecha de nacimiento`}
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {!hayDatos ? (
          <SinDatos>
            Nadie tiene fecha de nacimiento cargada, así que no se puede calcular la edad.
          </SinDatos>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="rango" interval={0} {...EJE} tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} {...EJE} />
              <Tooltip content={<ChartTooltip sufijo="personas" />} cursor={CURSOR} />
              <Bar
                dataKey="total"
                name="Personas"
                fill={COLOR.terracota}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
