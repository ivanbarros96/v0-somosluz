import { FRASES_MARQUEE } from '@/lib/landing-content';

// Cinta de frases de identidad (bio y captions del Instagram de la iglesia)
export function Marquee() {
  const frases = [...FRASES_MARQUEE, ...FRASES_MARQUEE]; // duplicado para loop continuo

  return (
    <div
      aria-hidden
      className="overflow-hidden border-y border-border bg-secondary/40 py-3 select-none"
    >
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
        {frases.map((f, i) => (
          <span key={i} className="flex items-center gap-8 text-sm tracking-widest uppercase text-muted-foreground">
            {f}
            <span className="text-primary">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
