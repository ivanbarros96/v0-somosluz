'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

const inputCls =
  'w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export function PrayerSection() {
  const [form, setForm] = useState({ nombre: '', email: '', peticion: '', telefono: '' });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch('/api/oracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No pudimos enviar tu petición');
      }
      setEnviado(true);
      setForm({ nombre: '', email: '', peticion: '', telefono: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos enviar tu petición. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section id="oracion" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-center mb-3">
          Envíanos tu Petición de Oración
        </h2>
        <p className="text-center text-muted-foreground mb-10 text-pretty">
          Queremos orar contigo y por ti. Comparte tu necesidad y nuestro equipo pastoral se unirá
          en oración.
        </p>

        {enviado ? (
          <div className="bg-secondary/60 border border-border rounded-lg p-8 text-center">
            <p className="font-serif italic text-xl text-primary mb-2">¡Gracias por tu petición!</p>
            <p className="text-muted-foreground text-sm">
              Nos uniremos en oración por ti. Que Dios te bendiga.
            </p>
            <Button variant="link" className="mt-3 text-primary" onClick={() => setEnviado(false)}>
              Enviar otra petición
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="oracion-nombre" className="block text-sm font-medium mb-2">
                Tu nombre
              </label>
              <input
                id="oracion-nombre"
                type="text"
                required
                maxLength={100}
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputCls}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label htmlFor="oracion-email" className="block text-sm font-medium mb-2">
                Email (opcional)
              </label>
              <input
                id="oracion-email"
                type="email"
                maxLength={200}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
                placeholder="tu@email.com"
              />
            </div>
            {/* Honeypot antispam: invisible para humanos, los bots lo rellenan */}
            <input
              type="text"
              name="telefono"
              tabIndex={-1}
              autoComplete="off"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
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
                placeholder="Cuéntanos por qué podemos orar..."
              />
            </div>
            <Button
              type="submit"
              disabled={enviando}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {enviando ? 'Enviando...' : 'Enviar Petición'}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
