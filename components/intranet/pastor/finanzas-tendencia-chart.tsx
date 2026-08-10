'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltip, COLOR, EJE, GRID, CURSOR } from './chart-kit';

export interface FinanzasTendenciaMes {
  mes: string; // 'YYYY-MM'
  label: string;
  ingresos: number;
  egresos: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

export function FinanzasTendenciaChart({ data }: { data: FinanzasTendenciaMes[] }) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Tendencia de Finanzas</CardTitle>
        <p className="text-xs text-muted-foreground">Ingresos vs. egresos por mes</p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="label" {...EJE} />
            <YAxis {...EJE} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip content={<ChartTooltip formato={fmt} />} cursor={CURSOR} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {/* Azul/naranja en vez de verde/rojo: el par verde-rojo es
                indistinguible para quien tiene daltonismo rojo-verde (el
                validador lo marca en ΔE 1.9). Azul vs naranja es el par
                seguro estándar para comparaciones de dos vías. */}
            <Bar dataKey="ingresos" name="Ingresos" fill={COLOR.petroleo} radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="egresos" name="Egresos" fill={COLOR.terracota} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
