'use client';

// Botón flotante de WhatsApp.
//
// Decisiones de diseño (análisis del 31/08/2026):
//  · Va en COLOR DE MARCA (salvia), no en el verde oficial de WhatsApp: ese
//    verde choca de frente con la paleta mocha/crema del sitio. El ícono ya lo
//    hace reconocible.
//  · Aparece recién PASADO EL HERO. Arriba compite con "Quiero visitar", que es
//    la acción principal que la iglesia quiere.
//  · Abajo a la derecha, 56px (sobre el mínimo de 44) y con aria-label, porque
//    es un botón de solo ícono.
//  · Respeta prefers-reduced-motion.

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { WHATSAPP_URL } from '@/lib/landing-content';

export function WhatsappFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Umbral: 70% del alto de pantalla ≈ ya pasó el hero.
    const alUmbral = () => setVisible(window.scrollY > window.innerHeight * 0.7);
    alUmbral();
    window.addEventListener('scroll', alUmbral, { passive: true });
    return () => window.removeEventListener('scroll', alUmbral);
  }, []);

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      title="Escríbenos por WhatsApp"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`
        fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center
        rounded-full bg-primary text-primary-foreground shadow-lg
        transition-[opacity,transform] duration-300 ease-out
        hover:bg-primary/90 hover:scale-105
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        motion-reduce:transition-none motion-reduce:hover:scale-100
        ${visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-3'}
      `}
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
