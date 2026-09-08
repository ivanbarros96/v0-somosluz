'use client';

// Selector Español / Português.
//
// Aparece SÓLO cuando hay algo que cambiar: en la pantalla de contraseña del
// Co-pastor y dentro de su panel. Para el resto de los perfiles no se muestra,
// porque un control que nunca se usa es ruido en pantalla.
//
// Es un par de botones y no un desplegable a propósito: con dos opciones, un
// desplegable esconde la mitad de la información y cuesta dos toques en vez de
// uno.

import { useIdioma, type Idioma } from '@/lib/idioma';
import { cn } from '@/lib/utils';

const OPCIONES: { valor: Idioma; corto: string; nombre: string }[] = [
  { valor: 'es', corto: 'ES', nombre: 'Español' },
  { valor: 'pt', corto: 'PT', nombre: 'Português' },
];

export function SelectorIdioma({ className }: { className?: string }) {
  const { idioma, setIdioma } = useIdioma();

  return (
    <div
      role="group"
      aria-label="Idioma / Idioma"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5',
        className,
      )}
    >
      {OPCIONES.map((o) => {
        const activo = idioma === o.valor;
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => setIdioma(o.valor)}
            aria-pressed={activo}
            // El nombre completo va en aria-label: en pantalla caben dos letras,
            // pero un lector de pantalla leyendo "PE TE" no dice nada.
            aria-label={o.nombre}
            title={o.nombre}
            className={cn(
              // 44px: es un control táctil y se usa desde el teléfono.
              'inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              activo
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {o.corto}
          </button>
        );
      })}
    </div>
  );
}
