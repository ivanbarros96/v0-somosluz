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
import { HandHeart, Clock, Mail, Loader2, CheckCircle2, Plus, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getPersonas, getMiembrosNuevos, type PersonaRow, type MiembroNuevoRow } from '@/lib/datos';

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
  nombre: string;
  email: string | null;
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
  { valor: 'todos', label: 'Todo origen' },
  { valor: 'interna', label: 'Internas' },
  { valor: 'externa', label: 'Externas' },
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
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

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

  const pendientesCount = useMemo(
    () => peticiones.filter((p) => p.estado === 'pendiente').length,
    [peticiones],
  );

  const visibles = useMemo(
    () =>
      peticiones.filter(
        (p) =>
          (filtro === 'todas' || p.estado === filtro) &&
          (filtroOrigen === 'todos' || p.origen === filtroOrigen),
      ),
    [peticiones, filtro, filtroOrigen],
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{p.nombre}</p>
                      <span
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded font-medium',
                          p.origen === 'interna'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        {p.origen === 'interna' ? 'Interna' : 'Externa'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(parseISO(p.created_at), { addSuffix: true, locale: es })}
                      </span>
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

                <div className="flex items-center gap-2 mt-4">
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
    </div>
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

    // Un visitante todavía no tiene ficha en `personas`, así que su petición
    // se guarda por nombre. Queda legible igual, y sigue estándolo cuando esa
    // visita pase a ser miembro.
    const cuerpo =
      modo === 'libre'
        ? { nombre: nombreLibre.trim(), peticion: texto }
        : seleccion!.origen === 'persona'
          ? { persona_id: seleccion!.id, peticion: texto }
          : { nombre: seleccion!.nombre, peticion: texto };

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
