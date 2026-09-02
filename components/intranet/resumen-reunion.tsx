'use client';

// "Tu reunión de un vistazo": encabezado que ven los perfiles de ministerio
// (Amadas, Hombría, Discipulado, Youth) y Kids arriba de la pantalla de
// Asistencia. Muestra SU reunión —no la congregación entera—: cuánta gente es
// su público, cuántos vinieron la última vez, el promedio, y una barra con las
// últimas reuniones para ver la tendencia sin entrar a ningún reporte.
//
// Va donde ya trabajan (opción A, decisión de Iván 30/08/2026): un líder entra
// a marcar asistencia y de paso ve cómo viene su reunión, sin un dashboard
// aparte.

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CULTO_TIPOS, type CultoTipo } from '@/lib/cultos-tipos';
import { Users, TrendingUp, CalendarCheck } from 'lucide-react';

interface Culto {
  id: number;
  tipo: string;
  fecha: string;
  activo?: boolean;
}

// Etiqueta corta d/m para el eje. Se usa sólo la parte de fecha del timestamp
// para que la zona horaria no corra el día (mismo cuidado que en el resto).
function diaMes(fecha: string): string {
  const [, mes, dia] = fecha.slice(0, 10).split('-');
  return dia && mes ? `${Number(dia)}/${Number(mes)}` : '';
}

export function ResumenReunion({
  tipo,
  cultos,
  asistencias,
  publico,
}: {
  tipo: CultoTipo;
  cultos: Culto[];
  asistencias: { culto_id: number }[];
  publico: number;
}) {
  const { serie, ultima, promedio, maximo } = useMemo(() => {
    const ahora = Date.now();
    // Number() a propósito: los ids llegan a veces como texto (bigint de
    // Postgres) y un Map mezclado de "12" y 12 no encuentra nada.
    const conteo = new Map<number, number>();
    for (const a of asistencias) {
      const k = Number(a.culto_id);
      conteo.set(k, (conteo.get(k) ?? 0) + 1);
    }

    // Últimas 6 reuniones de este tipo ya realizadas, en orden cronológico.
    const propios = cultos
      .filter((c) => c.tipo === tipo && new Date(c.fecha).getTime() <= ahora)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 6)
      .reverse();

    const s = propios.map((c) => ({ fecha: c.fecha, total: conteo.get(Number(c.id)) ?? 0 }));
    const ult = s.length ? s[s.length - 1].total : 0;
    const prom = s.length ? Math.round(s.reduce((acc, x) => acc + x.total, 0) / s.length) : 0;
    const max = s.reduce((m, x) => Math.max(m, x.total), 0);
    return { serie: s, ultima: ult, promedio: prom, maximo: max };
  }, [tipo, cultos, asistencias]);

  const label = CULTO_TIPOS[tipo]?.label ?? 'Tu reunión';

  const KPI = ({ icon: Icon, valor, texto }: { icon: React.ElementType; valor: number; texto: string }) => (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="leading-tight">
        <div className="text-xl font-bold text-foreground tabular-nums">{valor}</div>
        <div className="text-[11px] text-muted-foreground">{texto}</div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Tu reunión</p>
            <h2 className="text-lg font-bold text-foreground">{label}</h2>
          </div>
          <div className="flex items-center gap-5">
            <KPI icon={Users} valor={publico} texto="público" />
            <KPI icon={CalendarCheck} valor={ultima} texto="última vez" />
            <KPI icon={TrendingUp} valor={promedio} texto="promedio" />
          </div>
        </div>

        {serie.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Aún no hay reuniones registradas. Al cerrar tu primer culto, acá verás la tendencia.
          </p>
        ) : (
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              Últimas reuniones
            </p>
            {/* Altura de barra en PÍXELES, no en %: dentro de un flex con
                items-end la columna no se estira, el alto queda indefinido y
                un height en % colapsa a cero (las barras no se veían). */}
            <div className="flex items-end gap-2 sm:gap-3">
              {serie.map((d, i) => {
                const ALTO_MAX = 76;
                const alto = maximo > 0 ? Math.max(4, Math.round((d.total / maximo) * ALTO_MAX)) : 4;
                const esUltima = i === serie.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground tabular-nums">{d.total}</span>
                    <div
                      className={`w-full rounded-t-md ${esUltima ? 'bg-primary' : 'bg-primary/35'}`}
                      style={{ height: `${alto}px` }}
                      title={`${d.total} asistentes`}
                    />
                    <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">{diaMes(d.fecha)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
