import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Instagram, Youtube } from 'lucide-react';
import { REDES } from '@/lib/landing-content';

export function Media() {
  return (
    <section id="predicaciones" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-card">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-center mb-4">
          Predicaciones y Contenido
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto text-pretty">
          Lleva la Palabra contigo durante la semana.
        </p>

        <div className="grid sm:grid-cols-3 gap-6">
          <Card className="p-8 text-center hover:shadow-lg transition sm:col-span-1">
            <Youtube className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Predicaciones</h3>
            <p className="text-sm text-muted-foreground mb-6 text-pretty">
              Mira los mensajes completos en nuestro canal de YouTube.
            </p>
            <a href={REDES.youtube} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                Ver en YouTube
              </Button>
            </a>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition">
            <Instagram className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Somos Luz Iglesia</h3>
            <p className="text-sm text-muted-foreground mb-6 text-pretty">
              Inspiración diaria, anuncios y lo que Dios está haciendo en nuestra comunidad.
            </p>
            <a href={REDES.instagramIglesia} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                @somosluz.iglesia
              </Button>
            </a>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition">
            <Instagram className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Somos Luz Youth</h3>
            <p className="text-sm text-muted-foreground mb-6 text-pretty">
              El corazón de la generación joven: eventos, retos y comunidad.
            </p>
            <a href={REDES.instagramYouth} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                @somosluz.youth
              </Button>
            </a>
          </Card>
        </div>
      </div>
    </section>
  );
}
