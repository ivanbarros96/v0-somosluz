'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#nosotros', label: 'Nosotros' },
  { href: '#horarios', label: 'Horarios' },
  { href: '#ministerios', label: 'Ministerios' },
  { href: '#pastores', label: 'Pastores' },
  { href: '#oracion', label: 'Oración' },
  { href: '#contacto', label: 'Contacto' },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sobre el hero oscuro: texto crema. Con scroll: fondo crema, texto de marca.
  const solid = scrolled || menuOpen;

  return (
    <nav
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-colors duration-300',
        solid
          ? 'bg-background/92 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link href="/" onClick={closeMenu} className="flex items-center" aria-label="Somos Luz Iglesia — inicio">
          {/* Logo real: versión mocha sobre claro, crema sobre el hero oscuro */}
          <Image
            src={solid ? '/logo-trans.png' : '/logo-cream.png'}
            alt="Somos Luz Iglesia"
            width={1600}
            height={1036}
            priority
            className="h-12 w-auto"
          />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex gap-7 items-center">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                'text-sm transition-colors',
                solid
                  ? 'text-foreground/80 hover:text-primary'
                  : 'text-[oklch(0.88_0.01_85)] hover:text-[oklch(1_0_0)]',
              )}
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/intranet"
            className={cn(
              'text-sm font-medium px-4 py-1.5 rounded-full border transition-colors',
              solid
                ? 'border-primary/40 text-primary hover:bg-primary/10'
                : 'border-[oklch(0.85_0.02_85_/_0.4)] text-[oklch(0.92_0.01_85)] hover:bg-[oklch(0.92_0.01_85_/_0.12)]',
            )}
          >
            Intranet
          </Link>
        </div>

        {/* Mobile — hamburguesa */}
        <button
          className={cn(
            'md:hidden p-2 rounded-md transition-colors',
            solid
              ? 'text-foreground hover:bg-secondary'
              : 'text-[oklch(0.95_0.01_85)] hover:bg-[oklch(0.92_0.01_85_/_0.12)]',
          )}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu desplegable */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={closeMenu}
              className="text-sm font-medium hover:text-primary transition-colors py-2.5 border-b border-border"
            >
              {l.label}
            </a>
          ))}
          <Link href="/intranet" onClick={closeMenu} className="text-sm font-semibold text-primary py-2.5">
            Intranet
          </Link>
        </div>
      )}
    </nav>
  );
}
