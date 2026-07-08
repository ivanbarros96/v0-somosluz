import Image from 'next/image';
import { PASTORES } from '@/lib/landing-content';
import { Reveal } from './reveal';

export function Pastors() {
  return (
    <section id="pastores" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-card border-y border-border overflow-hidden">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Foto con marco offset de marca */}
        <Reveal>
          <div className="relative max-w-md mx-auto w-full">
            <div
              aria-hidden
              className="absolute -inset-3 translate-x-5 translate-y-5 rounded-2xl border-2 border-primary/40"
            />
            <div
              aria-hidden
              className="absolute -inset-3 -translate-x-2 -translate-y-2 rounded-2xl bg-primary/10"
            />
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src={PASTORES.foto}
                alt={`Pastores ${PASTORES.nombres}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <div className="text-center md:text-left">
            <p className="font-script text-4xl text-primary mb-2">Nuestros pastores</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-balance leading-tight">
              {PASTORES.nombres}
            </h2>
            <p className="mt-7 text-muted-foreground leading-relaxed text-pretty">
              {PASTORES.bio}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
