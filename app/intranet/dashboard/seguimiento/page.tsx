'use client';

import { useEffect, useState } from 'react';
import { getPersonas, getCultos, getAsistencias } from '@/lib/datos';
import { calcularRiesgo, type NivelRiesgo } from '@/lib/seguimiento';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Activity, Loader2, Phone, CheckCircle2, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SeguimientoRow {
  id: number;
  nombre: string;
  source_tipo: string;
  telefono: string | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
  streak: number;
  nivel: NivelRiesgo;
  puntaje: number;
  motivos: string[];
}

interface PendingCall {
  tel: string;
  label: string; // "nombre" o "Apoderado de nombre"
}

const NIVEL_STYLE: Record<NivelRiesgo, { dot: string; badge: string; label: string }> = {
  bajo:  { dot: 'bg-green-500', badge: 'bg-green-500/10 text-green-600', label: 'Al día' },
  medio: { dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-600', label: 'Atención' },
  alto:  { dot: 'bg-red-500',   badge: 'bg-red-500/10 text-red-600',     label: 'Riesgo alto' },
};

export default function SeguimientoPage() {
  const [rows, setRows] = useState<SeguimientoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const ahora = Date.now();

    // Cultos GENERALES ya realizados (fecha <= ahora), más reciente primero.
    // Las ausencias consecutivas se miden sobre el culto dominical, no sobre
    // reuniones de ministerio (público parcial).
    let personas: Awaited<ReturnType<typeof getPersonas>>;
    let cultos: Awaited<ReturnType<typeof getCultos>>;
    let asist: Awaited<ReturnType<typeof getAsistencias>>;
    try {
      // getPersonas() ya excluye a los dados de baja desde el servidor.
      [personas, cultos, asist] = await Promise.all([
        getPersonas(),
        getCultos({ tipo: 'general', orden: 'desc' }),
        getAsistencias(),
      ]);
    } catch {
      setLoading(false);
      return;
    }

    const cultosPasados = cultos.filter((c) => new Date(c.fecha).getTime() <= ahora);

    // Asistencias → Map persona -> Set(culto_id)
    const asistMap = new Map<number, Set<number>>();
    for (const a of asist) {
      if (a.persona_id == null) continue;
      const pId = Number(a.persona_id);
      if (!asistMap.has(pId)) asistMap.set(pId, new Set());
      asistMap.get(pId)!.add(Number(a.culto_id));
    }

    // Cultos dominicales ya realizados, más reciente primero (para el score).
    const cultosDesc = cultosPasados.map((c) => ({ id: Number(c.id), fecha: c.fecha }));

    const resultado: SeguimientoRow[] = personas
      .map((p) => {
        const pId = Number(p.id);
        const asistencias = asistMap.get(pId) ?? new Set<number>();
        const joinTime = new Date((p.fecha_registro ?? p.created_at) as string).getTime();

        const riesgo = calcularRiesgo(cultosDesc, asistencias, joinTime, ahora);

        return {
          id: pId,
          nombre: p.nombre,
          source_tipo: p.source_tipo,
          telefono: p.telefono,
          nombre_apoderado: p.nombre_apoderado ?? null,
          telefono_apoderado: p.telefono_apoderado ?? null,
          streak: riesgo.streak,
          nivel: riesgo.nivel,
          puntaje: riesgo.puntaje,
          motivos: riesgo.motivos,
        };
      });

    setRows(resultado);
    setLoading(false);
  }

  const verdes = rows.filter((r) => r.nivel === 'bajo').length;
  const amarillos = rows.filter((r) => r.nivel === 'medio').length;
  const rojos = rows.filter((r) => r.nivel === 'alto').length;

  // Lista accionable: medio + alto, mayor riesgo primero (por puntaje, que ya
  // combina ausencias + caída + antigüedad).
  const accionables = rows
    .filter((r) => r.nivel !== 'bajo')
    .sort((a, b) => b.puntaje - a.puntaje);

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Seguimiento
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Score de riesgo por miembro: combina ausencias seguidas, si su asistencia venía
          cayendo y hace cuánto se unió. A mayor riesgo, más arriba en la lista.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Resumen semáforo */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6">
            {([
              ['bajo', verdes],
              ['medio', amarillos],
              ['alto', rojos],
            ] as [NivelRiesgo, number][]).map(([nivel, count]) => (
              <Card key={nivel}>
                <CardContent className="p-4 md:p-6 flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${NIVEL_STYLE[nivel].dot}`} />
                  <div>
                    <div className="text-xl md:text-2xl font-bold text-foreground">{count}</div>
                    <div className="text-xs text-muted-foreground">{NIVEL_STYLE[nivel].label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lista accionable */}
          {accionables.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="font-semibold text-foreground text-lg">Todos al día</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Ningún miembro acumula 2 o más ausencias consecutivas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="p-4 md:p-6 border-b border-border">
                <CardTitle className="text-base">{accionables.length} requieren seguimiento</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {accionables.map((r) => {
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
                            {/* El "por qué" del nivel, en palabras: lo que vuelve
                                explicable al score en vez de un número opaco. */}
                            {r.motivos.length > 0 && (
                              <p className="text-muted-foreground text-xs mt-1">
                                {r.motivos.join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-md font-medium ${st.badge}`}>
                            {st.label}
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
        </>
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
