'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, Instagram, MessageCircle } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const [prayerForm, setPrayerForm] = useState({ name: '', email: '', prayer: '' });
  const [submitted, setSubmitted] = useState(false);

  const handlePrayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setPrayerForm({ name: '', email: '', prayer: '' });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm bg-background/95 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Somos Luz"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          <div className="hidden md:flex gap-8">
            <a href="#about" className="text-sm hover:text-primary transition">Sobre Nosotros</a>
            <a href="#schedule" className="text-sm hover:text-primary transition">Horarios</a>
            <a href="#prayer" className="text-sm hover:text-primary transition">Oración</a>
            <a href="#contact" className="text-sm hover:text-primary transition">Contacto</a>
            <Link
              href="/intranet"
              className="text-sm hover:text-primary transition font-medium"
            >
              Intranet
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Bienvenido a
            <span className="block text-primary italic font-light mt-2" style={{ fontFamily: 'serif' }}>
              Somos Luz
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Una comunidad que busca ser luz en la oscuridad, reflejando el amor de Dios en cada acción.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://www.instagram.com/somosluz.iglesia/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Instagram className="w-5 h-5 mr-2" />
                Síguenos en Instagram
              </Button>
            </a>
            <a href="https://wa.me/?text=Hola%20Somos%20Luz" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <MessageCircle className="w-5 h-5 mr-2" />
                Contacta por WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section id="schedule" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-foreground">
            Nuestros Horarios
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 border-l-4 border-l-primary hover:shadow-lg transition">
              <div className="flex items-start gap-4">
                <Clock className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Servicio Dominical</h3>
                  <p className="text-muted-foreground text-lg mb-4">
                    Cada <span className="font-semibold text-primary">domingo</span> a las <span className="font-bold text-primary">11:00 AM</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Celebremos juntos el amor y la gracia de Dios
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-l-4 border-l-accent hover:shadow-lg transition">
              <div className="flex items-start gap-4">
                <Clock className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Casa Iglesia</h3>
                  <p className="text-muted-foreground text-lg mb-4">
                    Cada <span className="font-semibold text-accent">jueves</span> a las <span className="font-bold text-accent">8:00 PM</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reunión de grupos pequeños para comunión y estudio de la Palabra
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <MapPin className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">Ubicación:</span> Valparaiso, Chile
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-foreground">
            Sobre Nosotros
          </h2>
          <div className="space-y-6 text-muted-foreground leading-relaxed text-lg">
            <p>
              En <span className="font-semibold text-primary">Somos Luz Iglesia</span>, creemos que la fe es un viaje compartido. Somos una comunidad de creyentes comprometidos a vivir el Evangelio de manera auténtica y transformadora.
            </p>
            <p>
              Nuestra visión es ser luz en las vidas de las personas, reflejando el amor incondicional de Cristo a través de nuestras acciones, palabras y servicio comunitario. Creemos que cada persona tiene un propósito divino y estamos aquí para acompañarte en tu caminar de fe.
            </p>
            <p>
              Nos reúnimos para adorar, estudiar la Palabra de Dios, orar juntos y servir a nuestra comunidad. Cualquiera que sea tu trasfondo o tu historia, te invitamos a ser parte de nuestra familia espiritual.
            </p>
            <p className="pt-4 border-t border-border">
              <span className="text-primary font-semibold italic">"Ustedes son la luz del mundo. Una ciudad en lo alto de una colina no puede esconderse."</span> - Mateo 5:14
            </p>
          </div>
        </div>
      </section>

      {/* Prayer Section */}
      <section id="prayer" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3 text-foreground">
            Envíanos tu Petición de Oración
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            Queremos orar contigo y por ti. Comparte tus necesidades y nos uniremos en oración.
          </p>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-800 font-semibold">¡Gracias por tu petición!</p>
              <p className="text-green-700 text-sm mt-2">
                Nos uniremos en oración por ti. ¡Que Dios te bendiga!
              </p>
            </div>
          ) : (
            <form onSubmit={handlePrayerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Tu Nombre</label>
                <input
                  type="text"
                  required
                  value={prayerForm.name}
                  onChange={(e) => setPrayerForm({ ...prayerForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Email (opcional)</label>
                <input
                  type="email"
                  value={prayerForm.email}
                  onChange={(e) => setPrayerForm({ ...prayerForm, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Tu Petición de Oración</label>
                <textarea
                  required
                  value={prayerForm.prayer}
                  onChange={(e) => setPrayerForm({ ...prayerForm, prayer: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
                  placeholder="Cuéntanos qué necesita oración..."
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2"
              >
                Enviar Petición
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-foreground">
            Conecta con Nosotros
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Instagram className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2 text-foreground">Instagram</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Siguenos para inspiracion diaria y actualizaciones
              </p>
              <a
                href="https://www.instagram.com/somosluz.iglesia/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-primary hover:underline text-sm font-semibold"
              >
                @somosluz.iglesia
              </a>
            </div>

            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-accent mx-auto mb-4" />
              <h3 className="font-semibold mb-2 text-foreground">WhatsApp</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Contactanos por mensajes directos
              </p>
              <a
                href="https://wa.me/?text=Hola%20Somos%20Luz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-accent hover:underline text-sm font-semibold"
              >
                Enviar mensaje
              </a>
            </div>

            <div className="text-center">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2 text-foreground">Ubicacion</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Valparaiso, Chile
              </p>
              <p className="text-sm font-semibold text-foreground">
                Ven a visitarnos!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground text-sm">
          <p className="mb-2">
            © 2026 Somos Luz Iglesia. Todos los derechos reservados.
          </p>
          <p className="text-xs">
            Hecho con amor por creyentes apasionados
          </p>
        </div>
      </footer>

    </div>
  );
}
