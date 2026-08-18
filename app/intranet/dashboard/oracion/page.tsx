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
import { getPersonas, type PersonaRow } from '@/lib/datos';

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
  // Híbrido: por miembro registrado o por nombre libre. Empieza en "miembro"
  // porque es lo que da trazabilidad; el nombre libre es el escape.
  const [modo, setModo] = useState<'miembro' | 'libre'>('miembro');
  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [cargandoPersonas, setCargandoPersonas] = useState(false);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [nombreLibre, setNombreLibre] = useState('');
  const [peticion, setPeticion] = useState('');
  const [comboAbierto, setComboAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Carga la lista de miembros la primera vez que se abre el diálogo.
  useEffect(() => {
    if (!open || personas.length > 0) return;
    setCargandoPersonas(true);
    getPersonas()
      .then((ps) => setPersonas(ps))
      .catch(() => toast.error('No pudimos cargar los miembros'))
      .finally(() => setCargandoPersonas(false));
  }, [open, personas.length]);

  function reset() {
    setModo('miembro');
    setPersonaId(null);
    setNombreLibre('');
    setPeticion('');
  }

  const personaSel = personas.find((p) => Number(p.id) === personaId);

  async function guardar() {
    const texto = peticion.trim();
    if (!texto) {
      toast.error('Escribe la petición');
      return;
    }
    if (modo === 'miembro' && personaId == null) {
      toast.error('Elige un miembro');
      return;
    }
    if (modo === 'libre' && !nombreLibre.trim()) {
      toast.error('Escribe el nombre');
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch('/api/oracion/interna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          modo === 'miembro'
            ? { persona_id: personaId, peticion: texto }
            : { nombre: nombreLibre.trim(), peticion: texto },
        ),
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
          <DialogDescription>De un miembro de la iglesia.</DialogDescription>
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
              Miembro registrado
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
              <Label>Miembro</Label>
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
                      ? 'Cargando miembros…'
                      : personaSel?.nombre ?? 'Elige un miembro'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar miembro…" />
                    <CommandList>
                      <CommandEmpty>Sin resultados.</CommandEmpty>
                      <CommandGroup>
                        {personas.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.nombre}
                            onSelect={() => {
                              setPersonaId(Number(p.id));
                              setComboAbierto(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                personaId === Number(p.id) ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {p.nombre}
                          </CommandItem>
                        ))}
                      </CommandGroup>
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
