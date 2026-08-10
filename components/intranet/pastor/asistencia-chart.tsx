'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, SinDatos, COLOR, EJE, GRID, CURSOR } from './chart-kit';

export interface CultoAsistencia {
  fecha: string;
  total: number;
  descripcion?: string;
}

export function AsistenciaChart({ data }: { data: CultoAsistencia[] }) {
  const formatted = data.map((d) => ({
    ...d,
    // timeZone UTC: la fecha del culto está en medianoche UTC, evita desplazar el día
    label: new Date(d.fecha).toLocaleDateString('es-CL', {
      timeZone: 'UTC', day: 'numeric', month: 'short',
    }),
  }));

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Asistencia por Culto</CardTitle>
        <p className="text-xs text-muted-foreground">Últimos cultos registrados</p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {formatted.length === 0 ? (
          <SinDatos>Todavía no hay cultos con asistencia registrada.</SinDatos>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...EJE} />
              <YAxis allowDecimals={false} {...EJE} />
              <Tooltip content={<ChartTooltip sufijo="personas" />} cursor={CURSOR} />
              <Bar
                dataKey="total"
                name="Asistentes"
                fill={COLOR.salvia}
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
