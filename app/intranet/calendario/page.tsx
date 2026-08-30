'use client';

// Calendario ABIERTO de la iglesia. No pide sesión.
//
// Vive fuera de /intranet/dashboard a propósito: el middleware sólo protege esa
// carpeta. Varios líderes de ministerio no tienen cuenta y son justamente los
// que necesitan coordinar, así que tanto VER el calendario como PEDIR una fecha
// tienen que funcionar sin login (decisión de Iván, 29/08/2026).
//
// Acá sólo se ve lo CONFIRMADO: las solicitudes esperando respuesta y los
// motivos de rechazo son conversación interna (ver api/agenda/publica).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CULTO_TIPOS, CULTO_TIPO_KEYS } from '@/lib/cultos-tipos';
import {
  CalendarioMes, hoyEnChile, mesDeHoy, fechaLegible, soloHora, etiquetaMinisterio,
  type EventoCalendario,
} from '@/components/agenda/calendario-mes';
import { CalendarCheck, Loader2, ChevronLeft, Plus, Clock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

const FORM_VACIO = {
  solicitante_nombre: '',
  solicitante_email: '',
  titulo: '',
  fecha: '',
  hora: '',
  ministerio: 'ninguno',
  nota: '',
  sitio_web: '', // honeypot
};

export default function CalendarioPublicoPage() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState(mesDeHoy());

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const set = (campo: keyof typeof FORM_VACIO, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/agenda/publica');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEventos(data.eventos ?? []);
    } catch {
      toast.error('No pudimos cargar el calendario.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const hoy = hoyEnChile();
  const proximos = useMemo(
    () => eventos.filter((e) => e.fecha >= hoy).slice(0, 8),
    [eventos, hoy],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hora: form.hora || null,
          ministerio: form.ministerio === 'ninguno' ? null : form.ministerio,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No pudimos enviar tu solicitud');
      }
      setEnviado(true);
      setForm(FORM_VACIO);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos enviar tu solicitud.');
    } finally {
      setEnviando(false);
    }
  }

  function cerrarDialogo() {
    setDialogoAbierto(false);
    // Se limpia después de la animación de cierre para que no parpadee.
    setTimeout(() => setEnviado(false), 200);
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Image
            src="/logo-trans.png"
            alt="Somos Luz"
            width={180}
            height={117}
            className="mx-auto mb-3 h-14 w-auto"
          />
          <h1 className="text-xl font-semibold text-foreground">Calendario de la iglesia</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Las fechas ya confirmadas de todos los ministerios.
          </p>
        </div>

        <div className="flex justify-center mb-5">
          <Button onClick={() => setDialogoAbierto(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Pedir una fecha
          </Button>
        </div>

        {cargando ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <CalendarioMes mes={mes} eventos={eventos} onCambiarMes={setMes} />

            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Próximos
              </h2>
              {proximos.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-10 text-center">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No hay fechas confirmadas por ahora.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  {proximos.map((e) => {
                    const hora = soloHora(e.hora);
                    const min = etiquetaMinisterio(e.ministerio);
                    return (
                      <div key={e.id} className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{e.titulo}</span>
                          {min && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {min}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
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
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        <div className="text-center mt-10">
          <a
            href="/intranet"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver al acceso
          </a>
        </div>
      </div>

      {/* Pedir una fecha */}
      <Dialog open={dialogoAbierto} onOpenChange={(o) => (o ? setDialogoAbierto(true) : cerrarDialogo())}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {enviado ? (
            <div className="text-center py-6" aria-live="polite">
              <CalendarCheck className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
              <p className="font-semibold text-lg text-foreground mb-2">¡Solicitud enviada!</p>
              <p className="text-muted-foreground text-sm">
                Queda pendiente hasta que la revisen. Te avisamos por correo cuando esté resuelta,
                y si no se puede te decimos por qué.
              </p>
              <Button variant="outline" className="mt-4" onClick={cerrarDialogo}>
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Pedir una fecha</DialogTitle>
                <DialogDescription>
                  La revisamos para que no choque con otra reunión y te avisamos por correo.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sf-nombre">Tu nombre</Label>
                    <Input
                      id="sf-nombre"
                      autoComplete="name"
                      required
                      maxLength={100}
                      value={form.solicitante_nombre}
                      onChange={(e) => set('solicitante_nombre', e.target.value)}
                      placeholder="Tu nombre…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sf-email">Tu correo</Label>
                    <Input
                      id="sf-email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={200}
                      value={form.solicitante_email}
                      onChange={(e) => set('solicitante_email', e.target.value)}
                      placeholder="tu@correo.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sf-titulo">¿Qué quieres agendar?</Label>
                  <Input
                    id="sf-titulo"
                    required
                    maxLength={120}
                    value={form.titulo}
                    onChange={(e) => set('titulo', e.target.value)}
                    placeholder="Ej: Vigilia de jóvenes"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sf-fecha">Fecha</Label>
                    <Input
                      id="sf-fecha"
                      type="date"
                      required
                      value={form.fecha}
                      onChange={(e) => set('fecha', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sf-hora">
                      Hora <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                    </Label>
                    <Input
                      id="sf-hora"
                      type="time"
                      value={form.hora}
                      onChange={(e) => set('hora', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Ministerio <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                  </Label>
                  <Select value={form.ministerio} onValueChange={(v) => set('ministerio', v)}>
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
                  <Label htmlFor="sf-nota">
                    Detalles <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                  </Label>
                  <Textarea
                    id="sf-nota"
                    maxLength={500}
                    value={form.nota}
                    onChange={(e) => set('nota', e.target.value)}
                    placeholder="Dónde, cuánta gente, si necesitas el salón…"
                  />
                </div>

                {/* Honeypot antispam: invisible para las personas, los bots lo
                    rellenan. Se llama `sitio_web` y no el nombre de un campo
                    real — ese error ya lo cometimos en el formulario de
                    oración, donde el honeypot se llamaba `telefono` y
                    descartaba en silencio toda petición con número. */}
                <input
                  type="text"
                  name="sitio_web"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.sitio_web}
                  onChange={(e) => set('sitio_web', e.target.value)}
                  className="hidden"
                  aria-hidden="true"
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={cerrarDialogo} disabled={enviando}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={enviando}>
                    {enviando && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    Enviar solicitud
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
