'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface BautizadosData {
  bautizados: number;
  en_proceso: number;
  no_bautizados: number;
}

const SLICES = [
  { key: 'bautizados' as keyof BautizadosData, label: 'Bautizados', color: '#6f814f' },
  { key: 'en_proceso' as keyof BautizadosData, label: 'En proceso', color: '#c08a3e' },
  { key: 'no_bautizados' as keyof BautizadosData, label: 'Sin bautizar', color: '#a8a093' },
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

export function BautizadosChart({ data }: { data: BautizadosData }) {
  const total = data.bautizados + data.en_proceso + data.no_bautizados;
  const chartData = SLICES.map((s) => ({ name: s.label, value: data[s.key], color: s.color }))
    .filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Estado de Bautismo</CardTitle>
        <p className="text-xs text-muted-foreground">{total} adultos registrados</p>
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
