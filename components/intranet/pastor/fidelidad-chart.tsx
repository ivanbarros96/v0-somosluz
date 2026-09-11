'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIdioma } from '@/lib/idioma';
import { ChartTooltip, SinDatos, EJE, GRID, CURSOR } from './chart-kit';

export type FidelidadNivel = 'alta' | 'media' | 'baja';

export interface FidelidadData {
  key: FidelidadNivel;
  nivel: string;
  total: number;
  color: string;
}

export function FidelidadChart({
  data,
  evaluadas,
  onSelect,
}: {
  data: FidelidadData[];
  evaluadas: number;
  onSelect?: (nivel: FidelidadNivel) => void;
}) {
  const { t } = useIdioma();
  const clickable = !!onSelect;
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">{t('Fidelidad de Asistencia')}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('% de cultos asistidos desde que cada persona se unió')} · {evaluadas}{' '}
          {t('evaluadas')}{' '}
          {clickable && <span className="text-primary">{t('· clic en una barra para ver el detalle')}</span>}
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {evaluadas === 0 ? (
          <SinDatos>{t('Nadie tiene todavía cultos suficientes para evaluar su fidelidad. El cálculo empieza cuando una persona ya estaba registrada al momento de un culto.')}</SinDatos>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="nivel" tickFormatter={(v: string) => t(v)} {...EJE} />
              <YAxis allowDecimals={false} {...EJE} />
              <Tooltip content={<ChartTooltip sufijo={t('personas')} />} cursor={CURSOR} />
              {/* Colores de estado (bueno/atención/grave), no de serie: acá el
                  color SÍ significa algo, y va reforzado por la etiqueta del eje. */}
              <Bar
                dataKey="total"
                name={t('Personas')}
                radius={[4, 4, 0, 0]}
                maxBarSize={64}
                cursor={clickable ? 'pointer' : undefined}
                onClick={(d: any) => { if (onSelect && d?.payload?.key) onSelect(d.payload.key); }}
              >
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
