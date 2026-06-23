'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface FidelidadData {
  nivel: string;
  total: number;
  color: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold" style={{ color: payload[0]?.payload?.color }}>
        {payload[0]?.value} personas
      </p>
    </div>
  );
};

export function FidelidadChart({ data, evaluadas }: { data: FidelidadData[]; evaluadas: number }) {
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Fidelidad de Asistencia</CardTitle>
        <p className="text-xs text-muted-foreground">
          % de cultos asistidos desde que cada persona se unió · {evaluadas} evaluadas
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis dataKey="nivel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-muted-foreground" allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)', rx: 4 }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
