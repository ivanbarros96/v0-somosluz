'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HandHeart, Clock, Mail, MessageCircle, Loader2, CheckCircle2, Plus, ChevronsUpDown, Check, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getPersonas, getMiembrosNuevos, type PersonaRow, type MiembroNuevoRow } from '@/lib/datos';
import {
  CATEGORIAS_ORACION, CATEGORIA_KEYS, etiquetaCategoria, type CategoriaOracion,
} from '@/lib/oracion-categorias';
import { ORIGENES_ORACION, ORIGEN_KEYS } from '@/lib/oracion-origen';
import { hoyEnChile, fechaLegible } from '@/components/agenda/calendario-mes';

/**
 * Días desde el último contacto. Se resta sobre las fechas en texto, sin Date:
 * las fechas vienen como 'YYYY-MM-DD' y parsearlas correría el día en Chile.
 */
function diasDesde(fecha: string): number {
  const [a1, m1, d1] = fecha.split('-').map(Number);
  const [a2, m2, d2] = hoyEnChile().split('-').map(Number);
  return Math.round(
    (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000,
  );
}

// A partir de acá una petición lleva demasiado sin noticias. Dos semanas es el
// ritmo real del informe semanal: si pasaron dos informes sin novedad, hay que
// llamar. No es una alarma, es un recordatorio.
const DIAS_SIN_NOTICIAS = 14;

/** Alguien de la congregación, venga de `personas` o de `miembros_nuevos`. */
interface Seleccion {
  origen: 'persona' | 'visita';
  id: number;
  nombre: string;
}

type Estado = 'pendiente' | 'orando' | 'contestada';
type Origen = 'interna' | 'externa';

interface Peticion {
  id: string;
  /** Quien trae la petición. Es SIEMPRE el contacto para el seguimiento. */
  nombre: string;
  /** Por quién se ora, si no es quien la trae. null = es para sí mismo. */
  beneficiario: string | null;
  /** Clasificación de Nicole. null = todavía sin clasificar. */
  categoria: CategoriaOracion | null;
  /** Último día en que se habló con quien la trae. 'YYYY-MM-DD' o null. */
  ultimo_contacto: string | null;
  /** Qué se supo la última vez. */
  nota_seguimiento: string | null;
  email: string | null;
  telefono: string | null;
  peticion: string;
  estado: Estado;
  origen: Origen;
  persona_id: number | null;
  created_at: string;
}

const FILTROS: { valor: Estado | 'todas'; label: string }[] = [
  { valor: 'todas', label: 'Todas' },
  { valor: 'pendiente', label: 'En espera' },
  { valor: 'orando', label: 'Orando' },
  { valor: 'contestada', label: 'Contestadas' },
];

const FILTROS_ORIGEN: { valor: Origen | 'todos'; label: string }[] = [
  { valor: 'todos', label: 'De todos lados' },
  { valor: 'interna', label: 'Dentro de Somos Luz' },
  { valor: 'externa', label: 'Fuera de Somos Luz' },
];

// 'sin' va PRIMERO después de "todas": las recién llegadas del sitio entran sin
// clasificar y ese es el montón que hay que despachar. Ponerlo al final lo
// escondería justo cuando es lo único accionable.
const FILTROS_CATEGORIA: { valor: CategoriaOracion | 'todas' | 'sin'; label: string }[] = [
  { valor: 'todas', label: 'Toda categoría' },
  { valor: 'sin', label: 'Sin clasificar' },
  ...CATEGORIA_KEYS.map((k) => ({ valor: k, label: CATEGORIAS_ORACION[k].corto })),
];

const ESTADO_STYLE: Record<Estado, string> = {
  pendiente: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  orando: 'bg-primary/10 text-primary',
  contestada: 'bg-green-500/10 text-green-600 dark:text-green-400',
};

const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: 'En espera',
  orando: 'Orando',
  contestada: 'Contestada',
};

export default function OracionPage() {
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Estado | 'todas'>('todas');
  const [filtroOrigen, setFiltroOrigen] = useState<Origen | 'todos'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaOracion | 'todas' | 'sin'>('todas');
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  // Petición que se está por eliminar. Ya no pide la clave del pastor: quien
  // administra las peticiones puede eliminarlas por su cuenta (Nicole,
  // 03/09/2026). Se mantiene la confirmación porque sigue siendo un borrado.
  const [aEliminar, setAEliminar] = useState<Peticion | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);
  // Petición que se está editando.
  const [aEditar, setAEditar] = useState<Peticion | null>(null);

  async function restaurar(p: Peticion) {
    try {
      const res = await fetch('/api/oracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, restaurar: true }),
      });
      if (!res.ok) throw new Error();
      // Se vuelve a insertar en su lugar por fecha, no al principio: si
      // apareciera arriba se leería como una petición nueva.
      setPeticiones((ps) =>
        [...ps, p].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
      );
      toast.success('Petición restaurada');
    } catch {
      toast.error('No pudimos restaurarla');
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    const borrada = aEliminar;
    setEliminando(true);
    setErrorEliminar('');
    try {
      const res = await fetch(`/api/oracion/${borrada.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'No pudimos eliminar' }));
        setErrorEliminar(error ?? 'No pudimos eliminar');
        return;
      }
      setPeticiones((ps) => ps.filter((p) => p.id !== borrada.id));
      // El "Deshacer" es la red de seguridad del permiso nuevo: eliminar es un
      // toque, y una petición de oración no debería perderse por un toque.
      toast.success('Petición eliminada', {
        action: { label: 'Deshacer', onClick: () => restaurar(borrada) },
        duration: 8000,
      });
      setAEliminar(null);
    } finally {
      setEliminando(false);
    }
  }

  async function guardarEdicion(cambios: {
    peticion: string;
    nombre: string;
    beneficiario: string;
    origen: Origen;
    ultimo_contacto: string;
    nota_seguimiento: string;
  }) {
    if (!aEditar) return;
    const id = aEditar.id;
    const prev = peticiones;
    const nuevo = {
      peticion: cambios.peticion.trim(),
      nombre: cambios.nombre.trim(),
      beneficiario: cambios.beneficiario.trim() || null,
      origen: cambios.origen,
      ultimo_contacto: cambios.ultimo_contacto || null,
      nota_seguimiento: cambios.nota_seguimiento.trim() || null,
    };
    setPeticiones((ps) => ps.map((p) => (p.id === id ? { ...p, ...nuevo } : p)));
    setAEditar(null);
    try {
      const res = await fetch('/api/oracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...nuevo,
          beneficiario: nuevo.beneficiario ?? '',
          ultimo_contacto: nuevo.ultimo_contacto ?? '',
          nota_seguimiento: nuevo.nota_seguimiento ?? '',
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error);
      }
      toast.success('Petición actualizada');
    } catch (e) {
      setPeticiones(prev);
      toast.error(e instanceof Error && e.message ? e.message : 'No pudimos guardar los cambios');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/oracion');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPeticiones(data.peticiones ?? []);
    } catch {
      toast.error('No pudimos cargar las peticiones');
    } finally {
      setLoading(false);
    }
  }

  async function cambiarEstado(id: string, estado: Estado) {
    setActualizando(id);
    const prev = peticiones;
    setPeticiones((ps) => ps.map((p) => (p.id === id ? { ...p, estado } : p)));
    try {
      const res = await fetch('/api/oracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPeticiones(prev);
      toast.error('No pudimos actualizar el estado');
    } finally {
      setActualizando(null);
    }
  }

  // Clasificar es aparte de cambiar el estado: se puede etiquetar una petición
  // sin darla por atendida. Optimista, igual que el estado — clasificar es un
  // gesto que se repite muchas veces seguidas al vaciar la bandeja y esperar
  // al servidor en cada una lo volvería lento.
  async function cambiarCategoria(id: string, categoria: CategoriaOracion | null) {
    const prev = peticiones;
    setPeticiones((ps) => ps.map((p) => (p.id === id ? { ...p, categoria } : p)));
    try {
      const res = await fetch('/api/oracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, categoria }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPeticiones(prev);
      toast.error('No pudimos cambiar la categoría');
    }
  }

  const pendientesCount = useMemo(
    () => peticiones.filter((p) => p.estado === 'pendiente').length,
    [peticiones],
  );

  // Resumen del estado de las peticiones: es el "tablero" del perfil Oración.
  // De un vistazo ve cuántas esperan, cuántas están en oración y cuántas se
  // contestaron. Cada número es además un atajo al filtro.
  const resumen = useMemo(
    () => ({
      pendiente: peticiones.filter((p) => p.estado === 'pendiente').length,
      orando: peticiones.filter((p) => p.estado === 'orando').length,
      contestada: peticiones.filter((p) => p.estado === 'contestada').length,
    }),
    [peticiones],
  );

  const visibles = useMemo(
    () =>
      peticiones.filter(
        (p) =>
          (filtro === 'todas' || p.estado === filtro) &&
          (filtroOrigen === 'todos' || p.origen === filtroOrigen) &&
          (filtroCategoria === 'todas' ||
            (filtroCategoria === 'sin' ? p.categoria == null : p.categoria === filtroCategoria)),
      ),
    [peticiones, filtro, filtroOrigen, filtroCategoria],
  );

  // Cuántas esperan clasificación. Alimenta el aviso de arriba: sin un número
  // a la vista, la bandeja se llena y nadie se entera.
  const sinClasificar = useMemo(
    () => peticiones.filter((p) => p.categoria == null).length,
    [peticiones],
  );

  return (
    <div>
      <div className="mb-6 md:mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <HandHeart className="h-6 w-6 text-primary" />
            Peticiones de Oración
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            De la propia iglesia y del sitio web
            {pendientesCount > 0 && (
              <> · <span className="font-medium text-orange-600 dark:text-orange-400">{pendientesCount} en espera</span></>
            )}
          </p>
        </div>
        <Button onClick={() => setNuevaAbierta(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva petición
        </Button>
      </div>

      {/* Tablero: el estado de las peticiones de un vistazo. Cada tarjeta lleva
          a su filtro. Es lo relevante para este perfil — no gráficas de
          asistencia ni padrón, que son de otros. */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {([
            { estado: 'pendiente' as const, label: 'En espera', valor: resumen.pendiente, clase: 'text-orange-600 dark:text-orange-400', ring: 'hover:border-orange-500/40' },
            { estado: 'orando' as const, label: 'Orando', valor: resumen.orando, clase: 'text-primary', ring: 'hover:border-primary/40' },
            { estado: 'contestada' as const, label: 'Contestadas', valor: resumen.contestada, clase: 'text-green-600 dark:text-green-500', ring: 'hover:border-green-500/40' },
          ]).map((s) => (
            <button
              key={s.estado}
              type="button"
              onClick={() => setFiltro(s.estado)}
              aria-pressed={filtro === s.estado}
              className={cn(
                'text-left rounded-xl border bg-card p-3 md:p-4 transition',
                s.ring,
                filtro === s.estado ? 'border-primary ring-1 ring-primary/30' : 'border-border',
              )}
            >
              <div className="text-xs md:text-sm text-muted-foreground">{s.label}</div>
              <div className={cn('text-2xl md:text-3xl font-bold mt-1', s.clase)}>{s.valor}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2 mb-3">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={cn(
              'text-xs md:text-sm px-3 py-1.5 rounded-full border transition',
              filtro === f.valor
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtros de origen: separa lo interno de lo externo con un clic */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTROS_ORIGEN.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltroOrigen(f.valor)}
            className={cn(
              'text-xs px-3 py-1 rounded-full border transition',
              filtroOrigen === f.valor
                ? 'bg-secondary text-foreground border-border'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtros por categoría (las cuatro de Nicole) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS_CATEGORIA.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltroCategoria(f.valor)}
            className={cn(
              'text-xs px-3 py-1 rounded-full border transition',
              filtroCategoria === f.valor
                ? 'bg-secondary text-foreground border-border'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
            {f.valor === 'sin' && sinClasificar > 0 && (
              <span className="ml-1.5 tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                {sinClasificar}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Aviso de bandeja: las que llegan del sitio entran sin clasificar y hay
          que asignarlas. Sin este recordatorio se acumulan sin que nadie lo note. */}
      {sinClasificar > 0 && filtroCategoria !== 'sin' && (
        <button
          type="button"
          onClick={() => setFiltroCategoria('sin')}
          className="mb-6 flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
        >
          <span className="font-semibold tabular-nums text-amber-800 dark:text-amber-300">
            {sinClasificar}
          </span>
          <span className="text-foreground">
            {sinClasificar === 1
              ? 'petición sin clasificar todavía'
              : 'peticiones sin clasificar todavía'}
          </span>
          <span className="ml-auto shrink-0 text-xs font-medium text-amber-800 dark:text-amber-300">
            Ver
          </span>
        </button>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="font-semibold text-foreground text-lg">Nada por aquí</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {filtro === 'todas' && filtroOrigen === 'todos'
                ? 'Aún no hay peticiones de oración.'
                : 'No hay peticiones con estos filtros.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibles.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="min-w-0">
                    {/* El nombre que manda es POR QUIÉN SE ORA: es el que se
                        busca en la lista y el que se nombra al orar. Quien la
                        trae va debajo, porque su papel es ser el contacto para
                        el seguimiento, no el titular de la petición. */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{p.beneficiario ?? p.nombre}</p>
                      <span
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded font-medium',
                          ORIGENES_ORACION[p.origen].clase,
                        )}
                      >
                        {ORIGENES_ORACION[p.origen].label}
                      </span>
                    </div>
                    {p.beneficiario && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        La trae <span className="font-medium text-foreground">{p.nombre}</span>
                        {' · contáctalo/a a él/ella para el seguimiento'}
                      </p>
                    )}

                    {/* El chip ES el control para clasificar: un desplegable
                        aparte obligaría a buscarlo. Sin clasificar va en ámbar
                        para que se note en la lista sin tener que filtrar. */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Categoría: ${etiquetaCategoria(p.categoria)}. Tocar para cambiar`}
                          className={cn(
                            'relative mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                            // El chip mide 26px de alto y es un control táctil:
                            // el ::after le extiende el área de toque a 44px sin
                            // engordar la píldora, que como botón de 44 quedaría
                            // pesadísima repetida en cada tarjeta.
                            'after:absolute after:left-0 after:right-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[""]',
                            p.categoria
                              ? CATEGORIAS_ORACION[p.categoria].clase
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
                          )}
                        >
                          {etiquetaCategoria(p.categoria)}
                          <ChevronsUpDown className="h-3 w-3 opacity-60" aria-hidden />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-60 p-1.5">
                        <div className="flex flex-col">
                          {CATEGORIA_KEYS.map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => cambiarCategoria(p.id, k)}
                              className={cn(
                                'flex min-h-11 items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm transition-colors hover:bg-secondary',
                                p.categoria === k && 'font-semibold text-primary',
                              )}
                            >
                              {CATEGORIAS_ORACION[k].label}
                              {p.categoria === k && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                            </button>
                          ))}
                          {p.categoria && (
                            <button
                              type="button"
                              onClick={() => cambiarCategoria(p.id, null)}
                              className="mt-1 flex min-h-11 items-center rounded-md border-t border-border px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              Quitar la categoría
                            </button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(parseISO(p.created_at), { addSuffix: true, locale: es })}
                      </span>
                      {/* El telefono va primero: el equipo prefiere llamar o
                          escribir por WhatsApp antes que mandar un correo. */}
                      {p.telefono && (
                        <a
                          href={`https://wa.me/${p.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                          title="Escribir por WhatsApp"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {p.telefono}
                        </a>
                      )}
                      {p.email && (
                        <a
                          href={`mailto:${p.email}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {p.email}
                        </a>
                      )}
                    </div>
                  </div>
                  <span className={cn('text-xs px-2 py-1 rounded-md font-medium shrink-0', ESTADO_STYLE[p.estado])}>
                    {ESTADO_LABEL[p.estado]}
                  </span>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap text-pretty">
                  {p.peticion}
                </p>

                {/* Seguimiento. Sin la FECHA, un "sin información" no dice nada:
                    puede ser de hace tres días o de hace tres semanas. Es
                    exactamente lo que le falta al informe en papel. */}
                {(() => {
                  const dias = p.ultimo_contacto ? diasDesde(p.ultimo_contacto) : null;
                  const frio = dias !== null && dias >= DIAS_SIN_NOTICIAS;
                  const contestada = p.estado === 'contestada';
                  if (!p.ultimo_contacto && contestada) return null;
                  return (
                    <div
                      className={cn(
                        'mt-3 rounded-lg border px-3 py-2 text-xs',
                        !p.ultimo_contacto || frio
                          ? 'border-amber-500/35 bg-amber-500/10'
                          : 'border-border bg-muted/40',
                      )}
                    >
                      {p.ultimo_contacto ? (
                        <p className="text-foreground">
                          <span className="font-semibold">
                            Último contacto: {fechaLegible(p.ultimo_contacto)}
                          </span>
                          <span className="text-muted-foreground">
                            {dias === 0
                              ? ' · hoy'
                              : dias === 1
                                ? ' · ayer'
                                : ` · hace ${dias} días`}
                          </span>
                        </p>
                      ) : (
                        <p className="text-foreground">
                          Todavía no se ha registrado ningún contacto
                        </p>
                      )}
                      {p.nota_seguimiento && (
                        <p className="mt-1 text-muted-foreground whitespace-pre-wrap text-pretty">
                          {p.nota_seguimiento}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* flex-wrap: en 375px los dos botones de estado más el lápiz y
                    la papelera no caben en una línea y la papelera quedaba
                    cortada fuera de la tarjeta. */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {p.estado !== 'orando' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={actualizando === p.id}
                      onClick={() => cambiarEstado(p.id, 'orando')}
                    >
                      Marcar “Orando”
                    </Button>
                  )}
                  {p.estado !== 'contestada' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={actualizando === p.id}
                      onClick={() => cambiarEstado(p.id, 'contestada')}
                    >
                      Marcar contestada
                    </Button>
                  )}
                  {p.estado !== 'pendiente' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      disabled={actualizando === p.id}
                      onClick={() => cambiarEstado(p.id, 'pendiente')}
                    >
                      Reabrir
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-11 w-11 p-0 text-muted-foreground hover:text-foreground"
                    title="Editar petición"
                    aria-label={`Editar la petición de ${p.beneficiario ?? p.nombre}`}
                    onClick={() => setAEditar(p)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    // 44px y no 36: eliminar dejó de pedir la clave del pastor,
                    // así que un toque errado ya no tiene una segunda barrera.
                    className="h-11 w-11 p-0 text-muted-foreground hover:text-destructive"
                    title="Eliminar petición"
                    aria-label={`Eliminar la petición de ${p.beneficiario ?? p.nombre}`}
                    onClick={() => { setAEliminar(p); setErrorEliminar(''); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NuevaPeticionDialog
        open={nuevaAbierta}
        onOpenChange={setNuevaAbierta}
        onCreada={load}
      />

      <EditarPeticionDialog
        peticion={aEditar}
        onCerrar={() => setAEditar(null)}
        onGuardar={guardarEdicion}
      />

      {/* Eliminar — ya no pide la clave del pastor. Se conserva la
          confirmación porque sigue siendo un borrado, pero el aviso ya no dice
          "no se puede deshacer": ahora sí se puede, desde el aviso de abajo. */}
      <Dialog
        open={!!aEliminar}
        onOpenChange={(v) => { if (!v && !eliminando) { setAEliminar(null); setErrorEliminar(''); } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar petición</DialogTitle>
            <DialogDescription>
              Se quitará de la lista la petición de{' '}
              <span className="font-semibold text-foreground">
                {aEliminar?.beneficiario ?? aEliminar?.nombre}
              </span>. Podrás deshacerlo enseguida.
            </DialogDescription>
          </DialogHeader>

          {aEliminar && (
            <blockquote className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground line-clamp-3">
              {aEliminar.peticion}
            </blockquote>
          )}

          {errorEliminar && <p className="text-sm text-destructive">{errorEliminar}</p>}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setAEliminar(null); setErrorEliminar(''); }}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={eliminar} disabled={eliminando}>
              {eliminando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando…</> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Editar una petición ─────────────────────────────────────────────────────
//
// Permiso de Nicole desde el 03/09/2026. Las peticiones llegan escritas a la
// rápida o dictadas por teléfono: un nombre mal anotado o un texto a medias se
// quedaba así para siempre, y la única salida era borrar y volver a escribir.
function EditarPeticionDialog({
  peticion,
  onCerrar,
  onGuardar,
}: {
  peticion: Peticion | null;
  onCerrar: () => void;
  onGuardar: (v: {
    peticion: string;
    nombre: string;
    beneficiario: string;
    origen: Origen;
    ultimo_contacto: string;
    nota_seguimiento: string;
  }) => void;
}) {
  const [texto, setTexto] = useState('');
  const [nombre, setNombre] = useState('');
  const [beneficiario, setBeneficiario] = useState('');
  const [origen, setOrigen] = useState<Origen>('interna');
  const [contacto, setContacto] = useState('');
  const [nota, setNota] = useState('');

  // Se recarga cada vez que se abre con otra petición; sin esto el diálogo
  // mostraría los datos de la anterior.
  useEffect(() => {
    if (!peticion) return;
    setTexto(peticion.peticion);
    setNombre(peticion.nombre);
    setBeneficiario(peticion.beneficiario ?? '');
    setOrigen(peticion.origen);
    setContacto(peticion.ultimo_contacto ?? '');
    setNota(peticion.nota_seguimiento ?? '');
  }, [peticion]);

  const sinCambios =
    !!peticion &&
    texto.trim() === peticion.peticion &&
    nombre.trim() === peticion.nombre &&
    (beneficiario.trim() || null) === peticion.beneficiario &&
    origen === peticion.origen &&
    (contacto || null) === peticion.ultimo_contacto &&
    (nota.trim() || null) === peticion.nota_seguimiento;

  return (
    <Dialog open={!!peticion} onOpenChange={(v) => { if (!v) onCerrar(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar petición</DialogTitle>
          <DialogDescription>
            Corrige lo que se anotó mal y anota el seguimiento. El estado y la categoría se
            cambian desde la tarjeta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-nombre">Quién la trae</Label>
            <Input
              id="edit-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Es el contacto para el seguimiento.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-beneficiario">Por quién se ora</Label>
            <Input
              id="edit-beneficiario"
              value={beneficiario}
              onChange={(e) => setBeneficiario(e.target.value)}
              maxLength={100}
              placeholder="Déjalo vacío si es para sí mismo"
            />
          </div>

          {/* Corregible porque el valor inicial sale del canal de entrada: un
              miembro que escribe desde el sitio web entra como "Fuera". */}
          <div className="space-y-1.5">
            <Label>La persona es</Label>
            <div className="flex flex-wrap gap-2">
              {ORIGEN_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={origen === k}
                  onClick={() => setOrigen(k)}
                  className={cn(
                    'min-h-11 rounded-full border px-3.5 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    origen === k
                      ? 'border-primary bg-primary font-semibold text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {ORIGENES_ORACION[k].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-texto">Petición</Label>
            <Textarea
              id="edit-texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>

          {/* Seguimiento (cap. 37 del manual). Va junto porque son una sola
              acción: se llama, y se anota cuándo y qué se supo. */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Seguimiento
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="edit-contacto">Último contacto</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="edit-contacto"
                  type="date"
                  value={contacto}
                  max={hoyEnChile()}
                  onChange={(e) => setContacto(e.target.value)}
                  className="w-auto"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setContacto(hoyEnChile())}
                >
                  Hoy
                </Button>
                {contacto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 text-muted-foreground"
                    onClick={() => setContacto('')}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-nota">Qué se supo</Label>
              <Textarea
                id="edit-nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Ej: sigue en espera de la biopsia, se le escribió por WhatsApp"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button
            onClick={() =>
              onGuardar({
                peticion: texto,
                nombre,
                beneficiario,
                origen,
                ultimo_contacto: contacto,
                nota_seguimiento: nota,
              })
            }
            disabled={sinCambios || !texto.trim() || !nombre.trim()}
          >
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo de nueva petición interna ───────────────────────────────────────

function NuevaPeticionDialog({
  open, onOpenChange, onCreada,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreada: () => void;
}) {
  // Híbrido: alguien de la congregación, o un nombre libre para quien no está
  // registrado. La lista incluye a TODOS —adultos, jóvenes, niños y visitas—
  // porque se ora por cualquiera, no solo por los miembros adultos.
  const [modo, setModo] = useState<'miembro' | 'libre'>('miembro');
  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [visitas, setVisitas] = useState<MiembroNuevoRow[]>([]);
  const [cargandoPersonas, setCargandoPersonas] = useState(false);
  // Los visitantes viven en otra tabla, así que no basta con el id: hay que
  // saber de cuál de las dos salió el seleccionado.
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [nombreLibre, setNombreLibre] = useState('');
  const [peticion, setPeticion] = useState('');
  const [comboAbierto, setComboAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Quien la trae y por quién se ora pueden ser distintos: es el caso más
  // común en el informe real de la Red (una hermana pide por tres personas).
  // Quien la trae queda como el contacto para el seguimiento.
  const [paraOtro, setParaOtro] = useState(false);
  const [beneficiario, setBeneficiario] = useState('');
  const [categoria, setCategoria] = useState<CategoriaOracion | ''>('');

  // Carga la congregación la primera vez que se abre el diálogo.
  useEffect(() => {
    if (!open || personas.length > 0 || visitas.length > 0) return;
    setCargandoPersonas(true);
    Promise.all([getPersonas(), getMiembrosNuevos()])
      .then(([ps, vs]) => { setPersonas(ps); setVisitas(vs); })
      .catch(() => toast.error('No pudimos cargar la congregación'))
      .finally(() => setCargandoPersonas(false));
  }, [open, personas.length, visitas.length]);

  // Agrupado y ordenado por nombre. Sin esto la lista salía en orden de
  // registro: 80 nombres mezclados donde no se notaba que hubiera jóvenes y
  // niños, y parecía que solo estaban los adultos.
  const grupos = useMemo(() => {
    const porTipo = (tipo: string) =>
      personas
        .filter((p) => p.source_tipo === tipo)
        .map((p): Seleccion => ({ origen: 'persona', id: Number(p.id), nombre: p.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return [
      { heading: 'Adultos', items: porTipo('adulto') },
      { heading: 'Jóvenes', items: porTipo('joven') },
      { heading: 'Niños', items: porTipo('nino') },
      {
        heading: 'Visitas',
        items: visitas
          .map((v): Seleccion => ({ origen: 'visita', id: v.id, nombre: v.nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      },
    ].filter((g) => g.items.length > 0);
  }, [personas, visitas]);

  function reset() {
    setModo('miembro');
    setNombreLibre('');
    setPeticion('');
    setSeleccion(null);
    setParaOtro(false);
    setBeneficiario('');
    setCategoria('');
  }

  async function guardar() {
    const texto = peticion.trim();
    if (!texto) {
      toast.error('Escribe la petición');
      return;
    }
    if (modo === 'miembro' && !seleccion) {
      toast.error('Elige a la persona');
      return;
    }
    if (modo === 'libre' && !nombreLibre.trim()) {
      toast.error('Escribe el nombre');
      return;
    }
    if (paraOtro && !beneficiario.trim()) {
      toast.error('Escribe por quién se ora');
      return;
    }

    // Miembros y visitas viven en tablas distintas, así que cada uno va por su
    // propia columna. Al convertir una visita en miembro, sus peticiones se
    // mueven solas a la ficha nueva.
    // Quien la registra desde acá sí conoce las categorías, así que se pide en
    // el momento. Las que llegan del sitio público no: entran sin clasificar.
    const extra = {
      ...(paraOtro ? { beneficiario: beneficiario.trim() } : {}),
      ...(categoria ? { categoria } : {}),
    };
    const cuerpo =
      modo === 'libre'
        ? { nombre: nombreLibre.trim(), peticion: texto, ...extra }
        : seleccion!.origen === 'persona'
          ? { persona_id: seleccion!.id, peticion: texto, ...extra }
          : { miembro_nuevo_id: seleccion!.id, peticion: texto, ...extra };

    setGuardando(true);
    try {
      const res = await fetch('/api/oracion/interna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'No pudimos guardar' }));
        throw new Error(error);
      }
      toast.success('Petición registrada');
      reset();
      onOpenChange(false);
      onCreada();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !guardando) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva petición</DialogTitle>
          <DialogDescription>De alguien de la iglesia.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Modo: miembro registrado o nombre libre */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModo('miembro')}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                modo === 'miembro'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              De la congregación
            </button>
            <button
              type="button"
              onClick={() => setModo('libre')}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                modo === 'libre'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              Otro nombre
            </button>
          </div>

          {modo === 'miembro' ? (
            <div className="space-y-1.5">
              <Label>¿Por quién oramos?</Label>
              <Popover open={comboAbierto} onOpenChange={setComboAbierto}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboAbierto}
                    className="w-full justify-between font-normal"
                    disabled={cargandoPersonas}
                  >
                    {cargandoPersonas
                      ? 'Cargando congregación…'
                      : seleccion?.nombre ?? 'Elige a la persona'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre…" />
                    <CommandList>
                      <CommandEmpty>Sin resultados.</CommandEmpty>
                      {grupos.map((g) => (
                        <CommandGroup key={g.heading} heading={g.heading}>
                          {g.items.map((item) => {
                            const elegido =
                              seleccion?.origen === item.origen && seleccion?.id === item.id;
                            return (
                              <CommandItem
                                // El id se repite entre las dos tablas, así que
                                // la clave lleva también el origen.
                                key={`${item.origen}-${item.id}`}
                                value={`${item.nombre} ${g.heading}`}
                                onSelect={() => {
                                  setSeleccion(item);
                                  setComboAbierto(false);
                                }}
                              >
                                <Check
                                  className={cn('mr-2 h-4 w-4', elegido ? 'opacity-100' : 'opacity-0')}
                                />
                                {item.nombre}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="nombre-libre">Nombre</Label>
              <input
                id="nombre-libre"
                value={nombreLibre}
                onChange={(e) => setNombreLibre(e.target.value)}
                maxLength={100}
                placeholder="Ej: María, hermana de Juan"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          {/* Quien se elige arriba es quien TRAE la petición y a quien se
              contacta después. Si se ora por otra persona, se anota acá. */}
          <div className="space-y-1.5">
            <label className="flex min-h-11 items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={paraOtro}
                onChange={(e) => setParaOtro(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-border accent-primary"
              />
              <span className="text-sm">Se ora por otra persona</span>
            </label>
            {paraOtro && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="beneficiario">¿Por quién se ora?</Label>
                <input
                  id="beneficiario"
                  value={beneficiario}
                  onChange={(e) => setBeneficiario(e.target.value)}
                  maxLength={100}
                  placeholder="Ej: Ricardo Aquino"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground">
                  El contacto para el seguimiento sigue siendo quien la trae.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="peticion">Petición</Label>
            <Textarea
              id="peticion"
              value={peticion}
              onChange={(e) => setPeticion(e.target.value)}
              placeholder="Por qué estamos orando"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIA_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={categoria === k}
                  onClick={() => setCategoria(categoria === k ? '' : k)}
                  className={cn(
                    'min-h-11 rounded-full border px-3.5 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    categoria === k
                      ? 'border-primary bg-primary font-semibold text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {CATEGORIAS_ORACION[k].corto}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Opcional. Si no eliges, queda en “Sin clasificar”.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
