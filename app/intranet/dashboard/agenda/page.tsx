'use client';

// Agenda dentro del panel. Muestra el MISMO calendario que la pantalla pública
// (componente compartido) y, debajo, las solicitudes.
//
// Este panel es SOLO para los tres perfiles que aprueban (Secretaría, Pastor,
// Co-pastor). Acá NO se pide una fecha ni se edita: sólo se ve el detalle y se
// aprueba o rechaza. Pedir una fecha se hace desde /intranet/calendario, que es
// abierto porque varios líderes de ministerio no tienen cuenta.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { puedeAutorizarAgenda } from '@/lib/roles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarioMes, hoyEnChile, mesDeHoy, fechaLegible, soloHora, etiquetaMinisterio,
  type EstadoEvento,
} from '@/components/agenda/calendario-mes';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Loader2, Check, X, Clock, Eye, CalendarClock, Mail, User,
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

// Fila compacta: lo justo para reconocer la solicitud de un vistazo. Todo el
// resto (quién la pidió, su correo, la nota) vive detrás del ojito, para que la
// lista de pendientes se recorra rápido sin ruido.
function FilaEvento({
  e, puedeAutorizar, onVer, onConfirmar, onRechazar, ocupado,
}: {
  e: Evento;
  puedeAutorizar: boolean;
  onVer: (e: Evento) => void;
  onConfirmar: (e: Evento) => void;
  onRechazar: (e: Evento) => void;
  ocupado: boolean;
}) {
  const hora = soloHora(e.hora);
  const ministerio = etiquetaMinisterio(e.ministerio);

  return (
    <div className="px-4 md:px-5 py-3.5 space-y-3">
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
        </div>

        <Button
          variant="ghost" size="icon" title="Ver detalle"
          aria-label={`Ver el detalle de ${e.titulo}`}
          onClick={() => onVer(e)} disabled={ocupado}
          className="shrink-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
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

  // Detalle (el ojito) y rechazo con motivo. No hay edición ni borrado: la
  // solicitud llega tal cual la escribió quien la mandó y sólo se aprueba o
  // rechaza (decisión de Iván, 30/08/2026).
  const [viendo, setViendo] = useState<Evento | null>(null);
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
      setViendo(null);
      setMotivo('');
      await cargar();
    } catch {
      toast.error('No pudimos actualizar el evento.');
    } finally {
      setOcupado(false);
    }
  }

  const propsFila = {
    puedeAutorizar,
    onVer: (e: Evento) => setViendo(e),
    onConfirmar: (e: Evento) => resolver(e, 'confirmar'),
    onRechazar: (e: Evento) => { setRechazando(e); setMotivo(''); },
    ocupado,
  };

  const vHora = viendo ? soloHora(viendo.hora) : null;
  const vMin = viendo ? etiquetaMinisterio(viendo.ministerio) : null;

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

      {/* Detalle de una solicitud (el ojito). Sólo lectura. */}
      <Dialog open={!!viendo} onOpenChange={(o) => !o && setViendo(null)}>
        <DialogContent className="sm:max-w-lg">
          {viendo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {viendo.titulo}
                  <Badge variant="outline" className={cn('text-[10px]', ESTADO_STYLE[viendo.estado])}>
                    {ESTADO_LABEL[viendo.estado]}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Detalle de la solicitud de fecha
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">{fechaLegible(viendo.fecha, true)}</span>
                  {vHora && (
                    <>
                      <span aria-hidden>·</span>
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="text-foreground tabular-nums">{vHora} hrs</span>
                    </>
                  )}
                </div>

                {vMin && (
                  <div className="text-muted-foreground">
                    Ministerio: <span className="text-foreground">{vMin}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  Lo solicita <span className="text-foreground">{viendo.solicitante_nombre}</span>
                </div>

                {viendo.solicitante_email && (
                  <a
                    href={`mailto:${viendo.solicitante_email}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    {viendo.solicitante_email}
                  </a>
                )}

                {viendo.nota && (
                  <div className="rounded-lg bg-muted/50 p-3 text-foreground whitespace-pre-wrap">
                    {viendo.nota}
                  </div>
                )}

                {viendo.estado === 'rechazada' && viendo.motivo_rechazo && (
                  <div className="rounded-lg border border-border p-3">
                    <span className="font-medium text-foreground">Motivo del rechazo:</span>{' '}
                    <span className="text-muted-foreground">{viendo.motivo_rechazo}</span>
                  </div>
                )}
              </div>

              {puedeAutorizar && viendo.estado === 'propuesta' && (
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setRechazando(viendo); setMotivo(''); }}
                    disabled={ocupado}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Rechazar
                  </Button>
                  <Button onClick={() => resolver(viendo, 'confirmar')} disabled={ocupado}>
                    {ocupado ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                    Confirmar
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Rechazo con motivo */}
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
