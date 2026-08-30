'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Activity, UserPlus, HeartHandshake, Loader2, Sprout } from 'lucide-react';
import { getPersonas, getCultos, getAsistencias } from '@/lib/datos';
import { calcularRiesgo } from '@/lib/seguimiento';
import { ultimaAsistenciaPorTipo } from '@/lib/cultos-tipos';
import { nuevosEnLaFe, type PersonaNueva } from '@/lib/nuevos-en-la-fe';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeguimientoResumen, type ResumenRiesgo } from '@/components/intranet/pastor/seguimiento-resumen';

interface VisitaResumen {
  id: number;
  nombre: string;
  visitas: number;
}

/**
 * Panel del Co-pastor. A diferencia del panel del Pastor (que es gerencial y
 * mira la iglesia completa), este responde una sola pregunta: **a quién tengo
 * que llamar esta semana**. Por eso arranca con el seguimiento y las visitas
 * recientes, y no con gráficos de composición.
 */
export function CopastorDashboard() {
  const { user } = useAuth();
  const [riesgo, setRiesgo] = useState<ResumenRiesgo>({ bajo: 0, medio: 0, alto: 0, nombresAlto: [] });
  const [visitas, setVisitas] = useState<VisitaResumen[]>([]);
  const [nuevos, setNuevos] = useState<PersonaNueva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const [personas, cultos, asist, cultosYouth, resVisitas] = await Promise.all([
          getPersonas(),
          getCultos({ tipo: 'general', orden: 'asc' }),
          getAsistencias(),
          getCultos({ tipo: 'youth', orden: 'asc' }).catch(() => []),
          fetch('/api/miembros-nuevos?conVisitas=1', { cache: 'no-store' }).then((r) => r.json()),
        ]);

        const ahora = Date.now();
        // calcularRiesgo espera los cultos del más reciente al más antiguo.
        const cultosDesc = cultos
          .filter((c) => new Date(c.fecha).getTime() <= ahora)
          .map((c) => ({ id: Number(c.id), fecha: c.fecha }))
          .reverse();

        const porPersona = new Map<number, Set<number>>();
        for (const a of asist) {
          if (a.persona_id == null) continue;
          const pid = Number(a.persona_id);
          if (!porPersona.has(pid)) porPersona.set(pid, new Set());
          porPersona.get(pid)!.add(Number(a.culto_id));
        }

        // Quien está activo en jóvenes no figura inactivo por faltar al domingo.
        const ultYouth = ultimaAsistenciaPorTipo(cultosYouth ?? [], asist, 'youth');

        const acc: ResumenRiesgo = { bajo: 0, medio: 0, alto: 0, nombresAlto: [] };
        const altos: { nombre: string; puntaje: number }[] = [];
        for (const p of personas) {
          const r = calcularRiesgo(
            cultosDesc,
            porPersona.get(Number(p.id)) ?? new Set<number>(),
            new Date((p.fecha_registro ?? p.created_at) as string).getTime(),
            ahora,
            ultYouth.get(Number(p.id)) ?? null,
          );
          acc[r.nivel] += 1;
          if (r.nivel === 'alto') altos.push({ nombre: p.nombre, puntaje: r.puntaje });
        }
        acc.nombresAlto = altos.sort((a, b) => b.puntaje - a.puntaje).slice(0, 3).map((x) => x.nombre);
        setRiesgo(acc);
        setNuevos(nuevosEnLaFe(personas as never));

        setVisitas(
          ((resVisitas?.miembrosNuevos ?? []) as VisitaResumen[])
            .sort((a, b) => b.visitas - a.visitas)
            .slice(0, 5),
        );
      } catch {
        // Sin bloqueo: las tarjetas muestran su propio estado vacío.
      }
      setLoading(false);
    }
    cargar();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Bienvenido, {user?.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Cuidado pastoral · Somos Luz Iglesia
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SeguimientoResumen data={riesgo} />

        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-primary" aria-hidden />
              Visitas por acompañar
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Quienes ya vinieron varias veces y aún no son miembros
            </p>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {visitas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay visitas registradas.
              </p>
            ) : (
              <>
                <ul className="mb-3 divide-y divide-border">
                  {visitas.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate text-sm text-foreground">{v.nombre}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {v.visitas} {v.visitas === 1 ? 'visita' : 'visitas'}
                      </span>
                    </li>
                  ))}
                </ul>
                <a
                  href="/intranet/dashboard/members"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Ver todas las visitas
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sprout className="h-5 w-5 text-primary" aria-hidden />
            Nuevos en la fe
            {nuevos.length > 0 && <Badge variant="secondary">{nuevos.length}</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Recién conocen el evangelio y necesitan acompañamiento
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {nuevos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nadie por ahora.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm text-foreground">
                {nuevos.slice(0, 4).map((n) => n.nombre).join(' · ')}
                {nuevos.length > 4 && (
                  <span className="text-muted-foreground"> y {nuevos.length - 4} más</span>
                )}
              </p>
              <a
                href="/intranet/dashboard/nuevos-en-la-fe"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ver la lista y contactar
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base">Accesos rápidos</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { href: '/intranet/dashboard/seguimiento', icon: Activity, label: 'Seguimiento', desc: 'A quién llamar' },
              { href: '/intranet/dashboard/fidelizacion', icon: HeartHandshake, label: 'Fidelización', desc: 'Quién asiste poco' },
              { href: '/intranet/dashboard/members', icon: UserPlus, label: 'Miembros', desc: 'Buscar una ficha' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block rounded-lg border border-border p-4 transition hover:bg-secondary"
              >
                <item.icon className="mb-2 h-6 w-6 text-primary" aria-hidden />
                <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
