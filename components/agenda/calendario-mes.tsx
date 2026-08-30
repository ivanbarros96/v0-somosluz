'use client';

// Calendario mensual de la agenda. Lo usan las DOS pantallas —la pública, sin
// login, y la del panel— para que el calendario sea el mismo objeto en los dos
// lados y no se separen con el tiempo.
//
// Todas las fechas viajan como 'YYYY-MM-DD' y se comparan como texto. No se
// convierte nada a Date para mostrar: `new Date('2026-09-12')` se interpreta
// como medianoche UTC y en Chile (UTC-4) se dibuja el día anterior. Ese error
// ya nos pasó en la vista de cumpleaños.

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CULTO_TIPO_KEYS, type CultoTipo } from '@/lib/cultos-tipos';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, Clock, CalendarOff } from 'lucide-react';

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
//
// Martes y miércoles van con dos letras: con una sola aparecían dos columnas
// "M" seguidas y no se distinguían. El nombre completo va en el title/aria para
// quien use lector de pantalla.
const DIAS = [
  { corto: 'L', largo: 'lunes' },
  { corto: 'Ma', largo: 'martes' },
  { corto: 'Mi', largo: 'miércoles' },
  { corto: 'J', largo: 'jueves' },
  { corto: 'V', largo: 'viernes' },
  { corto: 'S', largo: 'sábado' },
  { corto: 'D', largo: 'domingo' },
];

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

// Estilo del chip de cada evento.
//
// El TEXTO va en color de primer plano, no en el color del estado: el título en
// salvia sobre crema daba 3.57:1, bajo el mínimo de 4.5:1 que pide WCAG — y a
// 10px eso se nota. El estado se comunica con el fondo y el borde, que no
// necesitan pasar contraste de texto.
//
// Y no se distingue SÓLO por color: la propuesta va con borde punteado, así se
// sigue leyendo sin necesidad de distinguir colores.
const CHIP: Record<EstadoEvento, string> = {
  confirmada: 'bg-primary/15 text-foreground border-primary/40',
  propuesta: 'bg-orange-500/10 text-foreground border-orange-500/60 border-dashed',
  rechazada: 'bg-muted text-muted-foreground border-border line-through',
};

const PUNTO: Record<EstadoEvento, string> = {
  confirmada: 'bg-primary',
  propuesta: 'bg-orange-500',
  rechazada: 'bg-muted-foreground/40',
};

export function CalendarioMes({
  mes,
  eventos,
  onCambiarMes,
}: {
  mes: string;                                  // 'YYYY-MM'
  eventos: EventoCalendario[];
  onCambiarMes: (mesNuevo: string) => void;
}) {
  const hoy = hoyEnChile();
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);

  // Al cambiar de mes se cierra el detalle: quedaba abierto mostrando un día
  // que ya no está a la vista.
  useEffect(() => { setDiaAbierto(null); }, [mes]);

  // Eventos indexados por día, para no recorrer la lista en cada celda.
  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();
    for (const e of eventos) {
      if (!mapa.has(e.fecha)) mapa.set(e.fecha, []);
      mapa.get(e.fecha)!.push(e);
    }
    return mapa;
  }, [eventos]);

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

  const delMes = useMemo(
    () => eventos.filter((e) => e.fecha.startsWith(mes)),
    [eventos, mes],
  );

  const eventosDelDia = diaAbierto ? (porDia.get(diaAbierto) ?? []) : [];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-2 sm:px-3 py-2.5 border-b border-border">
        <Button
          variant="ghost" size="icon"
          onClick={() => onCambiarMes(correrMes(mes, -1))}
          aria-label="Mes anterior"
          className="h-11 w-11 shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-center min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
            {tituloMes(mes)}
          </h2>
          {/* Cuántos eventos hay en el mes que se está viendo: sin esto había
              que barrer la cuadrícula con la vista para saber si valía la pena
              mirarla. */}
          <p className="text-[11px] text-muted-foreground">
            {delMes.length === 0
              ? 'Sin eventos'
              : `${delMes.length} ${delMes.length === 1 ? 'evento' : 'eventos'}`}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Volver a hoy: navegando meses es fácil perderse y no había camino
              de vuelta. Sólo aparece cuando hace falta. */}
          {mes !== mesDeHoy() && (
            <Button
              variant="ghost" size="sm"
              onClick={() => onCambiarMes(mesDeHoy())}
              className="h-11 px-2 text-xs"
            >
              Hoy
            </Button>
          )}
          <Button
            variant="ghost" size="icon"
            onClick={() => onCambiarMes(correrMes(mes, 1))}
            aria-label="Mes siguiente"
            className="h-11 w-11"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {DIAS.map((d) => (
          <div
            key={d.largo}
            title={d.largo}
            className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <span aria-hidden="true">{d.corto}</span>
            <span className="sr-only">{d.largo}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {celdas.map((dia, i) => {
          if (!dia) {
            return (
              <div
                key={`hueco-${i}`}
                className="min-h-14 sm:min-h-24 border-b border-r border-border/60 bg-muted/20"
              />
            );
          }

          const delDia = porDia.get(dia) ?? [];
          const esHoy = dia === hoy;
          const abierto = dia === diaAbierto;
          const numero = Number(dia.slice(-2));
          const tiene = delDia.length > 0;

          // Sólo los días CON eventos son interactivos: así el recorrido con
          // teclado pasa por lo que importa en vez de por 30 celdas vacías.
          const Celda = tiene ? 'button' : 'div';

          return (
            <Celda
              key={dia}
              {...(tiene
                ? {
                    type: 'button' as const,
                    onClick: () => setDiaAbierto(abierto ? null : dia),
                    'aria-expanded': abierto,
                    'aria-label': `${fechaLegible(dia)}, ${delDia.length} ${delDia.length === 1 ? 'evento' : 'eventos'}`,
                  }
                : { 'aria-hidden': false })}
              className={cn(
                'min-h-14 sm:min-h-24 border-b border-r border-border/60 p-1 sm:p-1.5 space-y-1 text-left w-full',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                esHoy && 'bg-primary/5',
                // El día elegido se marca con un aro, NO rellenando la celda de
                // color oscuro: ese relleno quedaba debajo de los chips y les
                // arruinaba la legibilidad. El aro señala igual de claro y deja
                // el contenido sobre su fondo claro de siempre.
                abierto && 'bg-primary/10 ring-2 ring-inset ring-primary',
                tiene && 'cursor-pointer transition-colors hover:bg-accent/40',
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
                  el día con un punto y al tocarlo se abre el detalle abajo. */}
              <div className="sm:hidden flex flex-wrap gap-0.5" aria-hidden="true">
                {delDia.slice(0, 4).map((e) => (
                  <span
                    key={e.id}
                    className={cn('h-1.5 w-1.5 rounded-full', PUNTO[e.estado ?? 'confirmada'])}
                  />
                ))}
              </div>

              <div className="hidden sm:block space-y-1" aria-hidden="true">
                {delDia.slice(0, 2).map((e) => {
                  const hora = soloHora(e.hora);
                  return (
                    <div
                      key={e.id}
                      className={cn(
                        'truncate rounded border px-1 py-0.5 text-[10px] leading-tight',
                        CHIP[e.estado ?? 'confirmada'],
                      )}
                    >
                      {hora && <span className="tabular-nums opacity-70">{hora} </span>}
                      {e.titulo}
                    </div>
                  );
                })}
                {delDia.length > 2 && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    +{delDia.length - 2} más
                  </p>
                )}
              </div>
            </Celda>
          );
        })}
      </div>

      {/* Detalle del día elegido. Va acá abajo y no en un globo flotante: en el
          celular un globo sobre una cuadrícula de 7 columnas queda ilegible. */}
      {diaAbierto && (
        <div className="border-t border-border bg-muted/30">
          <div className="flex items-center justify-between gap-2 px-4 pt-3">
            <h3 className="text-sm font-semibold text-foreground">
              {fechaLegible(diaAbierto, true)}
            </h3>
            <Button
              variant="ghost" size="icon"
              onClick={() => setDiaAbierto(null)}
              aria-label="Cerrar el detalle del día"
              className="h-9 w-9"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ul className="px-4 pb-3 pt-1 space-y-2">
            {eventosDelDia.map((e) => {
              const hora = soloHora(e.hora);
              const min = etiquetaMinisterio(e.ministerio);
              const estado = e.estado ?? 'confirmada';
              return (
                <li key={e.id} className="flex items-start gap-2">
                  <span
                    className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', PUNTO[estado])}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      {e.titulo}
                      {estado === 'propuesta' && (
                        <span className="ml-1.5 text-[11px] font-medium text-orange-600 dark:text-orange-400">
                          · por confirmar
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      {hora && (
                        <>
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="tabular-nums">{hora} hrs</span>
                        </>
                      )}
                      {min && <>{hora && <span aria-hidden>·</span>}{min}</>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Mes vacío: en vez de dejar una cuadrícula muda, se dice qué pasa. */}
      {delMes.length === 0 && !diaAbierto && (
        <div className="border-t border-border px-4 py-5 text-center">
          <CalendarOff className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground">
            No hay nada agendado en {tituloMes(mes).toLowerCase()}.
          </p>
        </div>
      )}
    </div>
  );
}
