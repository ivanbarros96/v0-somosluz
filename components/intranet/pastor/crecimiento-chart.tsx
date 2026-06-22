'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface CrecimientoMes {
  mes: string;
  nuevos: number;
  acumulado: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const punto = payload[0]?.payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-md space-y-0.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-blue-600">{punto?.acumulado} miembros en total</p>
      <p className="text-muted-foreground text-xs">+{punto?.nuevos} ese mes</p>
    </div>
  );
};

export function CrecimientoChart({ data }: { data: CrecimientoMes[] }) {
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Crecimiento de Miembros</CardTitle>
        <p className="text-xs text-muted-foreground">Total acumulado desde el inicio</p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAcumulado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} className="fill-muted-foreground" allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="acumulado" stroke="#3b82f6" fill="url(#gradAcumulado)" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
