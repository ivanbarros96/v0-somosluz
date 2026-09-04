'use client';

// Centro de notificaciones de la intranet, adaptado a cada perfil.
//
// La idea clave: cada rol ve lo que le importa, no una lista genérica.
//   · Secretaría → solicitudes de miembro y fechas propuestas.
//   · Oración    → peticiones sin atender.
//   · Pastor     → aprobaciones pendientes + KPIs del mes (cómo va la iglesia).
//   · Co-pastor  → fechas propuestas (las confirma).
//   · Quien abra cultos → advertencia si dejó uno sin cerrar (ministerios
//     incluidos: por esto llevan campana desde el 03/09/2026).
//
// "No leído" es por navegador (localStorage, una marca por rol): se guarda la
// última vez que se abrió la campana; lo más nuevo cuenta como sin leer. El
// estado real (pendiente/resuelto) vive en la base y lo maneja cada pantalla.
//
// EXCEPCIÓN: las advertencias no se pueden "marcar como vistas". Siguen ahí
// mientras el problema exista, porque la única forma de resolverlas es arreglar
// la causa (cerrar el culto). Una advertencia que se puede silenciar sin
// arreglar nada no sirve de nada.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bell, UserPlus, CalendarDays, HandHeart, TrendingUp, CheckCheck, Inbox, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  puedeAutorizarFichas, puedeAutorizarAgenda, puedeVerOracion, abreCultos, ministerioDeRol,
} from '@/lib/roles';
import { CULTO_TIPOS } from '@/lib/cultos-tipos';
import { cultosSinCerrar, tiempoAbierto, inicioDelDia, HORAS_LIMITE } from '@/lib/cultos-abiertos';
import { leerVisto, guardarVisto, alCambiarVisto } from '@/lib/notif-visto';

type TipoNotif = 'miembro' | 'agenda' | 'oracion' | 'kpi' | 'culto';

interface Notif {
  id: string;
  tipo: TipoNotif;
  titulo: string;
  detalle: string;
  ts: string;          // ISO
  href: string;
  /** Advertencia: se pinta en ámbar, va arriba y no se puede silenciar. */
  advertencia?: boolean;
}

const POLL_MS = 60_000;

const ICONO: Record<TipoNotif, typeof UserPlus> = {
  miembro: UserPlus,
  agenda: CalendarDays,
  oracion: HandHeart,
  kpi: TrendingUp,
  culto: AlertTriangle,
};

// Roles que llevan campana.
export function tieneCampana(role: string): boolean {
  return (
    puedeAutorizarFichas(role) ||
    puedeAutorizarAgenda(role) ||
    puedeVerOracion(role) ||
    // Los ministerios de reunión entran por acá: es su único aviso, pero es el
    // que más importa — si nadie cierra su reunión, sus propias cifras mienten.
    abreCultos(role)
  );
}

// La marca de "visto" es compartida con el menú (lib/notif-visto).

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

// Advertencia: un culto que lleva más de 48 h abierto. Mientras siga así, la
// asistencia de esa reunión está incompleta y todo lo que se calcula con ella
// —promedios, tendencias, el "cómo nos fue la última vez"— sale mal sin que
// nadie se entere. Cada quien ve solo los cultos que puede cerrar.
async function cargarCultosSinCerrar(items: Notif[], role: string) {
  const r = await fetch('/api/cultos', { cache: 'no-store' });
  if (!r.ok) return;
  const { cultos } = await r.json();

  for (const c of cultosSinCerrar(cultos ?? [], ministerioDeRol(role))) {
    const nombre = CULTO_TIPOS[c.tipo]?.label ?? 'Culto';
    const dia = new Date(c.fecha).toLocaleDateString('es-CL', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
    });
    items.push({
      id: `culto-${c.id}`,
      tipo: 'culto',
      titulo: 'Hay un culto sin cerrar',
      detalle: `${nombre} del ${dia} · lleva ${tiempoAbierto(c.horas)} abierto`,
      // La fecha del aviso es cuando CUMPLIÓ las 48 h, no la del culto. Con la
      // del culto (vieja) el aviso nacía "ya leído" y el contador nunca se
      // encendía. Así se enciende al aparecer y se apaga al abrir la campana.
      ts: new Date(inicioDelDia(c.fecha) + HORAS_LIMITE * 3_600_000).toISOString(),
      href: '/intranet/dashboard/asistencia',
      advertencia: true,
    });
  }
}

async function construir(role: string): Promise<Notif[]> {
  const items: Notif[] = [];
  const jobs: Promise<void>[] = [];

  if (puedeAutorizarFichas(role)) jobs.push(cargarMiembros(items).catch(() => {}));
  if (puedeAutorizarAgenda(role)) jobs.push(cargarAgenda(items).catch(() => {}));
  if (puedeVerOracion(role)) jobs.push(cargarOracion(items).catch(() => {}));
  if (role === 'pastor') jobs.push(cargarKpiPastor(items).catch(() => {}));
  if (abreCultos(role)) jobs.push(cargarCultosSinCerrar(items, role).catch(() => {}));

  await Promise.all(jobs);
  // Las advertencias van arriba SIEMPRE, aunque sean lo más viejo de la lista:
  // justamente por llevar días sin resolverse es que hay que verlas primero.
  // Y entre ellas manda la MÁS VIEJA — al revés que el resto —, porque es la
  // que lleva más tiempo estropeando las cifras en silencio.
  items.sort((a, b) => {
    if (!!a.advertencia !== !!b.advertencia) return a.advertencia ? -1 : 1;
    if (a.advertencia && b.advertencia) return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0;
    return a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0;
  });
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
    const off = alCambiarVisto(role, setVisto);
    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
      off();
    };
  }, [cargar, role]);

  const tsMs = (n: Notif) => {
    const t = Date.parse(n.ts);
    return Number.isNaN(t) ? 0 : t;
  };
  // Leído es leído, también para las advertencias (decisión de Iván,
  // 03/09/2026): al abrir la campana el contador se apaga en todos lados.
  // El aviso NO se borra de la lista ni de la pantalla de Asistencia — deja de
  // perseguirte, pero el trabajo pendiente sigue a la vista donde se hace.
  const sinLeer = (n: Notif) => tsMs(n) > visto;
  const noLeidas = notifs.filter(sinLeer).length;
  const advertencias = notifs.filter((n) => n.advertencia && sinLeer(n)).length;

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
          aria-label={
            advertencias > 0
              ? `Notificaciones, ${advertencias} ${advertencias === 1 ? 'advertencia' : 'advertencias'} y ${noLeidas} sin leer`
              : noLeidas > 0
                ? `Notificaciones, ${noLeidas} sin leer`
                : 'Notificaciones'
          }
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
              className={cn(
                'absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-white text-[11px] font-semibold leading-none ring-2 ring-card',
                advertencias > 0 ? 'bg-amber-600' : 'bg-orange-500',
              )}
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
              <span
                className={cn(
                  'min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-white text-[11px] font-semibold leading-none',
                  advertencias > 0 ? 'bg-amber-600' : 'bg-orange-500',
                )}
              >
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
              const esAdv = !!n.advertencia;
              const noLeida = sinLeer(n);
              const esKpi = n.tipo === 'kpi';
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => irA(n)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary',
                      'focus-visible:outline-none focus-visible:bg-secondary',
                      // La advertencia se distingue del "no leído" normal: no es
                      // una novedad que mirar, es algo roto que hay que arreglar.
                      esAdv
                        ? 'bg-amber-500/10 border-l-2 border-amber-500'
                        : noLeida && 'bg-orange-500/[0.06]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        esAdv
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          : esKpi
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-primary/10 text-primary',
                      )}
                    >
                      <Icono className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{n.titulo}</span>
                        {esAdv ? (
                          <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                            Atención
                          </span>
                        ) : (
                          noLeida && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" aria-label="sin leer" />
                        )}
                      </span>
                      <span className="block text-sm text-muted-foreground">{n.detalle}</span>
                      {esAdv ? (
                        // Sin el "qué hago ahora", el aviso solo genera angustia.
                        <span className="mt-1 block text-xs font-medium text-amber-800 dark:text-amber-300">
                          Ábrelo en Asistencia y ciérralo para que las cifras cuadren.
                        </span>
                      ) : (
                        <span className="block text-xs text-muted-foreground/80 mt-0.5">{cuando(n)}</span>
                      )}
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
