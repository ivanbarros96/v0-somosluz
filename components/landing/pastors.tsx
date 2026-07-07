import Image from 'next/image';
import { PASTORES } from '@/lib/landing-content';

export function Pastors() {
  return (
    <section id="pastores" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="relative aspect-[3/4] max-w-md mx-auto w-full rounded-2xl overflow-hidden shadow-lg">
          <Image
            src={PASTORES.foto}
            alt={`Pastores ${PASTORES.nombres}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
          />
        </div>
        <div className="text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
            {PASTORES.titulo}
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold mb-6 text-balance">
            {PASTORES.nombres}
          </h2>
          <p className="text-muted-foreground leading-relaxed text-pretty">{PASTORES.bio}</p>
        </div>
      </div>
    </section>
  );
}
