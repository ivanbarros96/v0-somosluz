'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { getPersonas, getCultos, getAsistencias } from '@/lib/datos';
import { calcularRiesgo } from '@/lib/seguimiento';
import { ultimaAsistenciaPorTipo } from '@/lib/cultos-tipos';
import { nuevosEnLaFe } from '@/lib/nuevos-en-la-fe';
import { useAuth } from '@/lib/auth-context';
import { esRolCopastor } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  SeguimientoBandeja, type CasoEnBandeja, type Contacto,
} from '@/components/intranet/seguimiento-bandeja';

interface CasoApi {
  id: number;
  persona_id: number;
  motivo: 'ausencia' | 'nuevo_en_la_fe';
  estado: 'abierto' | 'cerrado';
  desenlace: string | null;
  contactos: Contacto[];
}

const DESENLACE_LABEL: Record<string, string> = {
  volvio: 'Volvió', se_retiro: 'Se retiró', sin_contacto: 'Sin contacto',
};

type Filtro = 'todos' | 'ausencia' | 'nuevo_en_la_fe';

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'ausencia', label: 'Ausencia' },
  { valor: 'nuevo_en_la_fe', label: 'Nuevos en la fe' },
];

export default function SeguimientoPage() {
  const { user } = useAuth();
  const puedeRegistrar = esRolCopastor(user?.role ?? '');

  const [porContactar, setPorContactar] = useState<CasoEnBandeja[]>([]);
  const [enProceso, setEnProceso] = useState<CasoEnBandeja[]>([]);
  const [cerrados, setCerrados] = useState<
    { nombre: string; desenlace: string; motivo: 'ausencia' | 'nuevo_en_la_fe' }[]
  >([]);
  const [loading, setLoading] = useState(true);
  // Un clic separa "no conoce al Señor" de "está decayendo": son
  // conversaciones distintas y mezcladas se vuelven difíciles de trabajar.
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [personas, cultos, asist, cultosYouth, resCasos] = await Promise.all([
        getPersonas(),
        getCultos({ tipo: 'general', orden: 'desc' }),
        getAsistencias(),
        getCultos({ tipo: 'youth', orden: 'asc' }).catch(() => []),
        fetch('/api/seguimiento', { cache: 'no-store' }).then((r) => r.json()),
      ]);

      const ahora = Date.now();
      const cultosDesc = cultos
        .filter((c) => new Date(c.fecha).getTime() <= ahora)
        .map((c) => ({ id: Number(c.id), fecha: c.fecha }));

      const asistPorPersona = new Map<number, Set<number>>();
      for (const a of asist) {
        if (a.persona_id == null) continue;
        const pid = Number(a.persona_id);
        if (!asistPorPersona.has(pid)) asistPorPersona.set(pid, new Set());
        asistPorPersona.get(pid)!.add(Number(a.culto_id));
      }

      // Quien está activo en jóvenes no entra a la bandeja de seguimiento por
      // faltar al domingo (ver calcularRiesgo, decisión de Iván 30/08/2026).
      const ultYouth = ultimaAsistenciaPorTipo(cultosYouth ?? [], asist, 'youth');

      const casos: CasoApi[] = resCasos?.casos ?? [];
      const abiertoPorPersona = new Map<number, CasoApi>();
      for (const c of casos) if (c.estado === 'abierto') abiertoPorPersona.set(c.persona_id, c);

      // Quiénes entran a la bandeja. La acción es la misma (contactar); lo que
      // cambia es la razón, que se muestra en cada fila.
      const candidatos = new Map<number, { razon: string; motivo: 'ausencia' | 'nuevo_en_la_fe' }>();

      for (const p of personas) {
        const r = calcularRiesgo(
          cultosDesc,
          asistPorPersona.get(Number(p.id)) ?? new Set<number>(),
          new Date((p.fecha_registro ?? p.created_at) as string).getTime(),
          ahora,
          ultYouth.get(Number(p.id)) ?? null,
        );
        if (r.nivel !== 'bajo') {
          candidatos.set(Number(p.id), {
            razon: r.motivos[0] ?? 'Requiere seguimiento',
            motivo: 'ausencia',
          });
        }
      }
      // Los nuevos en la fe entran aunque asistan perfecto: el acompañamiento
      // no es por ausencia sino por formación.
      for (const n of nuevosEnLaFe(personas as never)) {
        if (!candidatos.has(n.id)) {
          candidatos.set(n.id, {
            razon: n.motivo === 'declaro'
              ? 'Es su primera iglesia'
              : `Lleva ${n.tiempoConversion} en el evangelio`,
            motivo: 'nuevo_en_la_fe',
          });
        }
      }

      const porNombre = new Map(personas.map((p) => [Number(p.id), p]));
      const arma = (id: number, info: { razon: string; motivo: 'ausencia' | 'nuevo_en_la_fe' }): CasoEnBandeja | null => {
        const p = porNombre.get(id);
        if (!p) return null;
        const caso = abiertoPorPersona.get(id);
        return {
          personaId: id,
          nombre: p.nombre,
          telefono: p.telefono,
          whatsapp: (p.whatsapp as string | null) ?? null,
          razon: info.razon,
          motivo: caso?.motivo ?? info.motivo,
          casoId: caso?.id ?? null,
          contactos: caso?.contactos ?? [],
        };
      };

      const todos = [...candidatos.entries()]
        .map(([id, info]) => arma(id, info))
        .filter((c): c is CasoEnBandeja => c !== null);

      setPorContactar(todos.filter((c) => c.contactos.length === 0));
      setEnProceso(todos.filter((c) => c.contactos.length > 0));

      setCerrados(
        casos
          .filter((c) => c.estado === 'cerrado')
          .slice(0, 12)
          .map((c) => ({
            nombre: porNombre.get(c.persona_id)?.nombre ?? 'Persona',
            desenlace: DESENLACE_LABEL[c.desenlace ?? ''] ?? '—',
            motivo: c.motivo,
          })),
      );
    } catch {
      // Sin bloqueo: las tarjetas muestran su propio estado vacío.
    }
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const porContactarFiltrado = useMemo(
    () => (filtro === 'todos' ? porContactar : porContactar.filter((c) => c.motivo === filtro)),
    [porContactar, filtro],
  );
  const enProcesoFiltrado = useMemo(
    () => (filtro === 'todos' ? enProceso : enProceso.filter((c) => c.motivo === filtro)),
    [enProceso, filtro],
  );
  const cerradosFiltrado = useMemo(
    () => (filtro === 'todos' ? cerrados : cerrados.filter((c) => c.motivo === filtro)),
    [cerrados, filtro],
  );

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
          <Activity className="h-6 w-6 text-primary" />
          Seguimiento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          {puedeRegistrar
            ? 'A quién contactar y qué pasó en cada llamada. Cada fila dice por qué está aquí.'
            : 'Trabajo de acompañamiento del Co-pastor: a quién ha contactado y cómo va cada caso.'}
        </p>

        <div className="mt-4 flex gap-2" role="group" aria-label="Filtrar por motivo">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              aria-pressed={filtro === f.valor}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                filtro === f.valor
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                Por contactar
                {porContactarFiltrado.length > 0 && <Badge variant="secondary">{porContactarFiltrado.length}</Badge>}
              </CardTitle>
              <p className="text-xs text-muted-foreground">Nadie los ha llamado todavía</p>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <SeguimientoBandeja casos={porContactarFiltrado} soloLectura={!puedeRegistrar} onCambio={cargar} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base">
                En proceso
                {enProcesoFiltrado.length > 0 && <Badge variant="secondary">{enProcesoFiltrado.length}</Badge>}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Ya hubo al menos un intento; abajo de cada uno está lo que pasó
              </p>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <SeguimientoBandeja casos={enProcesoFiltrado} soloLectura={!puedeRegistrar} onCambio={cargar} />
            </CardContent>
          </Card>

          {cerradosFiltrado.length > 0 && (
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base">Casos cerrados</CardTitle>
                <p className="text-xs text-muted-foreground">Últimos acompañamientos terminados</p>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <ul className="divide-y divide-border">
                  {cerradosFiltrado.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate text-sm text-foreground">{c.nombre}</span>
                      <Badge variant="outline" className="shrink-0 text-xs">{c.desenlace}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
