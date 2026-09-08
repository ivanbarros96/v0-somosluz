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
//
// Con BANDERAS (pedido de Iván, 08/09/2026), y en SVG propio — nunca emoji.
// Windows no trae glifos de bandera y Chrome degrada 🇧🇷 a dos letras
// diminutas; ya costó una corrección en el selector de país del registro
// (ver components/ui/flag-icon).
//
// Chile para el español y Brasil para el portugués: la iglesia está en
// Valparaíso y Aloísio es brasileño. Es lo que cada uno reconoce como propio.
//
// ⚠️ Una bandera es un país, no un idioma: quien no reconozca las dos se queda
// sin saber cuál es cuál. Por eso el nombre del idioma sigue estando en el
// `aria-label` y en el `title` — al pasar el mouse y para un lector de
// pantalla, sí dice "Español" y "Português".

import { useIdioma, type Idioma } from '@/lib/idioma';
import { FlagIcon } from '@/components/ui/flag-icon';
import { cn } from '@/lib/utils';

const OPCIONES: { valor: Idioma; iso: 'CL' | 'BR'; nombre: string }[] = [
  { valor: 'es', iso: 'CL', nombre: 'Español' },
  { valor: 'pt', iso: 'BR', nombre: 'Português' },
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
            // El nombre del idioma vive acá: la bandera sola no lo dice.
            aria-label={o.nombre}
            title={o.nombre}
            className={cn(
              // 44px: es un control táctil y se usa desde el teléfono.
              'inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              // El activo se marca con ANILLO, no rellenando de salvia: la
              // bandera de Brasil es verde y sobre el salvia se perdía el
              // contorno — quedaba un círculo verde dentro de otro verde.
              // Un anillo no compite con ningún color de bandera.
              activo
                ? 'bg-background ring-2 ring-primary'
                : 'hover:bg-secondary',
            )}
          >
            <FlagIcon
              iso={o.iso}
              className={cn(
                // El filete oscuro define el borde de la bandera pase lo que
                // pase detrás: sin él, el blanco de Chile se fundía con el
                // fondo claro y la bandera parecía media bandera.
                'h-4 w-6 rounded-[2px] ring-1 ring-black/20 transition-opacity',
                // La no elegida se atenúa. El estado no depende de un solo
                // indicador: anillo + opacidad + aria-pressed.
                activo ? 'opacity-100' : 'opacity-50',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
