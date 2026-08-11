'use client';

import { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SinDatos, Titular, COLOR, EJE, GRID } from './chart-kit';
import { ajustarLineal, proyectar, confiabilidad } from '@/lib/forecast';

export interface DomingoAsistencia {
  fecha: string; // ISO del domingo
  total: number; // asistentes ese domingo
}

const PASOS = 6; // domingos a proyectar (~mes y medio)
const DOMINGOS_POR_MES = 4.345;

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { timeZone: 'UTC', day: 'numeric', month: 'short' });

const CONFIA_TXT: Record<ReturnType<typeof confiabilidad>, string> = {
  buena: 'La tendencia es confiable con los datos actuales.',
  moderada: 'Tendencia con confianza moderada: tómala como orientación.',
  baja: 'Pocos datos aún: la proyección es apenas orientativa.',
};

const TooltipPron = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground mb-1">{label}{p?.esPronostico ? ' · proyección' : ''}</p>
      {p?.real != null && (
        <p className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: COLOR.salvia }} />
          <span className="text-muted-foreground">Asistieron</span>
          <span className="ml-auto font-semibold tabular-nums text-foreground">{p.real}</span>
        </p>
      )}
      {p?.esPronostico && (
        <>
          <p className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: COLOR.petroleo }} />
            <span className="text-muted-foreground">Estimado</span>
            <span className="ml-auto font-semibold tabular-nums text-foreground">{p.tendencia}</span>
          </p>
          {p.banda && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Entre {p.banda[0]} y {p.banda[1]}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export function AsistenciaPronosticoChart({ data }: { data: DomingoAsistencia[] }) {
  const modelo = useMemo(() => {
    const y = data.map((d) => d.total);
    const reg = ajustarLineal(y);
    if (!reg) return null;
    const proy = proyectar(reg, PASOS);

    // Fechas de los próximos domingos, +7 días desde el último real.
    const ultima = new Date(data[data.length - 1].fecha);
    const futuras = proy.map((p) => {
      const d = new Date(ultima);
      d.setUTCDate(d.getUTCDate() + 7 * p.paso);
      return d.toISOString();
    });

    const puntos = [
      ...data.map((d, i) => ({
        label: fmtFecha(d.fecha),
        real: d.total,
        tendencia: Math.max(0, Math.round(reg.intercepto + reg.pendiente * i)),
        banda: null as [number, number] | null,
        esPronostico: false,
      })),
      ...proy.map((p, k) => ({
        label: fmtFecha(futuras[k]),
        real: null as number | null,
        tendencia: p.valor,
        banda: [p.bajo, p.alto] as [number, number],
        esPronostico: true,
      })),
    ];

    return { reg, proy, puntos, confia: confiabilidad(reg) };
  }, [data]);

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Tendencia y pronóstico de asistencia</CardTitle>
        <p className="text-xs text-muted-foreground">
          Asistencia dominical y proyección de las próximas semanas al ritmo actual
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {!modelo ? (
          <SinDatos>
            Se necesitan al menos 3 domingos con asistencia para estimar una tendencia.
          </SinDatos>
        ) : (
          <>
            {(() => {
              const porMes = Math.round(modelo.reg.pendiente * DOMINGOS_POR_MES);
              const tono = porMes > 0 ? 'bueno' : porMes < 0 ? 'grave' : 'normal';
              const Icono = porMes > 0 ? TrendingUp : porMes < 0 ? TrendingDown : Minus;
              const prox = modelo.proy[0];
              return (
                <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                  <Titular
                    valor={`${porMes > 0 ? '+' : ''}${porMes}`}
                    unidad="/mes"
                    tono={tono as 'bueno' | 'grave' | 'normal'}
                    pie={
                      <span className="inline-flex items-center gap-1">
                        <Icono className="h-3.5 w-3.5" aria-hidden />
                        {porMes > 0 ? 'creciendo' : porMes < 0 ? 'a la baja' : 'estable'} · promedio
                        por domingo
                      </span>
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Próximo domingo:{' '}
                    <span className="font-semibold tabular-nums text-foreground">
                      ~{prox.valor}
                    </span>{' '}
                    <span className="text-muted-foreground">({prox.bajo}–{prox.alto})</span>
                  </p>
                </div>
              );
            })()}

            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={modelo.puntos} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="label" {...EJE} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} {...EJE} />
                <Tooltip content={<TooltipPron />} />
                {/* Banda de confianza del pronóstico: se ensancha con la distancia */}
                <Area
                  dataKey="banda"
                  stroke="none"
                  fill={COLOR.petroleo}
                  fillOpacity={0.12}
                  connectNulls
                  isAnimationActive={false}
                />
                {/* Tendencia + proyección central (punteada) */}
                <Line
                  dataKey="tendencia"
                  stroke={COLOR.petroleo}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
                {/* Asistencia real (solo histórico) */}
                <Line
                  dataKey="real"
                  stroke={COLOR.salvia}
                  strokeWidth={2}
                  dot={{ fill: COLOR.salvia, r: 3, strokeWidth: 0 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>

            <p className="mt-3 text-xs text-muted-foreground">
              {CONFIA_TXT[modelo.confia]} La estacionalidad (verano, fiestas) necesita más de un
              año de datos; por eso solo se proyectan las próximas semanas y el pronóstico se
              recalcula cada domingo.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
