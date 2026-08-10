'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, SinDatos, COLOR } from './chart-kit';

export interface SexoData {
  femenino: number;
  masculino: number;
  sin_dato: number;
}

// "Sin dato" va en gris a propósito: es ausencia de información, no una tercera
// categoría, y no debe competir visualmente con las dos reales.
const SLICES = [
  { key: 'femenino' as keyof SexoData, label: 'Femenino', color: COLOR.ciruela },
  { key: 'masculino' as keyof SexoData, label: 'Masculino', color: COLOR.petroleo },
  { key: 'sin_dato' as keyof SexoData, label: 'Sin dato', color: 'var(--muted-foreground)' },
];

// La leyenda muestra nombre Y cantidad, así que la identidad nunca depende solo
// del color — condición para que sirva a quien no distingue matices.
const LeyendaConValores = ({ payload }: any) => (
  <ul className="mt-2 flex flex-col gap-1.5">
    {payload?.map((entry: any) => (
      <li key={entry.value} className="flex items-center gap-2 text-xs">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-muted-foreground">{entry.value}</span>
        <span className="ml-auto font-medium tabular-nums text-foreground">
          {entry.payload.value}
        </span>
      </li>
    ))}
  </ul>
);

export function SexoChart({ data }: { data: SexoData }) {
  const total = data.femenino + data.masculino + data.sin_dato;
  const chartData = SLICES
    .map((s) => ({ name: s.label, value: data[s.key], color: s.color }))
    .filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Distribución por Sexo</CardTitle>
        <p className="text-xs text-muted-foreground">{total} personas registradas</p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {total === 0 ? (
          <SinDatos>Aún no hay personas registradas.</SinDatos>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="40%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip sufijo="personas" />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                content={<LeyendaConValores />}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
