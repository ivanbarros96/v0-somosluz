'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { puedeAutorizarAgenda } from '@/lib/roles';
import { CULTO_TIPOS, CULTO_TIPO_KEYS } from '@/lib/cultos-tipos';
import { getPersonas, type PersonaRow } from '@/lib/datos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Loader2, Plus, Check, X, ChevronsUpDown, Clock, Pencil, Trash2, CalendarClock,
} from 'lucide-react';

type Estado = 'propuesta' | 'confirmada' | 'rechazada';

interface Evento {
  id: number;
  titulo: string;
  fecha: string;              // 'YYYY-MM-DD'
  hora: string | null;        // 'HH:MM:SS'
  ministerio: string | null;
  nota: string | null;
  solicitante_id: number | null;
  solicitante_nombre: string;
  estado: Estado;
  creado_por: string;
  resuelto_por: string | null;
  motivo_rechazo: string | null;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const ESTADO_STYLE: Record<Estado, string> = {
  propuesta: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25',
  confirmada: 'bg-primary/10 text-primary border-primary/25',
  rechazada: 'bg-muted text-muted-foreground border-border',
};

const ESTADO_LABEL: Record<Estado, string> = {
  propuesta: 'Por confirmar',
  confirmada: 'Confirmada',
  rechazada: 'Rechazada',
};

const FILTROS: { valor: Estado | 'todas'; label: string }[] = [
  { valor: 'todas', label: 'Todas' },
  { valor: 'propuesta', label: 'Por confirmar' },
  { valor: 'confirmada', label: 'Confirmadas' },
  { valor: 'rechazada', label: 'Rechazadas' },
];

/** Hoy en Chile, como 'YYYY-MM-DD'. */
function hoyEnChile(): string {
  // 'en-CA' entrega justo el formato YYYY-MM-DD. Se pide la fecha en la zona
  // de Chile y NO se usa `new Date().toISOString()`, que da la fecha UTC: de
  // noche en Chile el UTC ya va en el día siguiente y todo se correría un día.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

/** '2026-09-12' → '12 de septiembre'. Se parte el string, no se usa Date. */
function fechaLegible(iso: string, conAnio = false): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  if (!anio || !mes || !dia) return iso;
  return `${dia} de ${MESES[mes - 1] ?? ''}${conAnio ? ` de ${anio}` : ''}`;
}

function tituloMes(iso: string): string {
  const [anio, mes] = iso.split('-').map(Number);
  const nombre = MESES[mes - 1] ?? '';
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

const soloHora = (h: string | null) => (h ? h.slice(0, 5) : null);

function etiquetaMinisterio(m: string | null): string | null {
  if (!m) return null;
  return m in CULTO_TIPOS ? CULTO_TIPOS[m as keyof typeof CULTO_TIPOS].label : m;
}

// ── Tarjeta de un evento ────────────────────────────────────────────────────

function FilaEvento({
  e, puedeAutorizar, onConfirmar, onRechazar, onEditar, onBorrar, ocupado,
}: {
  e: Evento;
  puedeAutorizar: boolean;
  onConfirmar: (e: Evento) => void;
  onRechazar: (e: Evento) => void;
  onEditar: (e: Evento) => void;
  onBorrar: (e: Evento) => void;
  ocupado: boolean;
}) {
  const hora = soloHora(e.hora);
  const ministerio = etiquetaMinisterio(e.ministerio);

  return (
    <div className="px-4 md:px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{e.titulo}</span>
            <Badge variant="outline" className={cn('text-[10px]', ESTADO_STYLE[e.estado])}>
              {ESTADO_LABEL[e.estado]}
            </Badge>
            {ministerio && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {ministerio}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <CalendarDays className="h-3 w-3 shrink-0" />
            {fechaLegible(e.fecha, true)}
            {hora && (
              <>
                <span aria-hidden>·</span>
                <Clock className="h-3 w-3 shrink-0" />
                {hora} hrs
              </>
            )}
          </p>

          <p className="text-xs text-muted-foreground">
            Lo solicita <span className="text-foreground">{e.solicitante_nombre}</span>
          </p>

          {e.nota && <p className="text-xs text-muted-foreground pt-0.5">{e.nota}</p>}

          {e.estado === 'rechazada' && e.motivo_rechazo && (
            <p className="text-xs text-muted-foreground pt-0.5">
              <span className="font-medium text-foreground">Motivo:</span> {e.motivo_rechazo}
            </p>
          )}
        </div>

        {puedeAutorizar && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost" size="icon" title="Editar"
              onClick={() => onEditar(e)} disabled={ocupado}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon" title="Borrar"
              onClick={() => onBorrar(e)} disabled={ocupado}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {puedeAutorizar && e.estado === 'propuesta' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onConfirmar(e)} disabled={ocupado}>
            <Check className="h-4 w-4 mr-1.5" />
            Confirmar
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRechazar(e)} disabled={ocupado}>
            <X className="h-4 w-4 mr-1.5" />
            Rechazar
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Selector de la persona que solicita ─────────────────────────────────────

function SelectorPersona({
  personas, valor, onChange, cargando,
}: {
  personas: PersonaRow[];
  valor: { id: number; nombre: string } | null;
  onChange: (v: { id: number; nombre: string }) => void;
  cargando: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  const grupos = useMemo(() => {
    const porTipo = (tipo: string) =>
      personas
        .filter((p) => p.source_tipo === tipo)
        .map((p) => ({ id: Number(p.id), nombre: p.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return [
      { heading: 'Adultos', items: porTipo('adulto') },
      { heading: 'Youth', items: porTipo('joven') },
      { heading: 'Niños', items: porTipo('nino') },
    ].filter((g) => g.items.length > 0);
  }, [personas]);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          className="w-full justify-between font-normal"
          disabled={cargando}
        >
          {cargando ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </span>
          ) : (
            <span className={cn(!valor && 'text-muted-foreground')}>
              {valor?.nombre ?? 'Busca a la persona…'}
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Escribe un nombre…" />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            {grupos.map((g) => (
              <CommandGroup key={g.heading} heading={g.heading}>
                {g.items.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.nombre}
                    onSelect={() => { onChange(p); setAbierto(false); }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', valor?.id === p.id ? 'opacity-100' : 'opacity-0')}
                    />
                    {p.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Pantalla ────────────────────────────────────────────────────────────────

const FORM_VACIO = {
  titulo: '', fecha: '', hora: '', ministerio: 'ninguno', nota: '',
};

export default function AgendaPage() {
  const { user } = useAuth();
  const puedeAutorizar = !!user && puedeAutorizarAgenda(user.role);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Estado | 'todas'>('todas');
  const [ocupado, setOcupado] = useState(false);

  // Diálogo de crear / editar
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [editando, setEditando] = useState<Evento | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [solicitante, setSolicitante] = useState<{ id: number; nombre: string } | null>(null);
  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [cargandoPersonas, setCargandoPersonas] = useState(false);

  // Diálogo de rechazo
  const [rechazando, setRechazando] = useState<Evento | null>(null);
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/agenda');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEventos(data.eventos ?? []);
    } catch {
      toast.error('No pudimos cargar la agenda.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // La congregación se carga la primera vez que se abre el diálogo, no al
  // entrar a la pantalla: la mayoría entra sólo a mirar fechas.
  useEffect(() => {
    if (!dialogoAbierto || personas.length > 0) return;
    setCargandoPersonas(true);
    getPersonas()
      .then(setPersonas)
      .catch(() => toast.error('No pudimos cargar la congregación'))
      .finally(() => setCargandoPersonas(false));
  }, [dialogoAbierto, personas.length]);

  const hoy = hoyEnChile();

  const { proximos, pasados } = useMemo(() => {
    const visibles = eventos.filter((e) => filtro === 'todas' || e.estado === filtro);
    return {
      proximos: visibles.filter((e) => e.fecha >= hoy),
      // Los pasados van del más reciente al más antiguo: lo de ayer importa
      // más que lo del año pasado.
      pasados: visibles.filter((e) => e.fecha < hoy).reverse(),
    };
  }, [eventos, filtro, hoy]);

  // Los próximos se agrupan por mes para que la lista no sea un muro plano.
  const proximosPorMes = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const e of proximos) {
      const clave = e.fecha.slice(0, 7);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(e);
    }
    return [...mapa.entries()];
  }, [proximos]);

  const pendientes = eventos.filter((e) => e.estado === 'propuesta').length;

  function abrirNuevo() {
    setEditando(null);
    setForm({ ...FORM_VACIO, fecha: hoy });
    setSolicitante(null);
    setDialogoAbierto(true);
  }

  function abrirEdicion(e: Evento) {
    setEditando(e);
    setForm({
      titulo: e.titulo,
      fecha: e.fecha,
      hora: soloHora(e.hora) ?? '',
      ministerio: e.ministerio ?? 'ninguno',
      nota: e.nota ?? '',
    });
    setSolicitante(
      e.solicitante_id ? { id: e.solicitante_id, nombre: e.solicitante_nombre } : null,
    );
    setDialogoAbierto(true);
  }

  async function guardar() {
    if (!form.titulo.trim() || !form.fecha) {
      toast.error('El título y la fecha son obligatorios.');
      return;
    }
    if (!editando && !solicitante) {
      toast.error('Indica quién solicita el evento.');
      return;
    }

    setOcupado(true);
    try {
      const cuerpo = {
        titulo: form.titulo.trim(),
        fecha: form.fecha,
        hora: form.hora || null,
        ministerio: form.ministerio === 'ninguno' ? null : form.ministerio,
        nota: form.nota.trim() || null,
      };

      const res = editando
        ? await fetch(`/api/agenda/${editando.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'editar', ...cuerpo }),
          })
        : await fetch('/api/agenda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...cuerpo, solicitante_id: solicitante!.id }),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No pudimos guardar');
      }

      toast.success(editando ? 'Evento actualizado.' : 'Fecha propuesta. Queda esperando confirmación.');
      setDialogoAbierto(false);
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos guardar.');
    } finally {
      setOcupado(false);
    }
  }

  async function resolver(e: Evento, accion: 'confirmar' | 'rechazar', motivoTexto?: string) {
    setOcupado(true);
    try {
      const res = await fetch(`/api/agenda/${e.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, motivo: motivoTexto ?? null }),
      });
      if (!res.ok) throw new Error();
      toast.success(accion === 'confirmar' ? 'Fecha confirmada.' : 'Fecha rechazada.');
      setRechazando(null);
      setMotivo('');
      await cargar();
    } catch {
      toast.error('No pudimos actualizar el evento.');
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(e: Evento) {
    if (!confirm(`¿Borrar "${e.titulo}"? No se puede deshacer.`)) return;
    setOcupado(true);
    try {
      const res = await fetch(`/api/agenda/${e.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Evento borrado.');
      await cargar();
    } catch {
      toast.error('No pudimos borrar el evento.');
    } finally {
      setOcupado(false);
    }
  }

  const propsFila = {
    puedeAutorizar,
    onConfirmar: (e: Evento) => resolver(e, 'confirmar'),
    onRechazar: (e: Evento) => { setRechazando(e); setMotivo(''); },
    onEditar: abrirEdicion,
    onBorrar: borrar,
    ocupado,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Agenda
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Las fechas de todos los ministerios en un solo lugar, para no chocar entre reuniones.
            {puedeAutorizar && pendientes > 0 && (
              <> <span className="text-orange-600 dark:text-orange-400 font-medium">
                {pendientes} {pendientes === 1 ? 'espera' : 'esperan'} tu confirmación.
              </span></>
            )}
          </p>
        </div>
        <Button onClick={abrirNuevo}>
          <Plus className="h-4 w-4 mr-1.5" />
          Proponer fecha
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTROS.map((f) => (
          <Button
            key={f.valor}
            size="sm"
            variant={filtro === f.valor ? 'default' : 'outline'}
            onClick={() => setFiltro(f.valor)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : proximos.length === 0 && pasados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filtro === 'todas'
                ? 'Todavía no hay fechas en la agenda.'
                : 'No hay fechas con ese filtro.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {proximosPorMes.map(([mes, lista]) => (
            <section key={mes} className="space-y-2">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                {tituloMes(lista[0].fecha)}
              </h2>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {lista.map((e) => <FilaEvento key={e.id} e={e} {...propsFila} />)}
                </CardContent>
              </Card>
            </section>
          ))}

          {pasados.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Ya pasaron
              </h2>
              <Card>
                <CardContent className="p-0 divide-y divide-border opacity-70">
                  {pasados.map((e) => <FilaEvento key={e.id} e={e} {...propsFila} />)}
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      )}

      {/* Crear / editar */}
      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar evento' : 'Proponer una fecha'}</DialogTitle>
            <DialogDescription>
              {editando
                ? 'Corrige los datos del evento.'
                : 'Queda tentativa hasta que Secretaría, el Pastor o el Co-pastor la confirmen.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ag-titulo">Título</Label>
              <Input
                id="ag-titulo"
                value={form.titulo}
                maxLength={120}
                onChange={(ev) => setForm({ ...form, titulo: ev.target.value })}
                placeholder="Ej: Vigilia de jóvenes"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ag-fecha">Fecha</Label>
                <Input
                  id="ag-fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(ev) => setForm({ ...form, fecha: ev.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ag-hora">
                  Hora <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                </Label>
                <Input
                  id="ag-hora"
                  type="time"
                  value={form.hora}
                  onChange={(ev) => setForm({ ...form, hora: ev.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Ministerio <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
              </Label>
              <Select
                value={form.ministerio}
                onValueChange={(v) => setForm({ ...form, ministerio: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Sin ministerio</SelectItem>
                  {CULTO_TIPO_KEYS.map((t) => (
                    <SelectItem key={t} value={t}>{CULTO_TIPOS[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Al editar no se cambia el solicitante: es el registro de quién
                pidió el evento, y de ahí sale el correo de la respuesta. */}
            {!editando && (
              <div className="space-y-1.5">
                <Label>¿Quién lo solicita?</Label>
                <SelectorPersona
                  personas={personas}
                  valor={solicitante}
                  onChange={setSolicitante}
                  cargando={cargandoPersonas}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ag-nota">
                Nota <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="ag-nota"
                value={form.nota}
                maxLength={500}
                onChange={(ev) => setForm({ ...form, nota: ev.target.value })}
                placeholder="Cualquier detalle que ayude a decidir…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)} disabled={ocupado}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={ocupado}>
              {ocupado && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editando ? 'Guardar' : 'Proponer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rechazo */}
      <Dialog open={!!rechazando} onOpenChange={(o) => !o && setRechazando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar la fecha</DialogTitle>
            <DialogDescription>
              Se le avisa por correo a {rechazando?.solicitante_nombre} con el motivo, si tiene
              correo cargado en su ficha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="ag-motivo">
              Motivo <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="ag-motivo"
              value={motivo}
              maxLength={500}
              onChange={(ev) => setMotivo(ev.target.value)}
              placeholder="Ej: ese día choca con el retiro de mujeres."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazando(null)} disabled={ocupado}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => rechazando && resolver(rechazando, 'rechazar', motivo.trim() || undefined)}
              disabled={ocupado}
            >
              {ocupado && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
