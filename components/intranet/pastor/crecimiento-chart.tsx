'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SinDatos, COLOR, EJE, GRID } from './chart-kit';

export interface CrecimientoMes {
  mes: string;
  nuevos: number;
  acumulado: number;
}

// Tooltip propio: además del total acumulado muestra cuántos entraron ese mes,
// que es el dato que explica la pendiente de la curva.
const TooltipCrecimiento = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const punto = payload[0]?.payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={{ background: COLOR.salvia }}
        />
        <span className="text-muted-foreground">Total</span>
        <span className="ml-auto font-semibold tabular-nums text-foreground">
          {punto?.acumulado}
        </span>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {punto?.nuevos > 0 ? `+${punto.nuevos} ese mes` : 'sin ingresos ese mes'}
      </p>
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
        {data.length === 0 ? (
          <SinDatos>Todavía no hay miembros registrados.</SinDatos>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLOR.salvia} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={COLOR.salvia} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="mes" {...EJE} />
              <YAxis allowDecimals={false} {...EJE} />
              <Tooltip content={<TooltipCrecimiento />} />
              <Area
                type="monotone"
                dataKey="acumulado"
                name="Total"
                stroke={COLOR.salvia}
                fill="url(#gradAcumulado)"
                strokeWidth={2}
                dot={{ fill: COLOR.salvia, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
