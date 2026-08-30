'use client';

// Calendario mensual de la agenda. Lo usan las DOS pantallas —la pública, sin
// login, y la del panel— para que el calendario sea el mismo objeto en los dos
// lados y no se separen con el tiempo.
//
// Todas las fechas viajan como 'YYYY-MM-DD' y se comparan como texto. No se
// convierte nada a Date para mostrar: `new Date('2026-09-12')` se interpreta
// como medianoche UTC y en Chile (UTC-4) se dibuja el día anterior. Ese error
// ya nos pasó en la vista de cumpleaños.

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CULTO_TIPO_KEYS, type CultoTipo } from '@/lib/cultos-tipos';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type EstadoEvento = 'propuesta' | 'confirmada' | 'rechazada';

export interface EventoCalendario {
  id: number;
  titulo: string;
  fecha: string;           // 'YYYY-MM-DD'
  hora: string | null;     // 'HH:MM:SS'
  ministerio: string | null;
  estado?: EstadoEvento;   // ausente en la vista pública: todo es confirmado
}

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Empieza en lunes, como se lee un calendario en Chile.
const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Hoy en Chile, como 'YYYY-MM-DD'. */
export function hoyEnChile(): string {
  // 'en-CA' entrega justo el formato YYYY-MM-DD, y se pide en la zona de Chile
  // en vez de usar toISOString(), que da la fecha UTC.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

/** '2026-09-12' → '12 de septiembre'. Se parte el texto, no se usa Date. */
export function fechaLegible(iso: string, conAnio = false): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  if (!anio || !mes || !dia) return iso;
  return `${dia} de ${MESES[mes - 1] ?? ''}${conAnio ? ` de ${anio}` : ''}`;
}

export const soloHora = (h: string | null) => (h ? h.slice(0, 5) : null);

// Nombres cortos, SOLO para la agenda. `CULTO_TIPOS[t].label` ("Viernes de
// Discipulado", "Generación Youth") es el nombre largo que usan Asistencia,
// Miembros y Cumpleaños — no se toca, para no cambiarlo también ahí. Acá, en
// un chip de calendario y en un desplegable angosto, el nombre corto se lee
// mejor y es el mismo que ya usa el login (ver `corto` en intranet/page.tsx).
export const MINISTERIOS_AGENDA: Record<CultoTipo, string> = {
  general: 'General',
  hombres: 'Hombría',
  mujeres: 'Amadas',
  discipulado: 'Discipulado',
  youth: 'Youth',
  kids: 'Kids',
};

export const MINISTERIO_AGENDA_KEYS = CULTO_TIPO_KEYS;

export function etiquetaMinisterio(m: string | null): string | null {
  if (!m) return null;
  return m in MINISTERIOS_AGENDA ? MINISTERIOS_AGENDA[m as CultoTipo] : m;
}

/** 'YYYY-MM' del mes actual en Chile. */
export function mesDeHoy(): string {
  return hoyEnChile().slice(0, 7);
}

export function tituloMes(mesISO: string): string {
  const [anio, mes] = mesISO.split('-').map(Number);
  const nombre = MESES[mes - 1] ?? '';
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** Corre el mes 'YYYY-MM' hacia adelante o atrás sin pasar por Date. */
export function correrMes(mesISO: string, delta: number): string {
  const [anio, mes] = mesISO.split('-').map(Number);
  const total = anio * 12 + (mes - 1) + delta;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = (total % 12) + 1;
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}`;
}

// Estilo del chip de cada evento. La propuesta se ve claramente distinta de lo
// confirmado: es la diferencia entre "esto va a pasar" y "esto todavía no".
const CHIP: Record<EstadoEvento, string> = {
  confirmada: 'bg-primary/15 text-primary border-primary/30',
  propuesta: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/40 border-dashed',
  rechazada: 'bg-muted text-muted-foreground border-border line-through',
};

export function CalendarioMes({
  mes,
  eventos,
  onCambiarMes,
  onElegirEvento,
}: {
  mes: string;                                  // 'YYYY-MM'
  eventos: EventoCalendario[];
  onCambiarMes: (mesNuevo: string) => void;
  onElegirEvento?: (e: EventoCalendario) => void;
}) {
  const hoy = hoyEnChile();

  // Celdas de la cuadrícula: los huecos del principio van como null.
  const celdas = useMemo(() => {
    const [anio, mesNum] = mes.split('-').map(Number);

    // Date con argumentos separados es hora LOCAL, no UTC: acá sí es seguro.
    // Sólo se usa para contar días y saber en qué día de la semana cae el 1.
    const primero = new Date(anio, mesNum - 1, 1);
    const diasEnMes = new Date(anio, mesNum, 0).getDate();

    // getDay() devuelve 0=domingo; se corre para que 0=lunes.
    const offset = (primero.getDay() + 6) % 7;

    const salida: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= diasEnMes; d++) {
      salida.push(`${mes}-${String(d).padStart(2, '0')}`);
    }
    return salida;
  }, [mes]);

  // Eventos indexados por día, para no recorrer la lista en cada celda.
  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();
    for (const e of eventos) {
      if (!mapa.has(e.fecha)) mapa.set(e.fecha, []);
      mapa.get(e.fecha)!.push(e);
    }
    return mapa;
  }, [eventos]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-border">
        <Button
          variant="ghost" size="icon"
          onClick={() => onCambiarMes(correrMes(mes, -1))}
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm sm:text-base font-semibold text-foreground">{tituloMes(mes)}</h2>
        <Button
          variant="ghost" size="icon"
          onClick={() => onCambiarMes(correrMes(mes, 1))}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {DIAS_CORTOS.map((d, i) => (
          <div
            key={i}
            className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {celdas.map((dia, i) => {
          if (!dia) {
            return <div key={`hueco-${i}`} className="min-h-16 sm:min-h-24 border-b border-r border-border/60 bg-muted/20" />;
          }
          const delDia = porDia.get(dia) ?? [];
          const esHoy = dia === hoy;
          const numero = Number(dia.slice(-2));

          return (
            <div
              key={dia}
              className={cn(
                'min-h-16 sm:min-h-24 border-b border-r border-border/60 p-1 sm:p-1.5 space-y-1',
                esHoy && 'bg-primary/5',
              )}
            >
              <div
                className={cn(
                  'text-[11px] sm:text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full',
                  esHoy ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                {numero}
              </div>

              {/* En el celular la cuadrícula no da para leer títulos: se marca
                  el día con un punto y el detalle se lee en la lista de abajo,
                  que ahí es la vista principal. */}
              <div className="sm:hidden flex flex-wrap gap-0.5">
                {delDia.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      (e.estado ?? 'confirmada') === 'propuesta' ? 'bg-orange-500' : 'bg-primary',
                    )}
                  />
                ))}
              </div>

              <div className="hidden sm:block space-y-1">
                {delDia.slice(0, 3).map((e) => {
                  const estado = e.estado ?? 'confirmada';
                  const hora = soloHora(e.hora);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onElegirEvento?.(e)}
                      title={`${e.titulo}${hora ? ` · ${hora}` : ''}`}
                      className={cn(
                        'w-full text-left truncate rounded border px-1 py-0.5 text-[10px] leading-tight',
                        CHIP[estado],
                        onElegirEvento && 'hover:opacity-80 cursor-pointer',
                      )}
                    >
                      {hora && <span className="tabular-nums opacity-70">{hora} </span>}
                      {e.titulo}
                    </button>
                  );
                })}
                {delDia.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    +{delDia.length - 3} más
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
