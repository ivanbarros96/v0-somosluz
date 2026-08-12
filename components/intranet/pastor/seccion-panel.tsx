'use client';

import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Encabezado de una sección del panel del Pastor.
 *
 * Los títulos son EXACTAMENTE los grupos del menú izquierdo
 * (dashboard-sidebar.tsx). Esa es la idea: el home da el titular de cada
 * grupo y el menú lleva al detalle, así el pastor aprende una sola
 * organización y la reconoce en ambos lados.
 * Si se agrega o renombra un grupo en el menú, hay que reflejarlo acá.
 */
export function SeccionPanel({
  titulo, descripcion, href, hrefLabel, children,
}: {
  titulo: string;
  descripcion: string;
  /** Pantalla del menú donde está el detalle de esta sección. */
  href: string;
  hrefLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {titulo}
          </h2>
          <p className="mt-0.5 text-sm text-foreground">{descripcion}</p>
        </div>
        <a
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {hrefLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
      {children}
    </section>
  );
}
