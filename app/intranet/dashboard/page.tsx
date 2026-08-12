'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getPersonas, getCultos, getAsistencias } from '@/lib/datos';
import { KpiCards, type KpiData } from '@/components/intranet/pastor/kpi-cards';
import { AsistenciaChart, type CultoAsistencia } from '@/components/intranet/pastor/asistencia-chart';
import { AsistenciaMensualChart, type AsistenciaMes } from '@/components/intranet/pastor/asistencia-mensual-chart';
import { CrecimientoChart, type CrecimientoMes } from '@/components/intranet/pastor/crecimiento-chart';
import { BautizadosChart, type BautizadosData } from '@/components/intranet/pastor/bautizados-chart';
import { SexoChart, type SexoData } from '@/components/intranet/pastor/sexo-chart';
import { EdadChart, type EdadRango } from '@/components/intranet/pastor/edad-chart';
import { FidelidadChart, type FidelidadData } from '@/components/intranet/pastor/fidelidad-chart';
import { MinisteriosPanel, type MinisterioStat } from '@/components/intranet/pastor/ministerios-panel';
import { KidsCoberturaChart, type CoberturaKidsDomingo } from '@/components/intranet/pastor/kids-cobertura-chart';
import { AsistenciaPronosticoChart, type DomingoAsistencia } from '@/components/intranet/pastor/asistencia-pronostico-chart';
import { KidsSinClasePanel, type NinoSinKids } from '@/components/intranet/pastor/kids-sin-clase-panel';
import { ESTADO } from '@/components/intranet/pastor/chart-kit';
import { SeccionPanel } from '@/components/intranet/pastor/seccion-panel';
import { SeguimientoResumen, type ResumenRiesgo } from '@/components/intranet/pastor/seguimiento-resumen';
import { calcularRiesgo } from '@/lib/seguimiento';
import { FinanzasTendenciaChart, type FinanzasTendenciaMes } from '@/components/intranet/pastor/finanzas-tendencia-chart';
import { CULTO_TIPOS, MINISTERIO_KEYS, idsQueAsistieron, type CultoTipo } from '@/lib/cultos-tipos';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, UserPlus, ClipboardList, UserX, Settings, Activity, HandHeart, ArrowRight, Wallet } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const capMes = (d: Date) => {
  const l = format(d, 'MMM', { locale: es });
  return l.charAt(0).toUpperCase() + l.slice(1);
};

// ─── Pastor Dashboard ────────────────────────────────────────────────────────

function PastorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [kpis, setKpis] = useState<KpiData>({ totalMiembros: 0, adultos: 0, jovenes: 0, ninos: 0, pctAsistenciaPromedio: 0, retencionVisitantes: null });
  const [oracionPendientes, setOracionPendientes] = useState(0);
  const [asistenciaData, setAsistenciaData] = useState<CultoAsistencia[]>([]);
  const [serieDomingos, setSerieDomingos] = useState<DomingoAsistencia[]>([]);
  const [asistenciaMensual, setAsistenciaMensual] = useState<AsistenciaMes[]>([]);
  const [crecimientoData, setCrecimientoData] = useState<CrecimientoMes[]>([]);
  const [bautizadosData, setBautizadosData] = useState<BautizadosData>({ bautizados: 0, en_proceso: 0, no_bautizados: 0 });
  const [sexoData, setSexoData] = useState<SexoData>({ femenino: 0, masculino: 0, sin_dato: 0 });
  const [edadData, setEdadData] = useState<EdadRango[]>([]);
  const [edadSinDato, setEdadSinDato] = useState(0);
  const [fidelidadData, setFidelidadData] = useState<FidelidadData[]>([]);
  const [fidelidadEval, setFidelidadEval] = useState(0);
  const [ministerios, setMinisterios] = useState<MinisterioStat[]>([]);
  const [coberturaKids, setCoberturaKids] = useState<CoberturaKidsDomingo[]>([]);
  const [ninosSinKids, setNinosSinKids] = useState<NinoSinKids[]>([]);
  const [domingosConClase, setDomingosConClase] = useState(0);
  const [resumenRiesgo, setResumenRiesgo] = useState<ResumenRiesgo>({ bajo: 0, medio: 0, alto: 0, nombresAlto: [] });
  const [finanzasTendencia, setFinanzasTendencia] = useState<FinanzasTendenciaMes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      // Personas
      const personas = await getPersonas().catch(() => [] as Awaited<ReturnType<typeof getPersonas>>);

      const total = personas?.length ?? 0;
      const adultos = personas?.filter((p) => p.source_tipo === 'adulto').length ?? 0;
      const jovenes = personas?.filter((p) => p.source_tipo === 'joven').length ?? 0;
      const ninos = personas?.filter((p) => p.source_tipo === 'nino').length ?? 0;

      // Normalización defensiva: comparar siempre en minúscula
      const baut = (v: any) => (v == null ? null : String(v).trim().toLowerCase());

      // Bautismo (adultos)
      const adultoRows = personas?.filter((p) => p.source_tipo === 'adulto') ?? [];
      const bautizados = adultoRows.filter((p) => baut(p.bautizado) === 'si').length;
      const en_proceso = adultoRows.filter((p) => baut(p.bautizado) === 'en_proceso').length;
      const no_bautizados = adultoRows.filter((p) => baut(p.bautizado) === 'no' || p.bautizado == null).length;

      // Distribución por sexo (toda la congregación)
      const sexoNorm = (v: any) => String(v ?? '').trim().toLowerCase();
      const femenino = personas?.filter((p) => sexoNorm(p.sexo) === 'femenino').length ?? 0;
      const masculino = personas?.filter((p) => sexoNorm(p.sexo) === 'masculino').length ?? 0;
      const sexoSinDato = total - femenino - masculino;

      // Rangos de edad
      const RANGOS = [
        { rango: '0-12', min: 0, max: 12 },
        { rango: '13-17', min: 13, max: 17 },
        { rango: '18-30', min: 18, max: 30 },
        { rango: '31-50', min: 31, max: 50 },
        { rango: '51+', min: 51, max: 200 },
      ];
      const conEdad = (personas ?? []).filter(
        (p): p is typeof p & { edad: number } => typeof p.edad === 'number' && p.edad >= 0,
      );
      const edadRangos: EdadRango[] = RANGOS.map((r) => ({
        rango: r.rango,
        total: conEdad.filter((p) => p.edad >= r.min && p.edad <= r.max).length,
      }));
      const sinEdad = total - conEdad.length;

      // Crecimiento ACUMULADO desde el inicio de la iglesia (primer registro)
      const now = new Date();
      const fechas = (personas ?? [])
        .map((p) => p.created_at)
        .filter(Boolean)
        .sort() as string[];
      const inicio = fechas.length ? startOfMonth(parseISO(fechas[0])) : startOfMonth(subMonths(now, 5));
      let nMeses = differenceInMonths(startOfMonth(now), inicio) + 1;
      if (nMeses < 1) nMeses = 1;
      if (nMeses > 12) nMeses = 12; // límite de legibilidad

      const meses: CrecimientoMes[] = [];
      let acumulado = 0;
      for (let i = nMeses - 1; i >= 0; i--) {
        const mes = subMonths(now, i);
        const ini = startOfMonth(mes).toISOString();
        const fin = endOfMonth(mes).toISOString();
        const nuevos = personas?.filter((p) => p.created_at && p.created_at >= ini && p.created_at <= fin).length ?? 0;
        acumulado += nuevos;
        meses.push({ mes: capMes(mes), nuevos, acumulado });
      }

      // Cultos GENERALES (dominicales) — las métricas congregacionales se anclan
      // a ellos para no distorsionarse con reuniones de público parcial (ministerios).
      const [cultos, rawAsist, cultosMinisterio] = await Promise.all([
        getCultos({ tipo: 'general', orden: 'asc' }).catch(() => []),
        getAsistencias().catch(() => []),
        // Reuniones de ministerio (todo lo que no es culto general)
        getCultos({ tipoDistinto: 'general', orden: 'asc' }).catch(() => []),
      ]);

      // Conteo por culto
      const conteoPorCulto: Record<number, number> = {};
      for (const a of rawAsist ?? []) {
        const cId = Number(a.culto_id);
        conteoPorCulto[cId] = (conteoPorCulto[cId] ?? 0) + 1;
      }

      // Asistencia por CULTO (últimos 8)
      const cultosOrden = cultos ?? [];
      const ultimos8 = cultosOrden.slice(-8);
      const asistencias: CultoAsistencia[] = ultimos8.map((c) => ({
        fecha: c.fecha,
        total: conteoPorCulto[Number(c.id)] ?? 0,
        descripcion: c.descripcion,
      }));

      // Serie COMPLETA de domingos ya realizados (para tendencia y pronóstico).
      // A diferencia de `ultimos8`, aquí van todos, en orden cronológico.
      const serieDomingos: DomingoAsistencia[] = cultosOrden
        .filter((c) => new Date(c.fecha).getTime() <= Date.now())
        .map((c) => ({ fecha: c.fecha, total: conteoPorCulto[Number(c.id)] ?? 0 }));

      // Asistencia por MES (promedio por culto dentro del mes)
      const fechaPorCulto: Record<number, string> = {};
      for (const c of cultosOrden) fechaPorCulto[Number(c.id)] = c.fecha;
      const porMes: Record<string, { total: number; cultos: Set<number>; orden: number }> = {};
      for (const a of rawAsist ?? []) {
        const cId = Number(a.culto_id);
        const fecha = fechaPorCulto[cId];
        if (!fecha) continue;
        const d = parseISO(fecha);
        const key = format(d, 'yyyy-MM');
        if (!porMes[key]) porMes[key] = { total: 0, cultos: new Set(), orden: d.getTime() };
        porMes[key].total += 1;
        porMes[key].cultos.add(cId);
      }
      const mensual: AsistenciaMes[] = Object.entries(porMes)
        .sort((a, b) => a[1].orden - b[1].orden)
        .map(([key, v]) => ({
          mes: capMes(parseISO(key + '-01')),
          total: Math.round(v.total / v.cultos.size),
        }));

      // % asistencia promedio sobre últimos 8 cultos
      const totalPresencias = ultimos8.reduce((s, c) => s + (conteoPorCulto[Number(c.id)] ?? 0), 0);
      const pctAsistenciaPromedio = ultimos8.length && total > 0
        ? Math.round((totalPresencias / ultimos8.length / total) * 100)
        : 0;

      // Fidelidad: % de cultos asistidos desde que cada persona se unió
      const ahora = Date.now();
      const cultosPasados = cultosOrden.filter((c) => new Date(c.fecha).getTime() <= ahora);
      const asistPorPersona = new Map<number, Set<number>>();
      for (const a of rawAsist ?? []) {
        if (a.persona_id == null) continue;
        const pid = Number(a.persona_id);
        if (!asistPorPersona.has(pid)) asistPorPersona.set(pid, new Set());
        asistPorPersona.get(pid)!.add(Number(a.culto_id));
      }
      // Resumen de seguimiento: el mismo score que usa la pantalla de
      // Seguimiento (lib/seguimiento.ts), para que el titular del home y el
      // detalle del menú no puedan contradecirse.
      // calcularRiesgo espera los cultos del más reciente al más antiguo.
      const cultosDesc = [...cultosPasados]
        .reverse()
        .map((c) => ({ id: Number(c.id), fecha: c.fecha }));
      const riesgo: ResumenRiesgo = { bajo: 0, medio: 0, alto: 0, nombresAlto: [] };
      const enAlto: { nombre: string; puntaje: number }[] = [];
      for (const p of personas ?? []) {
        const join = new Date((p.fecha_registro ?? p.created_at) as string).getTime();
        const r = calcularRiesgo(
          cultosDesc,
          asistPorPersona.get(Number(p.id)) ?? new Set<number>(),
          join,
          ahora,
        );
        riesgo[r.nivel] += 1;
        if (r.nivel === 'alto') enAlto.push({ nombre: p.nombre, puntaje: r.puntaje });
      }
      // Solo los 3 más críticos: el home da nombres, la lista completa está en
      // la pantalla de Seguimiento.
      riesgo.nombresAlto = enAlto
        .sort((a, b) => b.puntaje - a.puntaje)
        .slice(0, 3)
        .map((x) => x.nombre);

      let alta = 0, media = 0, baja = 0, evaluadas = 0;
      for (const p of personas ?? []) {
        const join = new Date((p.fecha_registro ?? p.created_at) as string).getTime();
        const elegibles = cultosPasados.filter((c) => new Date(c.fecha).getTime() >= join);
        if (elegibles.length === 0) continue; // se unió después del último culto
        const asistio = asistPorPersona.get(Number(p.id)) ?? new Set();
        const presentes = elegibles.filter((c) => asistio.has(Number(c.id))).length;
        const pct = (presentes / elegibles.length) * 100;
        evaluadas++;
        if (pct >= 70) alta++;
        else if (pct >= 35) media++;
        else baja++;
      }
      // Colores de ESTADO, no de serie: acá el color comunica bueno/atención/
      // grave y por eso no sale de la paleta categórica.
      const fidelidad: FidelidadData[] = [
        { key: 'alta', nivel: 'Alta (≥70%)', total: alta, color: ESTADO.bueno },
        { key: 'media', nivel: 'Media (35-69%)', total: media, color: ESTADO.atencion },
        { key: 'baja', nivel: 'Baja (<35%)', total: baja, color: ESTADO.grave },
      ];

      // Retención de visitantes: de los visitantes nuevos con al menos una
      // asistencia registrada, % que volvió una segunda vez o más.
      const asistPorVisitante = new Map<number, number>();
      for (const a of rawAsist ?? []) {
        if (a.miembro_nuevo_id == null) continue;
        const vid = Number(a.miembro_nuevo_id);
        asistPorVisitante.set(vid, (asistPorVisitante.get(vid) ?? 0) + 1);
      }
      const visitantesConAsistencia = asistPorVisitante.size;
      const visitantesQueVolvieron = [...asistPorVisitante.values()].filter((n) => n >= 2).length;
      // Muestra mínima: con muy pocos visitantes registrados el % no es fiable
      // y un "0%" resulta engañoso. Mostramos "—" hasta tener datos suficientes.
      const MIN_MUESTRA_RETENCION = 5;
      const retencionVisitantes = visitantesConAsistencia >= MIN_MUESTRA_RETENCION
        ? Math.round((visitantesQueVolvieron / visitantesConAsistencia) * 100)
        : null;

      // Vida de Ministerios: participación = asistentes promedio / público elegible
      const conteoTodosCultos: Record<number, number> = {};
      for (const a of rawAsist ?? []) {
        const cId = Number(a.culto_id);
        conteoTodosCultos[cId] = (conteoTodosCultos[cId] ?? 0) + 1;
      }
      // Adulto (o Niño) de 15-20 años no cuenta como público de Youth solo por
      // edad — necesita al menos una asistencia previa a un culto de Youth.
      const asistioYouthIds = idsQueAsistieron(cultosMinisterio ?? [], rawAsist ?? [], 'youth');

      const statsMinisterios: MinisterioStat[] = MINISTERIO_KEYS.map((tipo) => {
        const def = CULTO_TIPOS[tipo as CultoTipo];
        const reuniones = (cultosMinisterio ?? []).filter(
          (c) => c.tipo === tipo && new Date(c.fecha).getTime() <= ahora,
        );
        const totalAsist = reuniones.reduce((s, c) => s + (conteoTodosCultos[Number(c.id)] ?? 0), 0);
        const promedio = reuniones.length ? Math.round(totalAsist / reuniones.length) : 0;
        const elegibles = (personas ?? []).filter(
          (p) =>
            def.elegibilidad({
              source_tipo: p.source_tipo as 'adulto' | 'nino',
              sexo: p.sexo ?? null,
              edad: typeof p.edad === 'number' ? p.edad : null,
              asistioAYouthAlgunaVez: asistioYouthIds.has(Number(p.id)),
            }) === 'si',
        ).length;
        return {
          tipo,
          label: def.label,
          publico: def.publico,
          reuniones: reuniones.length,
          promedio,
          elegibles,
          participacion:
            reuniones.length && elegibles > 0 ? Math.round((promedio / elegibles) * 100) : null,
          ultimaFecha: reuniones.length ? reuniones[reuniones.length - 1].fecha : null,
        };
      });

      // ── Kids: cobertura de la clase ──────────────────────────────────────
      // Solo tiene sentido en domingos donde existen AMBOS cultos (el general y
      // el de Kids). Antes del 09/08/2026 la clase no tenía registro propio, así
      // que esos domingos se ignoran en vez de contarlos como cobertura 0.
      const cultosKids = (cultosMinisterio ?? []).filter((c) => c.tipo === 'kids');
      const soloFecha = (f: string) => f.slice(0, 10);
      const kidsPorFecha = new Map<string, number>();
      for (const c of cultosKids) kidsPorFecha.set(soloFecha(c.fecha), Number(c.id));

      const idsNinos = new Set(
        (personas ?? []).filter((p) => p.source_tipo === 'nino').map((p) => Number(p.id)),
      );
      const nombrePorId = new Map<number, string>(
        (personas ?? []).map((p) => [Number(p.id), p.nombre as string]),
      );

      // Niños presentes por culto (Set para no contar dos veces al mismo)
      const ninosPorCulto = new Map<number, Set<number>>();
      for (const a of rawAsist ?? []) {
        if (a.persona_id == null) continue;
        const pid = Number(a.persona_id);
        if (!idsNinos.has(pid)) continue;
        const cid = Number(a.culto_id);
        if (!ninosPorCulto.has(cid)) ninosPorCulto.set(cid, new Set());
        ninosPorCulto.get(cid)!.add(pid);
      }

      // Se agrupa por FECHA y no por culto: si por error existiera más de un
      // culto general el mismo domingo, ese día contaría dos veces y el
      // porcentaje saldría distorsionado. Unir los asistentes del día es además
      // lo correcto — es el mismo domingo.
      const unirPorFecha = (lista: typeof cultosOrden) => {
        const mapa = new Map<string, Set<number>>();
        for (const c of lista) {
          if (new Date(c.fecha).getTime() > ahora) continue; // aún no ocurre
          const f = soloFecha(c.fecha);
          const set = mapa.get(f) ?? new Set<number>();
          for (const pid of ninosPorCulto.get(Number(c.id)) ?? []) set.add(pid);
          mapa.set(f, set);
        }
        return mapa;
      };

      const ninosIglesiaPorFecha = unirPorFecha(cultosOrden);
      const ninosKidsPorFecha = unirPorFecha(cultosKids);

      const fechasConClase = [...ninosKidsPorFecha.keys()]
        .filter((f) => ninosIglesiaPorFecha.has(f))
        .sort();

      const coberturaKids: CoberturaKidsDomingo[] = fechasConClase.slice(-8).map((f) => ({
        fecha: f,
        label: format(parseISO(f), 'd MMM', { locale: es }),
        enIglesia: ninosIglesiaPorFecha.get(f)?.size ?? 0,
        enKids: ninosKidsPorFecha.get(f)?.size ?? 0,
      }));

      // Niños que vinieron al culto en domingos CON clase, pero nunca a la sala.
      // Un niño marcado solo en Kids ya aparece en el dominical por el reflejo
      // automático (ver reflejarEnDominical), así que basta recorrer la iglesia.
      const asistenciaPorNino = new Map<number, { domingos: string[]; kids: number }>();
      for (const f of fechasConClase) {
        const enIglesia = ninosIglesiaPorFecha.get(f) ?? new Set<number>();
        const enKids = ninosKidsPorFecha.get(f) ?? new Set<number>();
        for (const pid of enIglesia) {
          const acc = asistenciaPorNino.get(pid) ?? { domingos: [], kids: 0 };
          acc.domingos.push(f);
          if (enKids.has(pid)) acc.kids += 1;
          asistenciaPorNino.set(pid, acc);
        }
      }

      const ninosSinKids: NinoSinKids[] = [...asistenciaPorNino.entries()]
        .filter(([, v]) => v.kids === 0)
        .map(([pid, v]) => {
          const ultima = v.domingos[v.domingos.length - 1];
          return {
            id: pid,
            nombre: nombrePorId.get(pid) ?? 'Sin nombre',
            domingosEnIglesia: v.domingos.length,
            ultimoDomingo: ultima ? format(parseISO(ultima), "d 'de' MMMM", { locale: es }) : null,
          };
        })
        .sort((a, b) => b.domingosEnIglesia - a.domingosEnIglesia || a.nombre.localeCompare(b.nombre));

      // Peticiones de oración pendientes (endpoint solo-pastor)
      try {
        const res = await fetch('/api/oracion');
        if (res.ok) {
          const { peticiones } = await res.json();
          setOracionPendientes(
            (peticiones ?? []).filter((p: { estado: string }) => p.estado === 'pendiente').length,
          );
        }
      } catch {
        // sin bloqueo: el banner simplemente no se muestra
      }

      // Tendencia de Finanzas (endpoint solo-pastor: RLS bloquea el acceso directo del cliente)
      try {
        const res = await fetch('/api/finanzas/tendencia?meses=6');
        if (res.ok) {
          const { meses } = await res.json();
          setFinanzasTendencia(meses ?? []);
        }
      } catch {
        // sin bloqueo: el gráfico simplemente no se muestra
      }

      setKpis({ totalMiembros: total, adultos, jovenes, ninos, pctAsistenciaPromedio, retencionVisitantes });
      setAsistenciaData(asistencias);
      setSerieDomingos(serieDomingos);
      setAsistenciaMensual(mensual);
      setCrecimientoData(meses);
      setBautizadosData({ bautizados, en_proceso, no_bautizados });
      setSexoData({ femenino, masculino, sin_dato: sexoSinDato });
      setEdadData(edadRangos);
      setEdadSinDato(sinEdad);
      setFidelidadData(fidelidad);
      setFidelidadEval(evaluadas);
      setResumenRiesgo(riesgo);
      setMinisterios(statsMinisterios);
      setCoberturaKids(coberturaKids);
      setNinosSinKids(ninosSinKids);
      setDomingosConClase(fechasConClase.length);
      setLoading(false);
    }

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Panel gerencial · Somos Luz Iglesia
        </p>
      </div>

      {oracionPendientes > 0 && (
        <a
          href="/intranet/dashboard/oracion"
          className="flex items-center justify-between gap-3 p-4 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 shrink-0">
              <HandHeart className="w-5 h-5 text-primary" aria-hidden="true" />
            </span>
            <span className="text-sm text-foreground">
              <span className="font-semibold">{oracionPendientes} {oracionPendientes === 1 ? 'petición de oración' : 'peticiones de oración'}</span>
              {' '}sin revisar desde el sitio web
            </span>
          </span>
          <ArrowRight className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        </a>
      )}

      <KpiCards data={kpis} />

      {/* Las secciones y sus títulos son los mismos grupos del menú izquierdo
          (ver dashboard-sidebar.tsx): acá va el titular, allá el detalle. */}
      <SeccionPanel
        titulo="Congregación"
        descripcion="Quiénes somos y cómo venimos creciendo"
        href="/intranet/dashboard/members"
        hrefLabel="Ver miembros"
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CrecimientoChart data={crecimientoData} />
          <BautizadosChart data={bautizadosData} />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SexoChart data={sexoData} />
          <EdadChart data={edadData} sinDato={edadSinDato} />
        </div>
      </SeccionPanel>

      <SeccionPanel
        titulo="Asistencia"
        descripcion="Cuánta gente viene y hacia dónde va la tendencia"
        href="/intranet/dashboard/mapa-asistencia"
        hrefLabel="Ver mapa de asistencia"
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AsistenciaChart data={asistenciaData} />
          <AsistenciaMensualChart data={asistenciaMensual} />
        </div>
        <AsistenciaPronosticoChart data={serieDomingos} />
        <MinisteriosPanel data={ministerios} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <KidsCoberturaChart data={coberturaKids} />
          <KidsSinClasePanel data={ninosSinKids} domingosConClase={domingosConClase} />
        </div>
      </SeccionPanel>

      <SeccionPanel
        titulo="Cuidado pastoral"
        descripcion="A quién hay que buscar esta semana"
        href="/intranet/dashboard/seguimiento"
        hrefLabel="Ver seguimiento"
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SeguimientoResumen data={resumenRiesgo} />
          <FidelidadChart
            data={fidelidadData}
            evaluadas={fidelidadEval}
            onSelect={(nivel) => router.push(`/intranet/dashboard/fidelizacion?nivel=${nivel}`)}
          />
        </div>
      </SeccionPanel>

      <SeccionPanel
        titulo="Administración"
        descripcion="Cómo se mueven los recursos"
        href="/intranet/dashboard/finanzas"
        hrefLabel="Ver finanzas"
      >
        <FinanzasTendenciaChart data={finanzasTendencia} />
      </SeccionPanel>
    </div>
  );
}

// ─── Somos Luz Dashboard ─────────────────────────────────────────────────────

function SomosluzDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, recientes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPersonas()
      .then((data) => {
        const total = data.length;
        const hace3m = subMonths(new Date(), 3).toISOString();
        const recientes = data.filter((p) => p.created_at && p.created_at >= hace3m).length;
        setStats({ total, recientes });
      })
      .catch(() => setStats({ total: 0, recientes: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Panel operativo · Somos Luz Iglesia
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Nuevos (3 meses)</CardTitle>
            <UserPlus className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-primary">{stats.recientes}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Acciones Rápidas</CardTitle>
          <CardDescription className="text-sm">Funciones principales</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: '/intranet/dashboard/registro', icon: UserPlus, label: 'Registrar Miembro', desc: 'Agregar nuevo' },
              { href: '/intranet/dashboard/members', icon: Users, label: 'Ver Miembros', desc: 'Lista completa' },
              { href: '/intranet/dashboard/asistencia', icon: ClipboardList, label: 'Asistencia', desc: 'Registrar culto' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block p-4 rounded-lg border border-border hover:bg-secondary transition"
              >
                <item.icon className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-foreground text-sm">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  return user?.role === 'pastor' ? <PastorDashboard /> : <SomosluzDashboard />;
}
