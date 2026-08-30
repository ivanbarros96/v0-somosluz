'use client';

// Centro de notificaciones de la intranet, adaptado a cada perfil.
//
// La idea clave: cada rol ve lo que le importa, no una lista genérica.
//   · Secretaría → solicitudes de miembro y fechas propuestas.
//   · Oración    → peticiones sin atender.
//   · Pastor     → aprobaciones pendientes + KPIs del mes (cómo va la iglesia).
//   · Co-pastor  → fechas propuestas (las confirma).
//   Los ministerios y Kids casi no generan eventos: no llevan campana por ahora.
//
// "No leído" es por navegador (localStorage, una marca por rol): se guarda la
// última vez que se abrió la campana; lo más nuevo cuenta como sin leer. El
// estado real (pendiente/resuelto) vive en la base y lo maneja cada pantalla.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bell, UserPlus, CalendarDays, HandHeart, TrendingUp, CheckCheck, Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { puedeAutorizarFichas, puedeAutorizarAgenda, puedeVerOracion } from '@/lib/roles';

type TipoNotif = 'miembro' | 'agenda' | 'oracion' | 'kpi';

interface Notif {
  id: string;
  tipo: TipoNotif;
  titulo: string;
  detalle: string;
  ts: string;          // ISO
  href: string;
}

const POLL_MS = 60_000;

const ICONO: Record<TipoNotif, typeof UserPlus> = {
  miembro: UserPlus,
  agenda: CalendarDays,
  oracion: HandHeart,
  kpi: TrendingUp,
};

// Roles que llevan campana. Los ministerios de reunión y Kids no generan
// eventos que atender, así que se quedan sin ella por ahora.
export function tieneCampana(role: string): boolean {
  return puedeAutorizarFichas(role) || puedeAutorizarAgenda(role) || puedeVerOracion(role);
}

function leerVisto(role: string): number {
  try {
    const v = localStorage.getItem(`sl_notif_seen_${role}`);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}
function guardarVisto(role: string, ts: number) {
  try {
    localStorage.setItem(`sl_notif_seen_${role}`, String(ts));
  } catch {
    // Storage bloqueado (modo privado): el badge no persiste, no pasa nada.
  }
}

const MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// ── Constructores de notificaciones por fuente ──────────────────────────────

async function cargarMiembros(items: Notif[]) {
  const r = await fetch('/api/personas?soloPendientes=1', { cache: 'no-store' });
  if (!r.ok) return;
  const { personas } = await r.json();
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

async function cargarAgenda(items: Notif[]) {
  const r = await fetch('/api/agenda', { cache: 'no-store' });
  if (!r.ok) return;
  const { eventos } = await r.json();
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

async function cargarOracion(items: Notif[]) {
  const r = await fetch('/api/oracion', { cache: 'no-store' });
  if (!r.ok) return;
  const { peticiones } = await r.json();
  for (const p of peticiones ?? []) {
    if (p.estado !== 'pendiente') continue;
    items.push({
      id: `oracion-${p.id}`,
      tipo: 'oracion',
      titulo: 'Nueva petición de oración',
      detalle: p.nombre ?? 'Anónimo',
      ts: p.created_at ?? new Date().toISOString(),
      href: '/intranet/dashboard/oracion',
    });
  }
}

// KPI del Pastor: cuántos miembros nuevos se sumaron este mes. Es la clase de
// aviso que le sirve a él — cómo va la iglesia, no una tarea por hacer. Se
// compara con el mes pasado para dar contexto (subió/bajó).
async function cargarKpiPastor(items: Notif[]) {
  const r = await fetch('/api/personas', { cache: 'no-store' });
  if (!r.ok) return;
  const { personas } = await r.json();
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = ahora.getMonth();
  const inicioMes = new Date(y, m, 1).getTime();
  const inicioMesPasado = new Date(y, m - 1, 1).getTime();

  let esteMes = 0;
  let mesPasado = 0;
  for (const p of personas ?? []) {
    const t = Date.parse(p.created_at ?? p.fecha_registro ?? '');
    if (Number.isNaN(t)) continue;
    if (t >= inicioMes) esteMes++;
    else if (t >= inicioMesPasado) mesPasado++;
  }

  if (esteMes === 0) return; // Sin altas este mes no hay nada que celebrar aún.

  const dif = esteMes - mesPasado;
  const comparativa =
    mesPasado === 0
      ? 'el primer mes con registro nuevo en un tiempo'
      : dif > 0
        ? `${dif} más que en ${MES[(m + 11) % 12]}`
        : dif < 0
          ? `${Math.abs(dif)} menos que en ${MES[(m + 11) % 12]}`
          : `igual que en ${MES[(m + 11) % 12]}`;

  items.push({
    id: `kpi-nuevos-${y}-${m}`,
    tipo: 'kpi',
    titulo: `Este mes: +${esteMes} ${esteMes === 1 ? 'miembro nuevo' : 'miembros nuevos'}`,
    detalle: comparativa,
    // Un insight del mes: se fecha al inicio del mes, así cuenta como "nuevo"
    // una vez por mes hasta que el pastor lo ve.
    ts: new Date(inicioMes).toISOString(),
    href: '/intranet/dashboard',
  });
}

async function construir(role: string): Promise<Notif[]> {
  const items: Notif[] = [];
  const jobs: Promise<void>[] = [];

  if (puedeAutorizarFichas(role)) jobs.push(cargarMiembros(items).catch(() => {}));
  if (puedeAutorizarAgenda(role)) jobs.push(cargarAgenda(items).catch(() => {}));
  if (puedeVerOracion(role)) jobs.push(cargarOracion(items).catch(() => {}));
  if (role === 'pastor') jobs.push(cargarKpiPastor(items).catch(() => {}));

  await Promise.all(jobs);
  items.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return items;
}

// ── Componente ──────────────────────────────────────────────────────────────

export function NotificationBell({ role }: { role: string }) {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [visto, setVisto] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    try {
      setNotifs(await construir(role));
    } catch {
      // Silencioso: un fallo de red no debe romper la barra.
    }
  }, [role]);

  useEffect(() => {
    setVisto(leerVisto(role));
    cargar();
    timer.current = setInterval(cargar, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cargar, role]);

  const tsMs = (n: Notif) => {
    const t = Date.parse(n.ts);
    return Number.isNaN(t) ? 0 : t;
  };
  const noLeidas = notifs.filter((n) => tsMs(n) > visto).length;

  function onOpenChange(v: boolean) {
    setAbierto(v);
    if (v && noLeidas > 0) {
      const ahora = Date.now();
      guardarVisto(role, ahora);
      setTimeout(() => setVisto(ahora), 1200);
    }
  }

  function marcarTodas() {
    const ahora = Date.now();
    guardarVisto(role, ahora);
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

      <PopoverContent align="end" sideOffset={8} className="w-[min(92vw,380px)] p-0 overflow-hidden">
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
            <p className="text-xs text-muted-foreground mt-0.5">No hay nada nuevo por ahora.</p>
          </div>
        ) : (
          <ul className="max-h-[min(60vh,440px)] overflow-y-auto divide-y divide-border">
            {notifs.map((n) => {
              const Icono = ICONO[n.tipo];
              const noLeida = tsMs(n) > visto;
              const esKpi = n.tipo === 'kpi';
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
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        esKpi ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                      )}
                    >
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
