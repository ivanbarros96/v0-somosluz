'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Activity, Loader2, Phone, CheckCircle2, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Umbrales (ausencias consecutivas): 0-1 verde · 2 amarillo · 3+ rojo
type Nivel = 'verde' | 'amarillo' | 'rojo';

function clasificar(streak: number): Nivel {
  if (streak >= 3) return 'rojo';
  if (streak === 2) return 'amarillo';
  return 'verde';
}

interface SeguimientoRow {
  id: number;
  nombre: string;
  source_tipo: string;
  telefono: string | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
  streak: number;
  nivel: Nivel;
}

interface PendingCall {
  tel: string;
  label: string; // "nombre" o "Apoderado de nombre"
}

const NIVEL_STYLE: Record<Nivel, { dot: string; badge: string; label: string }> = {
  verde:    { dot: 'bg-green-500',  badge: 'bg-green-500/10 text-green-600',    label: 'Al día' },
  amarillo: { dot: 'bg-amber-500',  badge: 'bg-amber-500/10 text-amber-600',    label: 'Atención' },
  rojo:     { dot: 'bg-red-500',    badge: 'bg-red-500/10 text-red-600',        label: 'Urgente' },
};

export default function SeguimientoPage() {
  const [rows, setRows] = useState<SeguimientoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const ahora = Date.now();

    // Excluir retirados
    const { data: retirosExist } = await supabase
      .from('retiros').select('persona_id').not('persona_id', 'is', null);
    const retirados = new Set((retirosExist ?? []).map((r: any) => Number(r.persona_id)));

    // Personas activas
    const { data: personas } = await supabase
      .from('personas')
      .select('id, nombre, source_tipo, telefono, nombre_apoderado, telefono_apoderado, fecha_registro, created_at');
    if (!personas) { setLoading(false); return; }

    // Cultos ya realizados (fecha <= ahora), más reciente primero
    const { data: cultos } = await supabase
      .from('cultos').select('id, fecha').order('fecha', { ascending: false });
    const cultosPasados = (cultos ?? []).filter((c) => new Date(c.fecha).getTime() <= ahora);

    // Asistencias → Map persona -> Set(culto_id)
    const { data: asist } = await supabase
      .from('asistencias').select('persona_id, culto_id').not('persona_id', 'is', null);
    const asistMap = new Map<number, Set<number>>();
    for (const a of asist ?? []) {
      const pId = Number(a.persona_id);
      if (!asistMap.has(pId)) asistMap.set(pId, new Set());
      asistMap.get(pId)!.add(Number(a.culto_id));
    }

    const resultado: SeguimientoRow[] = personas
      .filter((p) => !retirados.has(Number(p.id)))
      .map((p) => {
        const pId = Number(p.id);
        const asistencias = asistMap.get(pId) ?? new Set<number>();
        const joinTime = new Date((p.fecha_registro ?? p.created_at) as string).getTime();

        // Contar cultos consecutivos sin asistir, desde el más reciente
        let streak = 0;
        for (const c of cultosPasados) {
          const ct = new Date(c.fecha).getTime();
          if (ct < joinTime) break;              // antes de unirse: no cuenta
          if (asistencias.has(Number(c.id))) break; // asistió: corta la racha
          streak++;
        }

        return {
          id: pId,
          nombre: p.nombre,
          source_tipo: p.source_tipo,
          telefono: p.telefono,
          nombre_apoderado: p.nombre_apoderado ?? null,
          telefono_apoderado: p.telefono_apoderado ?? null,
          streak,
          nivel: clasificar(streak),
        };
      });

    setRows(resultado);
    setLoading(false);
  }

  const verdes = rows.filter((r) => r.nivel === 'verde').length;
  const amarillos = rows.filter((r) => r.nivel === 'amarillo').length;
  const rojos = rows.filter((r) => r.nivel === 'rojo').length;

  // Lista accionable: amarillo + rojo, más críticos primero
  const accionables = rows
    .filter((r) => r.nivel !== 'verde')
    .sort((a, b) => b.streak - a.streak);

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Seguimiento
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Ausencias consecutivas a los cultos · 0-1 al día · 2 atención · 3+ urgente
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
              ['verde', verdes],
              ['amarillo', amarillos],
              ['rojo', rojos],
            ] as [Nivel, number][]).map(([nivel, count]) => (
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
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-md font-medium ${st.badge}`}>
                            {r.streak} cultos
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
