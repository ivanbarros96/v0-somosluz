'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SexoData {
  femenino: number;
  masculino: number;
  sin_dato: number;
}

const SLICES = [
  { key: 'femenino' as keyof SexoData, label: 'Femenino', color: '#ec4899' },
  { key: 'masculino' as keyof SexoData, label: 'Masculino', color: '#3b82f6' },
  { key: 'sin_dato' as keyof SexoData, label: 'Sin dato', color: '#94a3b8' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{payload[0].name}</p>
      <p className="font-semibold" style={{ color: payload[0].payload.color }}>
        {payload[0].value} personas
      </p>
    </div>
  );
};

const CustomLegend = ({ payload }: any) => (
  <div className="flex flex-col gap-1.5 mt-2">
    {payload?.map((entry: any) => (
      <div key={entry.value} className="flex items-center gap-2 text-xs">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
        <span className="text-muted-foreground">{entry.value}</span>
        <span className="text-foreground font-medium ml-auto">{entry.payload.value}</span>
      </div>
    ))}
  </div>
);

export function SexoChart({ data }: { data: SexoData }) {
  const total = data.femenino + data.masculino + data.sin_dato;
  const chartData = SLICES.map((s) => ({ name: s.label, value: data[s.key], color: s.color }))
    .filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Distribución por Sexo</CardTitle>
        <p className="text-xs text-muted-foreground">{total} personas registradas</p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} cx="40%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend layout="vertical" align="right" verticalAlign="middle" content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
