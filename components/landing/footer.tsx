import Image from 'next/image';
import Link from 'next/link';
import { SOBRE_NOSOTROS } from '@/lib/landing-content';

// Continúa el cierre oscuro de Contact.
export function Footer() {
  return (
    <footer className="bg-[oklch(0.23_0.015_60)] border-t border-[oklch(0.35_0.02_65)] py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto text-center">
        <Image
          src="/logo-cream.png"
          alt="Somos Luz Iglesia"
          width={1600}
          height={1036}
          loading="lazy"
          className="mx-auto w-44 sm:w-52 h-auto mb-6"
        />
        <p className="font-serif italic text-sm text-[oklch(0.78_0.03_85)] mb-8 text-balance max-w-xl mx-auto">
          “{SOBRE_NOSOTROS.versiculo}” — {SOBRE_NOSOTROS.cita}
        </p>
        <div className="flex items-center justify-center gap-6 text-xs text-[oklch(0.65_0.02_80)]">
          <p>© {new Date().getFullYear()} Somos Luz Iglesia · Valparaíso, Chile</p>
          <span aria-hidden className="w-px h-3 bg-[oklch(0.4_0.02_70)]" />
          <Link
            href="/intranet"
            className="hover:text-[oklch(0.85_0.03_85)] transition-colors focus-visible:outline-2 focus-visible:outline-[oklch(0.85_0.03_85)] rounded"
          >
            Intranet
          </Link>
        </div>
      </div>
    </footer>
  );
}
