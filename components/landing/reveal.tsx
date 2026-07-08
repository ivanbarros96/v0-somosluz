'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Revela contenido al entrar al viewport agregando .in-view (ver globals.css).
// Con prefers-reduced-motion el CSS lo desactiva y el contenido es visible siempre.
export function Reveal({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: 1 | 2 | 3;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view');
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('reveal', delay && `reveal-delay-${delay}`, className)}>
      {children}
    </div>
  );
}
