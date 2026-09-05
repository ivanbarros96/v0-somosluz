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
import { HandHeart, Clock, Mail, MessageCircle, Loader2, CheckCircle2, Plus, ChevronsUpDown, Check, Trash2, Pencil, MessageSquarePlus } from 'lucide-react';
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

/** Un contacto con quien trae la petición. Varios por petición: es el historial. */
interface Seguimiento {
  id: string;
  peticion_id: string;
  fecha: string; // 'YYYY-MM-DD'
  nota: string;
  registrado_por: string | null;
  created_at: string;
}

interface Peticion {
  id: string;
  /** Quien trae la petición. Es SIEMPRE el contacto para el seguimiento. */
  nombre: string;
  /** Por quién se ora, si no es quien la trae. null = es para sí mismo. */
  beneficiario: string | null;
  /** Clasificación de Nicole. null = todavía sin clasificar. */
  categoria: CategoriaOracion | null;
  /** Ficha, cuando se ora por alguien de la congregación. */
  beneficiario_persona_id: number | null;
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
  ...CATEGORIA_KEYS.map((k) => ({ valor: k, label: CATEGORIAS_ORACION[k].nombre })),
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
  // Historial de contactos de TODAS las peticiones; se agrupa por petición al
  // pintar. Anotar un contacto es la acción más repetida del perfil, así que
  // tiene su propio botón y no vive escondida dentro de "editar".
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [aSeguir, setASeguir] = useState<Peticion | null>(null);

  // id de petición → sus contactos, del más reciente al más antiguo.
  const porPeticion = useMemo(() => {
    const m = new Map<string, Seguimiento[]>();
    for (const s of seguimientos) {
      const lista = m.get(s.peticion_id);
      if (lista) lista.push(s);
      else m.set(s.peticion_id, [s]);
    }
    return m;
  }, [seguimientos]);

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
  }) {
    if (!aEditar) return;
    const id = aEditar.id;
    const prev = peticiones;
    const nuevo = {
      peticion: cambios.peticion.trim(),
      nombre: cambios.nombre.trim(),
      beneficiario: cambios.beneficiario.trim() || null,
      origen: cambios.origen,
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
          // Al reescribir el nombre a mano se desliga de la ficha: el texto ya
          // no tiene por qué corresponder a esa persona.
          beneficiario_persona_id: null,
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
      // Las dos juntas: el historial se pinta dentro de cada tarjeta, así que
      // pedirlo aparte por petición serían decenas de consultas.
      const [rp, rs] = await Promise.all([
        fetch('/api/oracion'),
        fetch('/api/oracion/seguimientos'),
      ]);
      if (!rp.ok) throw new Error();
      setPeticiones((await rp.json()).peticiones ?? []);
      if (rs.ok) setSeguimientos((await rs.json()).seguimientos ?? []);
    } catch {
      toast.error('No pudimos cargar las peticiones');
    } finally {
      setLoading(false);
    }
  }

  async function anotarSeguimiento(peticionId: string, fecha: string, nota: string) {
    const res = await fetch('/api/oracion/seguimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peticion_id: peticionId, fecha, nota }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error || 'No pudimos guardar el seguimiento');
    }
    const { seguimiento } = await res.json();
    setSeguimientos((ss) =>
      [seguimiento, ...ss].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
    );
  }

  async function borrarSeguimiento(id: string) {
    const prev = seguimientos;
    setSeguimientos((ss) => ss.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/oracion/seguimientos?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setSeguimientos(prev);
      toast.error('No pudimos eliminar la anotación');
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
                        {ORIGENES_ORACION[p.origen].nombre}
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
                              {CATEGORIAS_ORACION[k].nombre}
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
                <BloqueSeguimiento
                  historial={porPeticion.get(p.id) ?? []}
                  contestada={p.estado === 'contestada'}
                  onBorrar={borrarSeguimiento}
                />

                {/* flex-wrap: en 375px los dos botones de estado más el lápiz y
                    la papelera no caben en una línea y la papelera quedaba
                    cortada fuera de la tarjeta. */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {/* Anotar un contacto es LA acción del seguimiento y estaba
                      escondida dentro de "editar". Va primero y con su nombre. */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setASeguir(p)}
                  >
                    <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />
                    Anotar contacto
                  </Button>
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

      <AnotarContactoDialog
        peticion={aSeguir}
        onCerrar={() => setASeguir(null)}
        onGuardar={anotarSeguimiento}
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

// ── Seguimiento dentro de la tarjeta ────────────────────────────────────────
//
// Muestra el último contacto y, si hay más, deja abrir el historial completo.
// Antes sólo existía UNA nota que se pisaba cada vez, así que la evolución
// —que en el informe real de la Red es la información— se perdía.
function BloqueSeguimiento({
  historial,
  contestada,
  onBorrar,
}: {
  historial: Seguimiento[];
  contestada: boolean;
  onBorrar: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  const ultimo = historial[0];
  const dias = ultimo ? diasDesde(ultimo.fecha) : null;
  const frio = dias !== null && dias >= DIAS_SIN_NOTICIAS;

  // Una petición ya contestada y sin seguimiento no necesita que se le recuerde
  // nada: se cerró y ya está.
  if (!ultimo && contestada) return null;

  const cuando = (d: number) => (d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`);

  return (
    <div
      className={cn(
        'mt-3 rounded-lg border px-3 py-2 text-xs',
        !ultimo || frio ? 'border-amber-500/35 bg-amber-500/10' : 'border-border bg-muted/40',
      )}
    >
      {!ultimo ? (
        <p className="text-foreground">Todavía no se ha registrado ningún contacto</p>
      ) : (
        <>
          <p className="text-foreground">
            <span className="font-semibold">Último contacto: {fechaLegible(ultimo.fecha)}</span>
            <span className="text-muted-foreground"> · {cuando(dias!)}</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap text-pretty text-muted-foreground">
            {ultimo.nota}
          </p>

          {historial.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                aria-expanded={abierto}
                className="mt-1.5 inline-flex min-h-9 items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
              >
                {abierto
                  ? 'Ocultar historial'
                  : `Ver historial (${historial.length} contactos)`}
                <ChevronsUpDown className="h-3 w-3" aria-hidden />
              </button>

              {abierto && (
                // Línea de tiempo: el filete a la izquierda hace ver que son
                // momentos de una misma historia y no notas sueltas.
                <ol className="mt-2 space-y-2.5 border-l border-border pl-3">
                  {historial.slice(1).map((s) => (
                    <li key={s.id} className="group relative">
                      <span
                        aria-hidden
                        className="absolute -left-[15px] top-1.5 h-1.5 w-1.5 rounded-full bg-border"
                      />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{fechaLegible(s.fecha)}</p>
                          <p className="whitespace-pre-wrap text-pretty text-muted-foreground">
                            {s.nota}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onBorrar(s.id)}
                          aria-label={`Eliminar la anotación del ${fechaLegible(s.fecha)}`}
                          className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Anotar un contacto ──────────────────────────────────────────────────────
function AnotarContactoDialog({
  peticion,
  onCerrar,
  onGuardar,
}: {
  peticion: Peticion | null;
  onCerrar: () => void;
  onGuardar: (peticionId: string, fecha: string, nota: string) => Promise<void>;
}) {
  const [fecha, setFecha] = useState(hoyEnChile());
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Cada vez que se abre parte en blanco y con la fecha de hoy: lo normal es
  // anotar algo que acaba de pasar.
  useEffect(() => {
    if (!peticion) return;
    setFecha(hoyEnChile());
    setNota('');
  }, [peticion]);

  async function guardar() {
    if (!peticion || !nota.trim()) return;
    setGuardando(true);
    try {
      await onGuardar(peticion.id, fecha, nota.trim());
      toast.success('Contacto anotado');
      onCerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos guardarlo');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={!!peticion} onOpenChange={(v) => { if (!v && !guardando) onCerrar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anotar contacto</DialogTitle>
          <DialogDescription>
            {peticion && (
              <>
                Se habló con{' '}
                <span className="font-medium text-foreground">{peticion.nombre}</span>
                {peticion.beneficiario ? `, que trae la petición por ${peticion.beneficiario}.` : '.'}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="seg-fecha">¿Cuándo?</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="seg-fecha"
                type="date"
                value={fecha}
                max={hoyEnChile()}
                onChange={(e) => setFecha(e.target.value)}
                className="w-auto"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() => setFecha(hoyEnChile())}
              >
                Hoy
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seg-nota">¿Qué se supo?</Label>
            <Textarea
              id="seg-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={4}
              maxLength={1000}
              autoFocus
              placeholder="Ej: sigue en espera de la biopsia, se le escribió por WhatsApp"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando || !nota.trim()}>
            {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : 'Anotar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  }) => void;
}) {
  const [texto, setTexto] = useState('');
  const [nombre, setNombre] = useState('');
  const [beneficiario, setBeneficiario] = useState('');
  const [origen, setOrigen] = useState<Origen>('interna');

  // Se recarga cada vez que se abre con otra petición; sin esto el diálogo
  // mostraría los datos de la anterior.
  useEffect(() => {
    if (!peticion) return;
    setTexto(peticion.peticion);
    setNombre(peticion.nombre);
    setBeneficiario(peticion.beneficiario ?? '');
    setOrigen(peticion.origen);
  }, [peticion]);

  const sinCambios =
    !!peticion &&
    texto.trim() === peticion.peticion &&
    nombre.trim() === peticion.nombre &&
    (beneficiario.trim() || null) === peticion.beneficiario &&
    origen === peticion.origen;

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
                  {ORIGENES_ORACION[k].nombre}
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
  // Por quién se ora puede ser alguien de la congregación (con ficha) o un
  // nombre escrito a mano, para quien todavía no está registrado.
  const [benEsMiembro, setBenEsMiembro] = useState(false);
  const [benSeleccion, setBenSeleccion] = useState<Seleccion | null>(null);
  const [benComboAbierto, setBenComboAbierto] = useState(false);
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
    setBenEsMiembro(false);
    setBenSeleccion(null);
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
    if (paraOtro && benEsMiembro && !benSeleccion) {
      toast.error('Elige por quién se ora');
      return;
    }
    if (paraOtro && !benEsMiembro && !beneficiario.trim()) {
      toast.error('Escribe por quién se ora');
      return;
    }

    // Miembros y visitas viven en tablas distintas, así que cada uno va por su
    // propia columna. Al convertir una visita en miembro, sus peticiones se
    // mueven solas a la ficha nueva.
    // Quien la registra desde acá sí conoce las categorías, así que se pide en
    // el momento. Las que llegan del sitio público no: entran sin clasificar.
    // Si es de la congregación viaja su ficha y el servidor toma el nombre de
    // ahí; si no, viaja el texto escrito a mano. Las visitas (miembros_nuevos)
    // aún no tienen columna propia, así que van por nombre.
    const porQuien = !paraOtro
      ? {}
      : benEsMiembro && benSeleccion?.origen === 'persona'
        ? { beneficiario_persona_id: benSeleccion.id }
        : benEsMiembro && benSeleccion
          ? { beneficiario: benSeleccion.nombre }
          : { beneficiario: beneficiario.trim() };

    const extra = { ...porQuien, ...(categoria ? { categoria } : {}) };
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
              <div className="space-y-2 pt-1">
                {/* La persona por la que se ora puede SER de la congregación.
                    Antes solo se podía escribir su nombre a mano, así que su
                    petición quedaba suelta y sin relación con su ficha. */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={!benEsMiembro}
                    onClick={() => { setBenEsMiembro(false); setBenSeleccion(null); }}
                    className={cn(
                      'min-h-11 rounded-full border px-3.5 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      !benEsMiembro
                        ? 'border-primary bg-primary font-semibold text-primary-foreground'
                        : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    Escribir el nombre
                  </button>
                  <button
                    type="button"
                    aria-pressed={benEsMiembro}
                    onClick={() => { setBenEsMiembro(true); setBeneficiario(''); }}
                    className={cn(
                      'min-h-11 rounded-full border px-3.5 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      benEsMiembro
                        ? 'border-primary bg-primary font-semibold text-primary-foreground'
                        : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    Es de la congregación
                  </button>
                </div>

                {benEsMiembro ? (
                  <Popover open={benComboAbierto} onOpenChange={setBenComboAbierto}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={benComboAbierto}
                        className="w-full justify-between font-normal"
                      >
                        {benSeleccion?.nombre ?? 'Elige a la persona'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar por nombre…" />
                        <CommandList>
                          <CommandEmpty>No encontramos a nadie con ese nombre.</CommandEmpty>
                          {grupos.map((g) => (
                            <CommandGroup key={g.heading} heading={g.heading}>
                              {g.items.map((item) => (
                                <CommandItem
                                  key={`${item.origen}-${item.id}`}
                                  value={`${item.nombre} ${g.heading}`}
                                  onSelect={() => {
                                    setBenSeleccion(item);
                                    setBenComboAbierto(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      benSeleccion?.id === item.id && benSeleccion?.origen === item.origen
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                    )}
                                  />
                                  {item.nombre}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="beneficiario">¿Por quién se ora?</Label>
                    <input
                      id="beneficiario"
                      value={beneficiario}
                      onChange={(e) => setBeneficiario(e.target.value)}
                      maxLength={100}
                      placeholder="Ej: Ricardo Aquino"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                )}

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
                  {CATEGORIAS_ORACION[k].nombre}
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
