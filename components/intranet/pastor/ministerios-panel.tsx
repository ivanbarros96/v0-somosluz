'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartHandshake } from 'lucide-react';

export interface MinisterioStat {
  tipo: string;
  label: string;
  publico: string;
  reuniones: number; // reuniones realizadas registradas
  promedio: number; // asistentes promedio por reunión
  elegibles: number; // miembros que califican como público
  participacion: number | null; // % promedio/elegibles (null si sin datos)
  ultimaFecha: string | null;
}

const COLOR: Record<string, string> = {
  hombres: '#6f814f',
  mujeres: '#b08072',
  discipulado: '#8a6d55',
  youth: '#c08a3e',
};

export function MinisteriosPanel({ data }: { data: MinisterioStat[] }) {
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-primary" />
          Vida de Ministerios
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Participación promedio: asistentes por reunión ÷ miembros del público de cada ministerio
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 space-y-5">
        {data.map((m) => {
          const color = COLOR[m.tipo] ?? '#6f814f';
          const pct = m.participacion;
          return (
            <div key={m.tipo}>
              <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.publico}</p>
                </div>
                {m.reuniones > 0 ? (
                  <p className="text-sm tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{m.promedio}</span> asist. prom.
                    {' '}· {m.elegibles} del público
                    {pct !== null && (
                      <span className="font-semibold ml-1" style={{ color }}>
                        · {pct}%
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin reuniones registradas aún</p>
                )}
              </div>
              <div
                className="h-2 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={pct ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Participación de ${m.label}`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.min(pct ?? 0, 100)}%`, backgroundColor: color }}
                />
              </div>
              {m.reuniones > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                  {m.reuniones} {m.reuniones === 1 ? 'reunión registrada' : 'reuniones registradas'}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
