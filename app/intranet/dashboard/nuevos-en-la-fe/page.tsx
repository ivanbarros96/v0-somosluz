'use client';

import { useEffect, useState } from 'react';
import { Sprout, Loader2, PhoneCall, MessageCircle, Droplets } from 'lucide-react';
import { getPersonas } from '@/lib/datos';
import { nuevosEnLaFe, MESES_RECIENTE, type PersonaNueva } from '@/lib/nuevos-en-la-fe';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TIPO_LABEL: Record<string, string> = { adulto: 'Adulto', joven: 'Youth' };

// WhatsApp necesita el número sin espacios ni signos.
const soloDigitos = (tel: string) => tel.replace(/\D/g, '');

export default function NuevosEnLaFePage() {
  const [gente, setGente] = useState<PersonaNueva[]>([]);
  const [loading, setLoading] = useState(true);
  const [llamada, setLlamada] = useState<{ tel: string; nombre: string } | null>(null);

  useEffect(() => {
    getPersonas()
      .then((personas) => setGente(nuevosEnLaFe(personas as never)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const declararon = gente.filter((g) => g.motivo === 'declaro');
  const porTiempo = gente.filter((g) => g.motivo === 'tiempo');

  const Fila = ({ p }: { p: PersonaNueva }) => {
    const wa = p.whatsapp ?? p.telefono;
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{p.nombre}</p>
            <Badge variant="outline" className="text-xs">{TIPO_LABEL[p.tipo] ?? p.tipo}</Badge>
            {p.bautizado && (
              <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/5 text-xs text-primary">
                <Droplets className="h-3 w-3" aria-hidden />
                Bautizado
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {p.motivo === 'declaro'
              ? 'Declaró que es su primera vez en una iglesia'
              : `Lleva ${p.tiempoConversion} en el evangelio`}
            {p.telefono && ` · ${p.telefono}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {p.telefono && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setLlamada({ tel: p.telefono!, nombre: p.nombre })}
              aria-label={`Llamar a ${p.nombre}`}
              title="Llamar"
            >
              <PhoneCall className="h-3.5 w-3.5" />
            </Button>
          )}
          {wa && (
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
              <a
                href={`https://wa.me/${soloDigitos(wa)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Escribir por WhatsApp a ${p.nombre}`}
                title="WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
          <Sprout className="h-6 w-6 text-primary" />
          Nuevos en la fe
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Quienes recién conocen el evangelio y necesitan acompañamiento y formación básica
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : gente.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Sprout className="h-10 w-10 text-muted-foreground/50" aria-hidden />
            <h3 className="text-lg font-semibold text-foreground">Aún no hay nadie en esta lista</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Aparecerán aquí quienes declaren, al registrarse, que es su primera vez en una
              iglesia cristiana — y quienes lleven menos de {MESES_RECIENTE / 12} años en el
              evangelio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                Es su primera iglesia
                {declararon.length > 0 && <Badge variant="secondary">{declararon.length}</Badge>}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Lo declararon al registrarse. Son quienes parten desde cero.
              </p>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {declararon.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nadie lo ha declarado todavía. La pregunta se hace al registrar adultos y
                  Youth, así que se irá llenando con los registros nuevos.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {declararon.map((p) => <Fila key={p.id} p={p} />)}
                </ul>
              )}
            </CardContent>
          </Card>

          {porTiempo.length > 0 && (
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  Poco tiempo en el evangelio
                  <Badge variant="secondary">{porTiempo.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Menos de {MESES_RECIENTE / 12} años. No declararon ser primera vez, pero su
                  caminar es reciente.
                </p>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <ul className="divide-y divide-border">
                  {porTiempo.map((p) => <Fila key={p.id} p={p} />)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AlertDialog open={!!llamada} onOpenChange={(o) => { if (!o) setLlamada(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-primary" />
              Confirmar llamada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vas a llamar a <span className="font-semibold text-foreground">{llamada?.nombre}</span>{' '}
              al <span className="font-semibold text-foreground">{llamada?.tel}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a href={`tel:${llamada?.tel}`} onClick={() => setLlamada(null)}>Llamar</a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
