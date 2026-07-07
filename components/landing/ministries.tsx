import { Card } from '@/components/ui/card';
import { BookOpen, Flame, Heart, Instagram, Shield, Sparkles } from 'lucide-react';
import { MINISTERIOS } from '@/lib/landing-content';

const ICONOS = {
  hombria: Shield,
  amadas: Heart,
  discipulado: BookOpen,
  youth: Flame,
  ninos: Sparkles,
} as const;

export function Ministries() {
  return (
    <section id="ministerios" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-card">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-center mb-4">
          Ministerios
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto text-pretty">
          Hay un lugar para ti, en cada etapa de la vida.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MINISTERIOS.map((m) => {
            const Icono = ICONOS[m.id as keyof typeof ICONOS] ?? Sparkles;
            return (
              <Card key={m.id} className="p-6 flex flex-col hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 shrink-0">
                    <Icono className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{m.nombre}</h3>
                    <p className="text-xs text-primary font-medium">{m.horario}</p>
                  </div>
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  {m.publico}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty flex-1">
                  {m.descripcion}
                </p>
                {m.instagram && (
                  <a
                    href={m.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium mt-4"
                  >
                    <Instagram className="w-4 h-4" />
                    @somosluz.youth
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
