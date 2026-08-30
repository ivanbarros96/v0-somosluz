'use client';

// Centro de notificaciones de la intranet — piloto para el perfil Secretaría.
//
// Junta en un solo lugar (la campana de arriba) lo que llega y espera atención:
// solicitudes de nuevos miembros y fechas propuestas en la agenda. Cada
// notificación lleva a la pantalla donde se resuelve, como en cualquier app
// moderna.
//
// "No leído" es por navegador (localStorage): se guarda la marca de tiempo de
// la última vez que se abrió la campana; todo lo más nuevo que eso cuenta como
// no leído. Es suficiente para un aviso — el estado real (pendiente/resuelto)
// vive en la base y lo maneja cada pantalla.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, UserPlus, CalendarDays, CheckCheck, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

type TipoNotif = 'miembro' | 'agenda';

interface Notif {
  id: string;
  tipo: TipoNotif;
  titulo: string;
  detalle: string;
  ts: string;          // ISO
  href: string;
}

const POLL_MS = 60_000;
const LS_KEY = 'sl_notif_seen_somosluz';

const ICONO: Record<TipoNotif, typeof UserPlus> = {
  miembro: UserPlus,
  agenda: CalendarDays,
};

function leerVisto(): number {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

function guardarVisto(ts: number) {
  try {
    localStorage.setItem(LS_KEY, String(ts));
  } catch {
    // Modo privado o storage bloqueado: el badge no persiste, no pasa nada.
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [visto, setVisto] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [rMiembros, rAgenda] = await Promise.all([
        fetch('/api/personas?soloPendientes=1', { cache: 'no-store' }),
        fetch('/api/agenda', { cache: 'no-store' }),
      ]);

      const items: Notif[] = [];

      if (rMiembros.ok) {
        const { personas } = await rMiembros.json();
        for (const p of personas ?? []) {
          items.push({
            id: `miembro-${p.id}`,
            tipo: 'miembro',
            titulo: 'Nueva solicitud de miembro',
            detalle: p.nombre ?? 'Sin nombre',
            ts: p.created_at ?? p.fecha_registro ?? new Date().toISOString(),
            href: '/intranet/dashboard/members',
          });
        }
      }

      if (rAgenda.ok) {
        const { eventos } = await rAgenda.json();
        for (const e of eventos ?? []) {
          if (e.estado !== 'propuesta') continue;
          items.push({
            id: `agenda-${e.id}`,
            tipo: 'agenda',
            titulo: 'Nueva fecha propuesta',
            detalle: `${e.titulo} · ${e.solicitante_nombre}`,
            ts: e.created_at ?? new Date().toISOString(),
            href: '/intranet/dashboard/agenda',
          });
        }
      }

      // Más nuevas primero.
      items.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
      setNotifs(items);
    } catch {
      // Silencioso: un fallo de red no debe romper la barra.
    }
  }, []);

  useEffect(() => {
    setVisto(leerVisto());
    cargar();
    timer.current = setInterval(cargar, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cargar]);

  const tsMs = (n: Notif) => {
    const t = Date.parse(n.ts);
    return Number.isNaN(t) ? 0 : t;
  };
  const noLeidas = notifs.filter((n) => tsMs(n) > visto).length;

  // Al abrir se marcan como vistas: la marca es el instante de apertura, así lo
  // que llegue después sigue contando como nuevo.
  function onOpenChange(v: boolean) {
    setAbierto(v);
    if (v && noLeidas > 0) {
      const ahora = Date.now();
      guardarVisto(ahora);
      // Se difiere para que el punto naranja no desaparezca antes de que el
      // ojo lo registre.
      setTimeout(() => setVisto(ahora), 1200);
    }
  }

  function marcarTodas() {
    const ahora = Date.now();
    guardarVisto(ahora);
    setVisto(ahora);
  }

  function irA(n: Notif) {
    setAbierto(false);
    router.push(n.href);
  }

  const cuando = (n: Notif) => {
    try {
      return formatDistanceToNow(parseISO(n.ts), { addSuffix: true, locale: es });
    } catch {
      return '';
    }
  };

  return (
    <Popover open={abierto} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
          className={cn(
            'relative inline-flex items-center justify-center h-11 w-11 rounded-full',
            'text-foreground/80 hover:text-foreground hover:bg-secondary',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <Bell className="h-5 w-5" />
          {noLeidas > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-[11px] font-semibold leading-none ring-2 ring-card"
            >
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[min(92vw,360px)] p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Notificaciones</span>
            {noLeidas > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-[11px] font-semibold leading-none">
                {noLeidas}
              </span>
            )}
          </div>
          {noLeidas > 0 && (
            <button
              type="button"
              onClick={marcarTodas}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar vistas
            </button>
          )}
        </div>

        {notifs.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Inbox className="h-9 w-9 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Estás al día</p>
            <p className="text-xs text-muted-foreground mt-0.5">No hay solicitudes esperando respuesta.</p>
          </div>
        ) : (
          <ul className="max-h-[min(60vh,420px)] overflow-y-auto divide-y divide-border">
            {notifs.map((n) => {
              const Icono = ICONO[n.tipo];
              const noLeida = tsMs(n) > visto;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => irA(n)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary',
                      'focus-visible:outline-none focus-visible:bg-secondary',
                      noLeida && 'bg-orange-500/[0.06]',
                    )}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icono className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{n.titulo}</span>
                        {noLeida && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" aria-label="sin leer" />}
                      </span>
                      <span className="block text-sm text-muted-foreground truncate">{n.detalle}</span>
                      <span className="block text-xs text-muted-foreground/80 mt-0.5">{cuando(n)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
