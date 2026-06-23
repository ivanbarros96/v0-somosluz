'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface EdadRango {
  rango: string;
  total: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-indigo-600">{payload[0]?.value} personas</p>
    </div>
  );
};

export function EdadChart({ data, sinDato }: { data: EdadRango[]; sinDato: number }) {
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
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis dataKey="rango" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} className="fill-muted-foreground" interval={0} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-muted-foreground" allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)', rx: 4 }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {data.map((_, i) => <Cell key={i} fill="#6366f1" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
