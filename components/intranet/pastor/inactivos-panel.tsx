'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getRetiros, type RetiroRow } from '@/lib/datos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, RotateCcw, Trash2, ShieldAlert, UserMinus } from 'lucide-react';

const formatFecha = (iso: string) =>
  new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

/**
 * Miembros dados de baja: siguen en la base con todo su historial, pero fuera
 * de listados y estadísticas. Desde acá se les puede devolver la actividad o
 * borrarlos de verdad.
 */
export function InactivosPanel({ onCambio }: { onCambio?: () => void }) {
  const [retiros, setRetiros] = useState<RetiroRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [reactivando, setReactivando] = useState<RetiroRow | null>(null);
  const [eliminando, setEliminando] = useState<RetiroRow | null>(null);
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // Sin persona_id son bajas cuya ficha ya se borró definitivamente: el
      // registro queda como historial, pero la persona ya no existe y no tiene
      // sentido ofrecer reactivarla.
      setRetiros((await getRetiros()).filter((r) => r.persona_id != null));
    } catch {
      toast.error('No se pudieron cargar los miembros inactivos.');
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cerrarDialogos = () => {
    setReactivando(null);
    setEliminando(null);
    setPwd('');
    setError('');
  };

  async function reactivar() {
    if (!reactivando) return;
    setTrabajando(true);
    const res = await fetch(`/api/retiros/${reactivando.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success(`${reactivando.nombre} vuelve a ser miembro activo, con su historial.`);
      cerrarDialogos();
      await cargar();
      onCambio?.();
    } else {
      const { error: e } = await res.json().catch(() => ({ error: 'Error al reactivar.' }));
      setError(e ?? 'Error al reactivar.');
    }
    setTrabajando(false);
  }

  async function eliminarDefinitivo() {
    if (!eliminando?.persona_id) return;
    setTrabajando(true);
    const res = await fetch(`/api/personas/${eliminando.persona_id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    if (res.ok) {
      toast.success(`${eliminando.nombre} fue eliminado definitivamente.`);
      cerrarDialogos();
      await cargar();
      onCambio?.();
    } else {
      const { error: e } = await res.json().catch(() => ({ error: 'Error al eliminar.' }));
      setError(e ?? 'Error al eliminar.');
    }
    setTrabajando(false);
  }

  return (
    <>
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserMinus className="h-5 w-5 text-muted-foreground" aria-hidden />
            Miembros inactivos
            {retiros.length > 0 && <Badge variant="secondary">{retiros.length}</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Fuera de los listados y de las estadísticas, pero conservados en la base con todo su
            historial — por si vuelven o para invitarlos a algo puntual
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : retiros.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay miembros dados de baja.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {retiros.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Baja el {formatFecha(r.fecha_retiro)} · {r.motivo}
                    </p>
                    {r.observaciones && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">{r.observaciones}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => { cerrarDialogos(); setReactivando(r); }}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      Reactivar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => { cerrarDialogos(); setEliminando(r); }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Reactivar */}
      <Dialog open={!!reactivando} onOpenChange={(o) => { if (!o && !trabajando) cerrarDialogos(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" aria-hidden />
              Reactivar miembro
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{reactivando?.nombre}</span> volverá a
              aparecer en los listados y en las estadísticas, con todo su historial de asistencia
              intacto — nunca se borró.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cerrarDialogos} disabled={trabajando}>Cancelar</Button>
            <Button onClick={reactivar} disabled={trabajando}>
              {trabajando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reactivando...</> : 'Reactivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar definitivamente */}
      <Dialog open={!!eliminando} onOpenChange={(o) => { if (!o && !trabajando) cerrarDialogos(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" aria-hidden />
              Eliminar definitivamente
            </DialogTitle>
            <DialogDescription>
              Se borrará la ficha de{' '}
              <span className="font-semibold text-foreground">{eliminando?.nombre}</span> y todo su
              historial de asistencia. Esto no es dar de baja: la persona desaparece de la base y no
              se puede recuperar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Si solo quieres que deje de aparecer, cancela: ya está inactivo y así conservas sus
                datos.
              </span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd-eliminar-inactivo">Contraseña del pastor</Label>
              <Input
                id="pwd-eliminar-inactivo"
                type="password"
                value={pwd}
                autoFocus
                onChange={(e) => setPwd(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && pwd) eliminarDefinitivo(); }}
                placeholder="••••••••"
                disabled={trabajando}
              />
            </div>
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cerrarDialogos} disabled={trabajando}>Cancelar</Button>
            <Button variant="destructive" onClick={eliminarDefinitivo} disabled={trabajando || !pwd}>
              {trabajando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</> : 'Eliminar para siempre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
