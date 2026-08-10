'use client';

import { UserRoundSearch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SinDatos } from './chart-kit';

export interface NinoSinKids {
  id: number;
  nombre: string;
  domingosEnIglesia: number; // solo domingos que TUVIERON clase de Kids
  ultimoDomingo: string | null;
}

// Deliberadamente NO es un gráfico: la pregunta es "¿a quién?", no "¿cuánto?".
// Una barra con el número 7 no sirve para ir a buscar a nadie; una lista con
// nombres sí.
export function KidsSinClasePanel({
  data, domingosConClase,
}: {
  data: NinoSinKids[];
  domingosConClase: number;
}) {
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base">Niños que vienen pero no entran a Kids</CardTitle>
        <p className="text-xs text-muted-foreground">
          Asistieron al culto en domingos que sí tuvieron clase, pero nunca fueron marcados
          en la sala
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {domingosConClase === 0 ? (
          <SinDatos icono={<UserRoundSearch className="h-6 w-6" aria-hidden />}>
            Aún no hay domingos con clase de Kids registrada, así que todavía no se puede
            saber quién se está quedando fuera.
          </SinDatos>
        ) : data.length === 0 ? (
          <SinDatos icono={<UserRoundSearch className="h-6 w-6" aria-hidden />}>
            Todos los niños que vinieron a la iglesia pasaron por la clase. Nadie quedó
            fuera en {domingosConClase === 1 ? 'el domingo registrado' : `los ${domingosConClase} domingos registrados`}.
          </SinDatos>
        ) : (
          <>
            <p className="mb-3 text-sm">
              <span className="font-semibold text-foreground">{data.length}</span>{' '}
              {data.length === 1 ? 'niño vino' : 'niños vinieron'} a la iglesia sin pasar por
              la sala, sobre {domingosConClase}{' '}
              {domingosConClase === 1 ? 'domingo' : 'domingos'} con clase.
            </p>
            <ul className="divide-y divide-border">
              {data.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{n.nombre}</p>
                    {n.ultimoDomingo && (
                      <p className="text-xs text-muted-foreground">
                        Última vez en la iglesia: {n.ultimoDomingo}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 tabular-nums">
                    {n.domingosEnIglesia}{' '}
                    {n.domingosEnIglesia === 1 ? 'domingo' : 'domingos'}
                  </Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
