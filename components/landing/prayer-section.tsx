'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { HandHeart } from 'lucide-react';
import { PAISES } from '@/lib/chile';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { FlagIcon } from '@/components/ui/flag-icon';

const inputCls =
  'w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

export function PrayerSection() {
  const [form, setForm] = useState({ nombre: '', peticion: '', codTel: '+56', telefono: '', sitioWeb: '', beneficiario: '' });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  // Muchas peticiones son POR OTRA PERSONA (una madre por su hijo, una hermana
  // por una amiga). Antes todo caía en un solo campo "nombre" y después no se
  // sabía a quién llamar para hacer seguimiento. Va oculto tras una casilla
  // para no agregarle un campo a quien pide por sí mismo, que es el caso común.
  const [paraOtro, setParaOtro] = useState(false);

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
          // Sólo viaja si la casilla está marcada: si alguien la marca, escribe
          // un nombre y luego se arrepiente, no debe quedar guardado igual.
          beneficiario: paraOtro ? form.beneficiario.trim() : '',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No pudimos enviar tu petición');
      }
      setEnviado(true);
      setForm({ nombre: '', peticion: '', codTel: '+56', telefono: '', sitioWeb: '', beneficiario: '' });
      setParaOtro(false);
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

              {/* Divulgación progresiva: la casilla no estorba a quien pide por
                  sí mismo, y quien pide por otro encuentra dónde decirlo. */}
              <div>
                <label className="flex min-h-11 items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={paraOtro}
                    onChange={(e) => setParaOtro(e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                  <span className="text-sm">La oración es por otra persona</span>
                </label>

                {paraOtro && (
                  <div className="mt-2">
                    <label htmlFor="oracion-beneficiario" className="block text-sm font-medium mb-2">
                      ¿Por quién oramos?
                    </label>
                    <input
                      id="oracion-beneficiario"
                      type="text"
                      name="beneficiario"
                      required
                      maxLength={100}
                      value={form.beneficiario}
                      onChange={(e) => setForm({ ...form, beneficiario: e.target.value })}
                      className={inputCls}
                      placeholder="Nombre de la persona…"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Tus datos siguen siendo los de contacto: te escribimos a ti para saber cómo va.
                    </p>
                  </div>
                )}
              </div>
              {/* El telefono va ANTES del email: el equipo respondio que prefiere
                  llamar o escribir por WhatsApp antes que mandar un correo, por
                  ser un medio mas cercano (reunion 24/08/2026). El orden de los
                  campos comunica cual esperan que se complete. */}
              <div>
                <label htmlFor="oracion-telefono" className="block text-sm font-medium mb-2">
                  Teléfono
                </label>
                {/* Mismo componente que el registro de miembros, no un <select>
                    nativo: el select del sistema ignoraba el ancho fijado por
                    CSS y empujaba el campo del numero fuera de la tarjeta. El
                    Select de shadcn renderiza HTML, asi que el layout se
                    respeta.
                    La bandera es un SVG propio (FlagIcon), no el emoji: en
                    Windows los emojis de bandera se degradan a texto ("CL")
                    porque el sistema no trae ese glifo. Un SVG se ve igual en
                    cualquier sistema operativo. */}
                <div className="flex gap-2">
                  <Select
                    value={form.codTel}
                    onValueChange={(v) => setForm({ ...form, codTel: v })}
                  >
                    <SelectTrigger
                      aria-label="Código de país"
                      className="w-24 shrink-0 h-[46px] rounded-lg border-input bg-background"
                    >
                      {/* Se pinta a mano en vez de <SelectValue>: ese
                          componente repite TODO el contenido del item
                          (bandera + codigo + nombre) y quedaba cortado. */}
                      <FlagIcon iso={PAISES.find((p) => p.code === form.codTel)?.iso ?? ''} className="h-3.5 w-5 rounded-[2px] shrink-0" />
                      <span className="tabular-nums">{form.codTel}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {PAISES.map((p) => (
                        <SelectItem key={p.code} value={p.code}>
                          <FlagIcon iso={p.iso} className="h-3.5 w-5 rounded-[2px] shrink-0" />
                          <span className="tabular-nums">{p.code}</span>
                          {/* Opacity, no text-muted-foreground: ese color queda
                              fijo sin importar el fondo. Al pasar el mouse o
                              navegar con teclado el item se resalta con
                              focus:bg-accent (oscuro), y el texto muted quedaba
                              casi del mismo tono que ese fondo — ilegible. La
                              opacidad se aplica sobre el color heredado
                              (currentColor), que sí cambia con el foco. */}
                          <span className="ml-1 opacity-70">{p.nombre}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    id="oracion-telefono"
                    type="tel"
                    name="telefono"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    maxLength={20}
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className={`${inputCls} min-w-0 flex-1`}
                    placeholder="9 1234 5678"
                  />
                </div>
              </div>
              {/* Sin campo de email: el equipo prioriza el teléfono como
                  medio de contacto (reunión 24/08/2026) y pidió sacarlo del
                  formulario. La columna `email` de la tabla sigue existiendo
                  por si se necesita más adelante — solo se dejó de pedir. */}
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
