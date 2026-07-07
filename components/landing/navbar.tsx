'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

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
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-sm bg-background/95 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
          <Image
            src="/logo.png"
            alt="Somos Luz Iglesia"
            width={120}
            height={75}
            className="h-12 w-auto mix-blend-multiply"
            priority
          />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex gap-7 items-center">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm hover:text-primary transition">
              {l.label}
            </a>
          ))}
          <Link
            href="/intranet"
            className="text-sm font-medium text-primary hover:text-primary/80 transition"
          >
            Intranet
          </Link>
        </div>

        {/* Mobile — hamburguesa */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-secondary transition"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
              className="text-sm font-medium hover:text-primary transition py-2.5 border-b border-border"
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
