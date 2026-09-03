'use client';

// Filtro de tipo de servicio para el panel del Pastor.
//
// Por qué chips y no un desplegable: son 6 opciones como máximo y el pastor
// necesita COMPARAR — pasar de "General" a "Youth" y volver. Con chips las
// opciones están a la vista y el cambio es un toque; un <select> esconde las
// alternativas y obliga a dos toques por cambio.
//
// Solo se listan los tipos que tienen al menos una reunión ya realizada: un
// chip que siempre muestra "sin datos" es una promesa rota.

import { CULTO_TIPOS, type CultoTipo } from '@/lib/cultos-tipos';

export interface OpcionServicio {
  tipo: CultoTipo;
  reuniones: number;
}

export function FiltroServicio({
  opciones,
  valor,
  onChange,
}: {
  opciones: OpcionServicio[];
  valor: CultoTipo;
  onChange: (t: CultoTipo) => void;
}) {
  if (opciones.length <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Filtrar por tipo de servicio"
      // -mx/px: el scroll horizontal en móvil no debe cortar el anillo de foco.
      className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1"
    >
      {opciones.map(({ tipo, reuniones }) => {
        const activo = tipo === valor;
        return (
          <button
            key={tipo}
            type="button"
            onClick={() => onChange(tipo)}
            aria-pressed={activo}
            className={`
              inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm
              transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
              focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${activo
                ? 'border-primary bg-primary font-semibold text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}
            `}
          >
            {CULTO_TIPOS[tipo].corto}
            {/* Sin opacidad: bajarla dejaba el contador del chip activo en
                3.57:1, bajo el mínimo AA de 4.5:1 para texto chico (medido en
                el navegador el 02/09/2026). */}
            <span
              className={`tabular-nums text-xs ${activo ? 'text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {reuniones}
            </span>
          </button>
        );
      })}
    </div>
  );
}
