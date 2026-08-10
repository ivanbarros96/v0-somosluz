'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, SinDatos, COLOR } from './chart-kit';

export interface BautizadosData {
  bautizados: number;
  en_proceso: number;
  no_bautizados: number;
}

// "Sin bautizar" en gris: es el estado de partida, no un logro que deba
// competir en color con los otros dos.
const SLICES = [
  { key: 'bautizados' as keyof BautizadosData, label: 'Bautizados', color: COLOR.salvia },
  { key: 'en_proceso' as keyof BautizadosData, label: 'En proceso', color: COLOR.dorado },
  { key: 'no_bautizados' as keyof BautizadosData, label: 'Sin bautizar', color: 'var(--muted-foreground)' },
];

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

export function BautizadosChart({ data }: { data: BautizadosData }) {
  const total = data.bautizados + data.en_proceso + data.no_bautizados;
  const chartData = SLICES
    .map((s) => ({ name: s.label, value: data[s.key], color: s.color }))
    .filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Estado de Bautismo</CardTitle>
        <p className="text-xs text-muted-foreground">{total} adultos registrados</p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {total === 0 ? (
          <SinDatos>Aún no hay adultos registrados.</SinDatos>
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
