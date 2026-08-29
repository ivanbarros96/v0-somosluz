'use client';

// Formulario ABIERTO para pedir una fecha en la agenda. No pide sesión.
//
// Vive fuera de /intranet/dashboard a propósito: el middleware sólo protege esa
// carpeta, así que acá no hace falta login. Es la ÚNICA vía para pedir una
// fecha —también para quienes tienen cuenta— porque varios líderes de
// ministerio no tienen acceso a la intranet y eran justamente los que
// necesitaban coordinar (decisión de Iván, 29/08/2026).
//
// La agenda armada NO se muestra acá: eso sigue siendo privado. Desde afuera
// sólo se pide; ver y confirmar es de adentro.

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CULTO_TIPOS, CULTO_TIPO_KEYS } from '@/lib/cultos-tipos';
import { CalendarCheck, Loader2, ChevronLeft } from 'lucide-react';
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

export default function SolicitarFechaPage() {
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const set = (campo: keyof typeof FORM_VACIO, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Image
            src="/logo-trans.png"
            alt="Somos Luz"
            width={180}
            height={117}
            className="mx-auto mb-3 h-16 w-auto"
          />
          <p className="text-muted-foreground text-sm">Pedir una fecha en la agenda</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 sm:p-8">
          {enviado ? (
            <div className="text-center py-6" aria-live="polite">
              <CalendarCheck className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
              <p className="font-semibold text-lg text-foreground mb-2">¡Solicitud enviada!</p>
              <p className="text-muted-foreground text-sm">
                Queda tentativa hasta que la revisen. Te avisamos por correo cuando esté resuelta.
              </p>
              <Button variant="link" className="mt-3 text-primary" onClick={() => setEnviado(false)}>
                Pedir otra fecha
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Cuéntanos qué quieres agendar y lo revisamos para que no choque con otra reunión.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="sf-nombre">Tu nombre</Label>
                <Input
                  id="sf-nombre"
                  name="nombre"
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
                  name="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                  value={form.solicitante_email}
                  onChange={(e) => set('solicitante_email', e.target.value)}
                  placeholder="tu@correo.com"
                />
                <p className="text-xs text-muted-foreground">
                  Es a donde te avisamos si la fecha queda confirmada o no.
                </p>
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

              {/* Apilados en móvil: lado a lado, el campo de fecha se estrecha
                  tanto que el navegador corta el formato ("dd/mm/aaa") y el
                  ícono del calendario se le encima. */}
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
                  placeholder="Cualquier cosa que ayude a decidir: dónde, cuánta gente, si necesitas el salón…"
                />
              </div>

              {/* Honeypot antispam: invisible para las personas, los bots lo
                  rellenan. Se llama `sitio_web` y no el nombre de un campo real
                  — ese error ya lo cometimos en el formulario de oración, donde
                  el honeypot se llamaba `telefono` y descartaba en silencio
                  toda petición que trajera un número. */}
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

              <Button type="submit" disabled={enviando} className="w-full h-11">
                {enviando ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando…
                  </span>
                ) : 'Enviar solicitud'}
              </Button>
            </form>
          )}
        </div>

        <div className="text-center mt-8">
          <a
            href="/intranet"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver al acceso
          </a>
        </div>
      </div>
    </div>
  );
}
