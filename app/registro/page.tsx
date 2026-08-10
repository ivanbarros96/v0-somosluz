import type { Metadata } from 'next';
import { RegistroPublicoForm } from '@/components/registro/registro-publico-form';

// Página pública, pero fuera de buscadores: el link se comparte a mano.
// Ojo: esto solo evita que la indexen, no que alguien entre. La protección real
// es que todo lo que llega queda pendiente de aprobación (ver
// POST /api/registro-publico).
export const metadata: Metadata = {
  title: 'Regístrate · Somos Luz Iglesia',
  description: 'Déjanos tus datos para conocerte mejor.',
  robots: { index: false, follow: false },
};

export default function RegistroPublicoPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <RegistroPublicoForm />
      </div>
    </main>
  );
}
