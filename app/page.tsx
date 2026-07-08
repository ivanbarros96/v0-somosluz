import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { Marquee } from '@/components/landing/marquee';
import { About } from '@/components/landing/about';
import { Schedule } from '@/components/landing/schedule';
import { Ministries } from '@/components/landing/ministries';
import { Pastors } from '@/components/landing/pastors';
import { Media } from '@/components/landing/media';
import { PrayerSection } from '@/components/landing/prayer-section';
import { Contact } from '@/components/landing/contact';
import { Footer } from '@/components/landing/footer';

// Ritmo visual: luz sobre oscuro → crema editorial → salvia profundo → cierre oscuro.
export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip link para navegación por teclado */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido">
        <Hero />
        <Marquee />
        <About />
        <Pastors />
        <Schedule />
        <Ministries />
        <Media />
        <PrayerSection />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
