'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, SinDatos, COLOR, EJE, GRID, CURSOR } from './chart-kit';

export interface AsistenciaMes {
  mes: string;
  total: number;
}

export function AsistenciaMensualChart({ data }: { data: AsistenciaMes[] }) {
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Promedio de Asistencia por Mes</CardTitle>
        <p className="text-xs text-muted-foreground">
          Promedio de asistentes por culto dentro de cada mes
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {data.length === 0 ? (
          <SinDatos>Todavía no hay cultos con asistencia registrada.</SinDatos>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="mes" {...EJE} />
              <YAxis allowDecimals={false} {...EJE} />
              <Tooltip content={<ChartTooltip sufijo="por culto" />} cursor={CURSOR} />
              {/* Una sola serie: no lleva leyenda, el título ya la nombra. */}
              <Bar
                dataKey="total"
                name="Promedio"
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
