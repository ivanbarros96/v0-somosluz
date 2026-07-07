import { Card } from '@/components/ui/card';
import { Church, Clock, MapPin, Wifi } from 'lucide-react';
import { AGENDA_SEMANAL, CULTO_GENERAL, UBICACION } from '@/lib/landing-content';

export function Schedule() {
  const cultoGeneral = AGENDA_SEMANAL.find((a) => a.destacado);
  const resto = AGENDA_SEMANAL.filter((a) => !a.destacado);

  return (
    <section id="horarios" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-center mb-4">
          Planea tu Visita
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto text-pretty">
          Nos reunimos cada semana para adorar, crecer y compartir. Te esperamos.
        </p>

        {/* Culto General — destacado */}
        {cultoGeneral && (
          <Card className="p-8 sm:p-10 mb-10 border-l-4 border-l-primary bg-gradient-to-r from-secondary/60 to-card">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 shrink-0">
                <Church className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  {cultoGeneral.tipo}
                </p>
                <h3 className="font-serif text-2xl sm:text-3xl font-semibold mb-2">
                  {cultoGeneral.nombre} ·{' '}
                  <span className="text-primary">
                    {cultoGeneral.dia}s {cultoGeneral.hora} hrs
                  </span>
                </h3>
                <p className="text-muted-foreground text-pretty">{CULTO_GENERAL.descripcion}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Agenda semanal */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {resto.map((act) => (
            <Card key={`${act.dia}-${act.hora}`} className="p-5 hover:shadow-md transition">
              <div className="flex items-center gap-2 text-primary mb-2">
                {act.online ? <Wifi className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                <span className="text-sm font-semibold">
                  {act.dia} · {act.hora} hrs
                </span>
              </div>
              <h3 className="font-semibold mb-1">{act.nombre}</h3>
              <p className="text-xs text-muted-foreground">
                {act.tipo}
                {act.online && ' · Online'}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <MapPin className="w-6 h-6 text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Ubicación:</span>{' '}
            {UBICACION.direccion ?? UBICACION.ciudad}
          </p>
        </div>
      </div>
    </section>
  );
}
