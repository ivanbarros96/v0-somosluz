'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserX, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MOTIVOS = [
  'Se mudó de ciudad/país',
  'Problemas personales',
  'Cambio de iglesia',
  'Enfermedad o salud',
  'Trabajo / horario incompatible',
  'Sin contacto (inubicable)',
  'Otro',
] as const;

const OTRO = 'Otro';
const DIAS_UMBRAL = 30;

interface AusenteRow {
  id: number;
  nombre: string;
  source_tipo: string;
  telefono: string | null;
  ultimaFecha: string | null;
  diasAusente: number;
}

export default function RetirosPage() {
  const [ausentes, setAusentes] = useState<AusenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AusenteRow | null>(null);
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0]);
  const [motivoOtro, setMotivoOtro] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAusentes(); }, []);

  async function loadAusentes() {
    setLoading(true);

    // IDs ya retirados
    const { data: retirosExist } = await supabase
      .from('retiros')
      .select('persona_id')
      .not('persona_id', 'is', null);
    const retiradosIds = new Set((retirosExist ?? []).map((r: any) => Number(r.persona_id)));

    // Todas las personas
    const { data: personas } = await supabase
      .from('personas')
      .select('id, nombre, source_tipo, telefono');

    if (!personas) { setLoading(false); return; }

    // Todas las asistencias con la fecha del culto
    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('persona_id, cultos(fecha)')
      .not('persona_id', 'is', null);

    // Última fecha de asistencia por persona
    const ultimaFechaPorPersona: Record<number, string> = {};
    for (const a of asistencias ?? []) {
      if (!a.persona_id) continue;
      const pId = Number(a.persona_id);
      const fecha: string | undefined = (a.cultos as any)?.fecha;
      if (fecha && (!ultimaFechaPorPersona[pId] || fecha > ultimaFechaPorPersona[pId])) {
        ultimaFechaPorPersona[pId] = fecha;
      }
    }

    const hoy = Date.now();
    const resultado: AusenteRow[] = personas
      .filter((p) => !retiradosIds.has(Number(p.id)))
      .map((p) => {
        const pId = Number(p.id);
        const ultima = ultimaFechaPorPersona[pId] ?? null;
        const dias = ultima
          ? Math.floor((hoy - new Date(ultima).getTime()) / 86_400_000)
          : 9999;
        return { id: pId, nombre: p.nombre, source_tipo: p.source_tipo, telefono: p.telefono, ultimaFecha: ultima, diasAusente: dias };
      })
      .filter((p) => p.diasAusente >= DIAS_UMBRAL)
      .sort((a, b) => b.diasAusente - a.diasAusente);

    setAusentes(resultado);
    setLoading(false);
  }

  function openModal(row: AusenteRow) {
    setSelected(row);
    setMotivo(MOTIVOS[0]);
    setMotivoOtro('');
    setObservaciones('');
  }

  const motivoFinal = motivo === OTRO ? motivoOtro.trim() : motivo;
  const puedeGuardar = motivoFinal.length > 0;

  async function confirmarRetiro() {
    if (!selected || !puedeGuardar) return;
    setSaving(true);

    const res = await fetch('/api/retiros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona_id: selected.id,
        nombre: selected.nombre,
        motivo: motivoFinal,
        observaciones: observaciones || null,
      }),
    });

    if (!res.ok) {
      toast.error('Error al guardar el retiro');
    } else {
      toast.success(`${selected.nombre} registrado como retirado`);
      setAusentes((prev) => prev.filter((a) => a.id !== selected.id));
      setSelected(null);
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <UserX className="h-6 w-6 text-orange-500" />
          Retiros
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Miembros sin asistencia en +{DIAS_UMBRAL} días · confirma y registra el motivo del retiro
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : ausentes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="font-semibold text-foreground text-lg">Sin candidatos a retiro</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Todos los miembros han asistido en el último mes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="p-4 md:p-6 border-b border-border">
            <CardTitle className="text-base">{ausentes.length} personas ausentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {ausentes.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 md:px-6 py-4 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {a.nombre.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground font-medium text-sm truncate">{a.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-muted-foreground text-xs capitalize">{a.source_tipo}</span>
                        {a.ultimaFecha ? (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Última vez {formatDistanceToNow(parseISO(a.ultimaFecha), { addSuffix: true, locale: es })}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin asistencias registradas</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                      a.diasAusente >= 90
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-orange-500/10 text-orange-600'
                    }`}>
                      {a.diasAusente === 9999 ? 'Nunca' : `${a.diasAusente}d`}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => openModal(a)}
                    >
                      Registrar retiro
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar retiro</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="bg-muted rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold">
                {selected?.nombre.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{selected?.nombre}</p>
                <p className="text-muted-foreground text-xs capitalize">{selected?.source_tipo}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Motivo del retiro</Label>
              <RadioGroup value={motivo} onValueChange={setMotivo} className="space-y-2">
                {MOTIVOS.map((m) => (
                  <div key={m} className="flex items-center gap-2">
                    <RadioGroupItem value={m} id={m} />
                    <Label htmlFor={m} className="text-sm font-normal cursor-pointer">{m}</Label>
                  </div>
                ))}
              </RadioGroup>

              {motivo === OTRO && (
                <Input
                  autoFocus
                  placeholder="Escribe el motivo..."
                  value={motivoOtro}
                  onChange={(e) => setMotivoOtro(e.target.value)}
                  className="text-sm mt-1"
                  maxLength={120}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Observaciones <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                placeholder="Detalles adicionales..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="resize-none text-sm"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setSelected(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={confirmarRetiro} disabled={saving || !puedeGuardar} variant="destructive">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Confirmar retiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
