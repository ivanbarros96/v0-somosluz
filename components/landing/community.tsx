import Image from 'next/image';
import { Reveal } from './reveal';

// Franja fotográfica de comunidad — fotos reales de la congregación.
// 4 fotos, cada una con un rol distinto en vez de repetir registro:
// adoración (emoción) → liderazgo pastoral → comunidad (alegría) → ciudad
// (identidad de Valparaíso). Con 8 se sentía repetitivo; con 4 cada una pesa.
const FOTOS = [
  { src: '/comunidad/manos-alzadas.jpg',        alt: 'Manos alzadas en adoración durante el culto',        w: 825, h: 1100 },
  { src: '/comunidad/jonathan-predicando.jpg',  alt: 'Pastor Jonathan predicando en el culto de Somos Luz', w: 900, h: 1600 },
  { src: '/comunidad/familia-marco.jpg',        alt: 'La comunidad posando en el marco de fotos de la iglesia', w: 825, h: 1100 },
  { src: '/comunidad/comunidad-valparaiso.jpg', alt: 'Miembros de Somos Luz en las calles de Valparaíso',  w: 825, h: 1100 },
];

export function Community() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-14">
            <p className="font-script text-5xl text-primary mb-3">Somos familia</p>
            <p className="text-muted-foreground max-w-md mx-auto text-pretty">
              Vidas siendo transformadas, familias encontrando esperanza y una comunidad
              creciendo en amor y fe.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {FOTOS.map((f, i) => (
            <Reveal key={f.src} delay={i % 3 === 0 ? undefined : ((i % 3) as 1 | 2)}>
              <div
                className={`relative aspect-[3/4.6] rounded-2xl overflow-hidden shadow-md ${
                  i % 2 === 1 ? 'lg:translate-y-10' : ''
                }`}
              >
                <Image
                  src={f.src}
                  alt={f.alt}
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
