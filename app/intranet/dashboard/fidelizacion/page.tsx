'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { HeartHandshake, Loader2, Phone, PhoneCall, CheckCircle2 } from 'lucide-react';
import { FidelidadChart, type FidelidadData, type FidelidadNivel } from '@/components/intranet/pastor/fidelidad-chart';

type Filtro = 'todas' | FidelidadNivel;
type TipoFiltro = 'todos' | 'adulto' | 'nino';

interface Row {
  id: number;
  nombre: string;
  source_tipo: string;
  telefono: string | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
  presentes: number;
  elegibles: number;
  pct: number;
  nivel: FidelidadNivel;
}

interface PendingCall {
  tel: string;
  label: string;
}

const NIVEL_STYLE: Record<FidelidadNivel, { dot: string; badge: string; label: string; color: string }> = {
  alta:  { dot: 'bg-green-500', badge: 'bg-green-500/10 text-green-600', label: 'Alta',  color: '#22c55e' },
  media: { dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-600', label: 'Media', color: '#f59e0b' },
  baja:  { dot: 'bg-red-500',   badge: 'bg-red-500/10 text-red-600',     label: 'Baja',  color: '#ef4444' },
};

function clasificar(pct: number): FidelidadNivel {
  if (pct >= 70) return 'alta';
  if (pct >= 35) return 'media';
  return 'baja';
}

function FidelizacionContent() {
  const searchParams = useSearchParams();
  const nivelInicial = searchParams.get('nivel');
  const [filtro, setFiltro] = useState<Filtro>(
    nivelInicial === 'alta' || nivelInicial === 'media' || nivelInicial === 'baja' ? nivelInicial : 'todas',
  );
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const ahora = Date.now();

    // Excluir retirados
    const { data: retirosData } = await supabase
      .from('retiros').select('persona_id').not('persona_id', 'is', null);
    const retirados = new Set((retirosData ?? []).map((r: any) => Number(r.persona_id)));

    const { data: personas } = await supabase
      .from('personas').select('id, nombre, source_tipo, telefono, nombre_apoderado, telefono_apoderado, fecha_registro, created_at');
    // Solo cultos generales: la fidelidad se mide sobre el culto dominical
    const { data: cultos } = await supabase
      .from('cultos').select('id, fecha').eq('tipo', 'general').order('fecha', { ascending: false });
    const { data: asist } = await supabase
      .from('asistencias').select('persona_id, culto_id').not('persona_id', 'is', null);

    if (!personas) { setLoading(false); return; }

    const cultosPasados = (cultos ?? []).filter((c) => new Date(c.fecha).getTime() <= ahora);

    const asistMap = new Map<number, Set<number>>();
    for (const a of asist ?? []) {
      const pid = Number(a.persona_id);
      if (!asistMap.has(pid)) asistMap.set(pid, new Set());
      asistMap.get(pid)!.add(Number(a.culto_id));
    }

    const resultado: Row[] = [];
    for (const p of personas) {
      const pid = Number(p.id);
      if (retirados.has(pid)) continue;
      const join = new Date((p.fecha_registro ?? p.created_at) as string).getTime();
      const elegibles = cultosPasados.filter((c) => new Date(c.fecha).getTime() >= join);
      if (elegibles.length === 0) continue; // se unió después del último culto
      const asistio = asistMap.get(pid) ?? new Set<number>();
      const presentes = elegibles.filter((c) => asistio.has(Number(c.id))).length;
      const pct = Math.round((presentes / elegibles.length) * 100);
      resultado.push({
        id: pid,
        nombre: p.nombre,
        source_tipo: p.source_tipo,
        telefono: p.telefono,
        nombre_apoderado: p.nombre_apoderado ?? null,
        telefono_apoderado: p.telefono_apoderado ?? null,
        presentes,
        elegibles: elegibles.length,
        pct,
        nivel: clasificar(pct),
      });
    }

    setRows(resultado);
    setLoading(false);
  }

  const rowsFiltradosTipo = useMemo(() =>
    tipoFiltro === 'todos' ? rows : rows.filter((r) => r.source_tipo === tipoFiltro),
  [rows, tipoFiltro]);

  const conteos = useMemo(() => ({
    alta: rowsFiltradosTipo.filter((r) => r.nivel === 'alta').length,
    media: rowsFiltradosTipo.filter((r) => r.nivel === 'media').length,
    baja: rowsFiltradosTipo.filter((r) => r.nivel === 'baja').length,
  }), [rowsFiltradosTipo]);

  const chartData: FidelidadData[] = [
    { key: 'alta',  nivel: 'Alta (≥70%)',    total: conteos.alta,  color: NIVEL_STYLE.alta.color },
    { key: 'media', nivel: 'Media (35-69%)', total: conteos.media, color: NIVEL_STYLE.media.color },
    { key: 'baja',  nivel: 'Baja (<35%)',    total: conteos.baja,  color: NIVEL_STYLE.baja.color },
  ];

  const lista = rowsFiltradosTipo
    .filter((r) => filtro === 'todas' || r.nivel === filtro)
    .sort((a, b) => a.pct - b.pct);

  const CHIPS: { key: Filtro; label: string; n: number }[] = [
    { key: 'todas', label: 'Todas', n: rowsFiltradosTipo.length },
    { key: 'alta', label: 'Alta', n: conteos.alta },
    { key: 'media', label: 'Media', n: conteos.media },
    { key: 'baja', label: 'Baja', n: conteos.baja },
  ];

  const TIPO_CHIPS: { key: TipoFiltro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'adulto', label: 'Adultos' },
    { key: 'nino', label: 'Niños' },
  ];

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <HeartHandshake className="h-6 w-6 text-primary" />
          Fidelización
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Constancia de asistencia por persona desde que se unió · Alta ≥70% · Media 35-69% · Baja &lt;35%
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chips de tipo (adultos / niños / todos) */}
          <div className="flex gap-2 flex-wrap">
            {TIPO_CHIPS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTipoFiltro(key); setFiltro('todas'); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                  ${tipoFiltro === key
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Gráfico resumen — clic filtra la lista */}
          <FidelidadChart data={chartData} evaluadas={rowsFiltradosTipo.length} onSelect={(n) => setFiltro(n)} />

          {/* Chips de filtro por nivel */}
          <div className="flex gap-2 flex-wrap">
            {CHIPS.map(({ key, label, n }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5
                  ${filtro === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
              >
                {key !== 'todas' && <span className={`w-2 h-2 rounded-full ${NIVEL_STYLE[key as FidelidadNivel].dot}`} />}
                {label}
                <span className={filtro === key ? 'opacity-80' : 'opacity-60'}>· {n}</span>
              </button>
            ))}
          </div>

          {/* Lista detallada */}
          {lista.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-sm">No hay personas en este nivel.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="p-4 md:p-6 border-b border-border">
                <CardTitle className="text-base">
                  {lista.length} {lista.length === 1 ? 'persona' : 'personas'}
                  {filtro !== 'todas' && ` · nivel ${NIVEL_STYLE[filtro as FidelidadNivel].label}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {lista.map((r) => {
                    const st = NIVEL_STYLE[r.nivel];
                    return (
                      <div key={r.id} className="flex items-center justify-between px-4 md:px-6 py-4 hover:bg-secondary/50 transition-colors gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} />
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                            {r.nombre.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground font-medium text-sm truncate">{r.nombre}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-muted-foreground text-xs capitalize">{r.source_tipo}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground text-xs">asistió {r.presentes}/{r.elegibles}</span>
                              {r.telefono && (
                                <>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {r.telefono}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-bold tabular-nums px-2 py-1 rounded-md ${st.badge}`}>
                            {r.pct}%
                          </span>
                          {(() => {
                            const esNino = r.source_tipo === 'nino';
                            const tel = esNino ? r.telefono_apoderado : r.telefono;
                            const label = esNino
                              ? `Apoderado de ${r.nombre}${r.nombre_apoderado ? ` (${r.nombre_apoderado})` : ''}`
                              : r.nombre;
                            return tel ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={() => setPendingCall({ tel, label })}
                                aria-label={`Llamar a ${label}`}
                              >
                                <PhoneCall className="h-3.5 w-3.5" />
                              </Button>
                            ) : <div className="w-8" />;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Confirmación de llamada */}
      <AlertDialog open={!!pendingCall} onOpenChange={(o) => { if (!o) setPendingCall(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-primary" />
              Confirmar llamada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Está a punto de llamar a <span className="font-semibold text-foreground">{pendingCall?.label}</span> al número <span className="font-semibold text-foreground">{pendingCall?.tel}</span>. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a href={`tel:${pendingCall?.tel}`} onClick={() => setPendingCall(null)}>
                Llamar
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function FidelizacionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <FidelizacionContent />
    </Suspense>
  );
}
