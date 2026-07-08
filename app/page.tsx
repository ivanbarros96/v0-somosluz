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
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Schedule />
        <Ministries />
        <Pastors />
        <Media />
        <PrayerSection />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
