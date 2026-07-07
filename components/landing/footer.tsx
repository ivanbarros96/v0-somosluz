import Image from 'next/image';
import { SOBRE_NOSOTROS } from '@/lib/landing-content';

export function Footer() {
  return (
    <footer className="border-t border-border py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto text-center">
        <Image
          src="/logo.png"
          alt="Somos Luz Iglesia"
          width={100}
          height={62}
          className="h-10 w-auto mx-auto mb-4 mix-blend-multiply"
        />
        <p className="font-serif italic text-sm text-muted-foreground mb-4 text-balance">
          “{SOBRE_NOSOTROS.versiculo}” — {SOBRE_NOSOTROS.cita}
        </p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Somos Luz Iglesia · Valparaíso, Chile
        </p>
      </div>
    </footer>
  );
}
