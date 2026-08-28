'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { HandHeart } from 'lucide-react';
import { PAISES } from '@/lib/chile';

const inputCls =
  'w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

export function PrayerSection() {
  const [form, setForm] = useState({ nombre: '', email: '', peticion: '', codTel: '+56', telefono: '', sitioWeb: '' });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch('/api/oracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El telefono viaja ya armado con su codigo de pais, igual que en el
        // registro de miembros: asi todos quedan guardados en el mismo formato
        // y el enlace a WhatsApp del panel funciona siempre.
        body: JSON.stringify({
          ...form,
          telefono: form.telefono.trim() ? `${form.codTel} ${form.telefono.trim()}` : '',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No pudimos enviar tu petición');
      }
      setEnviado(true);
      setForm({ nombre: '', email: '', peticion: '', codTel: '+56', telefono: '', sitioWeb: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos enviar tu petición. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section
      id="oracion"
      className="relative overflow-hidden py-20 sm:py-32 px-4 sm:px-6 lg:px-8"
    >
      {/* Luz cálida de fondo */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_100%,oklch(0.9_0.05_85/.4),transparent_65%)] pointer-events-none"
      />

      <div className="relative max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-script text-4xl text-primary mb-3">Queremos orar contigo</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-balance">
            Envíanos tu petición de oración
          </h2>
          <p className="mt-5 text-muted-foreground text-pretty max-w-md mx-auto">
            Comparte tu necesidad y nuestro equipo pastoral se unirá en oración por ti.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 sm:p-10">
          {enviado ? (
            <div className="text-center py-6" aria-live="polite">
              <HandHeart className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden="true" />
              <p className="font-serif italic text-2xl text-primary mb-2">¡Gracias por tu petición!</p>
              <p className="text-muted-foreground text-sm">
                Nos uniremos en oración por ti. Que Dios te bendiga.
              </p>
              <Button variant="link" className="mt-3 text-primary" onClick={() => setEnviado(false)}>
                Enviar otra petición
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="oracion-nombre" className="block text-sm font-medium mb-2">
                  Tu nombre
                </label>
                <input
                  id="oracion-nombre"
                  type="text"
                  name="nombre"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={inputCls}
                  placeholder="Tu nombre…"
                />
              </div>
              {/* El telefono va ANTES del email: el equipo respondio que prefiere
                  llamar o escribir por WhatsApp antes que mandar un correo, por
                  ser un medio mas cercano (reunion 24/08/2026). El orden de los
                  campos comunica cual esperan que se complete. */}
              <div>
                <label htmlFor="oracion-telefono" className="block text-sm font-medium mb-2">
                  Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                {/* Codigo de pais aparte, mismo patron que el registro de
                    miembros. Con un campo libre cada quien escribia el prefijo a
                    su manera (o lo omitia), y el enlace a WhatsApp del panel
                    necesita el numero COMPLETO para funcionar. */}
                <div className="flex gap-2">
                  <select
                    aria-label="Código de país"
                    value={form.codTel}
                    onChange={(e) => setForm({ ...form, codTel: e.target.value })}
                    className={`${inputCls} w-28 shrink-0`}
                  >
                    {PAISES.map((p) => (
                      <option key={p.code} value={p.code}>{p.flag} {p.code}</option>
                    ))}
                  </select>
                  <input
                    id="oracion-telefono"
                    type="tel"
                    name="telefono"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={20}
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className={inputCls}
                    placeholder="9 1234 5678"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="oracion-email" className="block text-sm font-medium mb-2">
                  Email <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  id="oracion-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={200}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="tu@email.com"
                />
              </div>
              {/* Honeypot antispam: invisible para humanos, los bots lo rellenan.
                  Se llamaba `telefono`, pero ese nombre ahora es un campo REAL
                  y visible: de no renombrarlo, cada persona que escribiera su
                  numero habria visto "enviado" mientras el servidor descartaba
                  su peticion por creerla un bot. */}
              <input
                type="text"
                name="sitio_web"
                tabIndex={-1}
                autoComplete="off"
                value={form.sitioWeb}
                onChange={(e) => setForm({ ...form, sitioWeb: e.target.value })}
                className="hidden"
                aria-hidden="true"
              />
              <div>
                <label htmlFor="oracion-texto" className="block text-sm font-medium mb-2">
                  Tu petición de oración
                </label>
                <textarea
                  id="oracion-texto"
                  required
                  maxLength={2000}
                  value={form.peticion}
                  onChange={(e) => setForm({ ...form, peticion: e.target.value })}
                  className={`${inputCls} min-h-28`}
                  placeholder="Cuéntanos por qué podemos orar…"
                />
              </div>
              <Button
                type="submit"
                disabled={enviando}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-base"
              >
                {enviando ? 'Enviando…' : 'Enviar petición'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
