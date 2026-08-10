'use client';

import type { ReactNode } from 'react';

// Piezas compartidas por todos los gráficos del panel del Pastor. Antes cada
// archivo repetía su propio tooltip y algunos traían colores escritos a mano
// (#6f814f), que en modo oscuro quedaban ilegibles. Acá está la única versión.

// Paleta de datos. Los tokens viven en globals.css y están validados con el
// script de la skill dataviz (daltonismo, contraste, chroma). El orden es FIJO:
// un mismo dato usa siempre el mismo color, sin importar cuántas series haya.
export const COLOR = {
  salvia: 'var(--chart-1)',
  petroleo: 'var(--chart-2)',
  terracota: 'var(--chart-3)',
  ciruela: 'var(--chart-4)',
  dorado: 'var(--chart-5)',
} as const;

// Estado (bueno/atención/grave). Reservados: nunca se usan como "serie 4".
export const ESTADO = {
  bueno: 'var(--chart-1)',
  atencion: 'var(--chart-5)',
  grave: 'var(--destructive)',
} as const;

// Ejes y grilla deliberadamente discretos: el dato manda, no el marco.
export const EJE = {
  tick: { fontSize: 11 },
  axisLine: false,
  tickLine: false,
  className: 'fill-muted-foreground',
} as const;

export const GRID = {
  strokeDasharray: '3 3',
  vertical: false,
  className: 'stroke-border',
} as const;

// El resaltado al pasar el mouse usa un token, no un negro fijo: así funciona
// igual en modo claro y oscuro.
export const CURSOR = { fill: 'var(--muted)', fillOpacity: 0.6, radius: 4 } as const;

interface FilaTooltip {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

/**
 * Tooltip único para todos los gráficos.
 * El texto va SIEMPRE en tinta normal; la identidad de la serie la lleva el
 * punto de color al lado. Colorear el texto con el color de la serie lo vuelve
 * ilegible cuando el color es claro.
 */
export function ChartTooltip({
  active, payload, label, formato, sufijo,
}: {
  active?: boolean;
  payload?: FilaTooltip[];
  label?: ReactNode;
  /** Formatea el valor (ej. moneda). Por defecto lo muestra tal cual. */
  formato?: (v: number) => string;
  /** Texto tras el valor cuando no hay `formato` (ej. "personas"). */
  sufijo?: string;
}) {
  if (!active || !payload?.length) return null;

  const mostrar = (v: FilaTooltip['value']) => {
    if (typeof v !== 'number') return String(v ?? '');
    return formato ? formato(v) : `${v}${sufijo ? ` ${sufijo}` : ''}`;
  };

  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-md">
      {label != null && <p className="text-muted-foreground mb-1">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={p.dataKey ?? i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ background: p.color }}
            />
            {p.name && <span className="text-muted-foreground">{p.name}</span>}
            <span className="ml-auto font-semibold tabular-nums text-foreground">
              {mostrar(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Estado vacío. Un gráfico sin datos no debe ser un rectángulo en blanco: hay
 * que decir por qué está vacío y qué falta para llenarlo.
 */
export function SinDatos({ icono, children }: { icono?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {icono && <div className="text-muted-foreground/60">{icono}</div>}
      <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

/**
 * Número protagonista. Para cuando la respuesta es UN dato y el gráfico solo
 * lo acompaña — leerlo no debería exigir interpretar barras.
 */
export function Titular({
  valor, unidad, pie, tono = 'normal',
}: {
  valor: string | number;
  unidad?: string;
  pie?: ReactNode;
  tono?: 'normal' | 'bueno' | 'atencion' | 'grave';
}) {
  const color =
    tono === 'bueno' ? 'text-primary'
    : tono === 'atencion' ? 'text-amber-600 dark:text-amber-500'
    : tono === 'grave' ? 'text-destructive'
    : 'text-foreground';

  return (
    <div>
      <p className={`text-3xl font-bold tabular-nums leading-none ${color}`}>
        {valor}
        {unidad && <span className="ml-0.5 text-xl font-semibold">{unidad}</span>}
      </p>
      {pie && <p className="mt-1.5 text-xs text-muted-foreground">{pie}</p>}
    </div>
  );
}
