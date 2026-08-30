'use client';

// Agenda dentro del panel. Muestra el MISMO calendario que la pantalla pública
// (componente compartido) y, debajo, las solicitudes.
//
// Acá NO se pide una fecha: eso se hace desde /intranet/calendario, que es
// abierto porque varios líderes de ministerio no tienen cuenta. Adentro sólo se
// mira y se resuelve.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { puedeAutorizarAgenda } from '@/lib/roles';
import { CULTO_TIPOS, CULTO_TIPO_KEYS } from '@/lib/cultos-tipos';
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
  CalendarioMes, hoyEnChile, mesDeHoy, fechaLegible, soloHora, etiquetaMinisterio,
  type EstadoEvento,
} from '@/components/agenda/calendario-mes';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Loader2, Check, X, Clock, Pencil, Trash2, CalendarClock, Mail,
} from 'lucide-react';

interface Evento {
  id: number;
  titulo: string;
  fecha: string;
  hora: string | null;
  ministerio: string | null;
  nota: string | null;
  solicitante_nombre: string;
  solicitante_email: string | null;
  estado: EstadoEvento;
  creado_por: string;
  resuelto_por: string | null;
  motivo_rechazo: string | null;
}

const ESTADO_STYLE: Record<EstadoEvento, string> = {
  propuesta: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25',
  confirmada: 'bg-primary/10 text-primary border-primary/25',
  rechazada: 'bg-muted text-muted-foreground border-border',
};

const ESTADO_LABEL: Record<EstadoEvento, string> = {
  propuesta: 'Por confirmar',
  confirmada: 'Confirmada',
  rechazada: 'Rechazada',
};

const FILTROS: { valor: EstadoEvento | 'todas'; label: string }[] = [
  { valor: 'propuesta', label: 'Por confirmar' },
  { valor: 'confirmada', label: 'Confirmadas' },
  { valor: 'rechazada', label: 'Rechazadas' },
  { valor: 'todas', label: 'Todas' },
];

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

          <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            Lo solicita <span className="text-foreground">{e.solicitante_nombre}</span>
            {e.solicitante_email && (
              <a
                href={`mailto:${e.solicitante_email}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Mail className="h-3 w-3" />
                {e.solicitante_email}
              </a>
            )}
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
            <Button variant="ghost" size="icon" title="Editar" onClick={() => onEditar(e)} disabled={ocupado}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Borrar" onClick={() => onBorrar(e)} disabled={ocupado}>
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

export default function AgendaPage() {
  const { user } = useAuth();
  const puedeAutorizar = !!user && puedeAutorizarAgenda(user.role);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState(mesDeHoy());
  const [filtro, setFiltro] = useState<EstadoEvento | 'todas'>('propuesta');
  const [ocupado, setOcupado] = useState(false);

  const [editando, setEditando] = useState<Evento | null>(null);
  const [form, setForm] = useState({ titulo: '', fecha: '', hora: '', ministerio: 'ninguno', nota: '' });

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

  const hoy = hoyEnChile();

  // En el calendario se dibuja lo confirmado y lo que está por confirmar (con
  // borde punteado). Lo rechazado no: ocuparía espacio con algo que no va a
  // pasar. Se sigue viendo en la lista con su filtro.
  const enCalendario = useMemo(
    () => eventos.filter((e) => e.estado !== 'rechazada'),
    [eventos],
  );

  const listados = useMemo(() => {
    const visibles = eventos.filter((e) => filtro === 'todas' || e.estado === filtro);
    // Lo que viene primero; lo ya pasado al final y del más reciente al más
    // antiguo, porque lo de ayer importa más que lo del año pasado.
    const futuros = visibles.filter((e) => e.fecha >= hoy);
    const pasados = visibles.filter((e) => e.fecha < hoy).reverse();
    return [...futuros, ...pasados];
  }, [eventos, filtro, hoy]);

  const pendientes = eventos.filter((e) => e.estado === 'propuesta').length;

  function abrirEdicion(e: Evento) {
    setEditando(e);
    setForm({
      titulo: e.titulo,
      fecha: e.fecha,
      hora: soloHora(e.hora) ?? '',
      ministerio: e.ministerio ?? 'ninguno',
      nota: e.nota ?? '',
    });
  }

  async function guardarEdicion() {
    if (!editando) return;
    if (!form.titulo.trim() || !form.fecha) {
      toast.error('El título y la fecha son obligatorios.');
      return;
    }
    setOcupado(true);
    try {
      const res = await fetch(`/api/agenda/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'editar',
          titulo: form.titulo.trim(),
          fecha: form.fecha,
          hora: form.hora || null,
          ministerio: form.ministerio === 'ninguno' ? null : form.ministerio,
          nota: form.nota.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No pudimos guardar');
      }
      toast.success('Evento actualizado.');
      setEditando(null);
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
      toast.success(
        accion === 'confirmar'
          ? `Confirmada. Le avisamos por correo a ${e.solicitante_nombre}.`
          : `Rechazada. Le avisamos por correo a ${e.solicitante_nombre}.`,
      );
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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Agenda
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          El calendario de la iglesia con las fechas de todos los ministerios.
          {puedeAutorizar && pendientes > 0 && (
            <> <span className="text-orange-600 dark:text-orange-400 font-medium">
              {pendientes} {pendientes === 1 ? 'solicitud espera' : 'solicitudes esperan'} tu respuesta.
            </span></>
          )}
        </p>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <CalendarioMes mes={mes} eventos={enCalendario} onCambiarMes={setMes} />

          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary/25 border border-primary/40" />
              Confirmada
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-orange-500/15 border border-dashed border-orange-500/60" />
              Por confirmar
            </span>
          </div>

          <section className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {FILTROS.map((f) => (
                <Button
                  key={f.valor}
                  size="sm"
                  variant={filtro === f.valor ? 'default' : 'outline'}
                  onClick={() => setFiltro(f.valor)}
                >
                  {f.label}
                  {f.valor === 'propuesta' && pendientes > 0 && (
                    <span className="ml-1.5 min-w-4 h-4 px-1 inline-flex items-center justify-center text-[10px] font-semibold rounded-full bg-orange-500 text-white leading-none">
                      {pendientes}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {listados.length === 0 ? (
              <Card>
                <CardContent className="py-14 text-center">
                  <CalendarClock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {filtro === 'propuesta'
                      ? 'No hay solicitudes esperando respuesta.'
                      : 'No hay fechas con ese filtro.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {listados.map((e) => <FilaEvento key={e.id} e={e} {...propsFila} />)}
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}

      {/* Edición — sólo para quienes confirman */}
      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar evento</DialogTitle>
            <DialogDescription>
              Quien lo solicitó no se puede cambiar: de ahí sale el correo de la respuesta.
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
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Select value={form.ministerio} onValueChange={(v) => setForm({ ...form, ministerio: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Sin ministerio</SelectItem>
                  {CULTO_TIPO_KEYS.map((t) => (
                    <SelectItem key={t} value={t}>{CULTO_TIPOS[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ag-nota">
                Nota <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="ag-nota"
                value={form.nota}
                maxLength={500}
                onChange={(ev) => setForm({ ...form, nota: ev.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={ocupado}>
              Cancelar
            </Button>
            <Button onClick={guardarEdicion} disabled={ocupado}>
              {ocupado && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Guardar
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
              Le llega por correo a {rechazando?.solicitante_nombre} con el motivo que escribas.
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
