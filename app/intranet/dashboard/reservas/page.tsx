'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { formatCLP, formatFechaCL } from '@/lib/finanzas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  PiggyBank, Plus, Loader2, ArrowDownCircle, ArrowUpCircle, History, Archive,
  ArchiveRestore, Trash2, Wallet,
} from 'lucide-react';

const hoy = () => new Date().toISOString().slice(0, 10);

interface Reserva {
  id: number;
  nombre: string;
  archivada: boolean;
  created_at: string;
  saldo: number;
}

interface MovimientoReserva {
  id: number;
  fecha: string;
  tipo: 'deposito' | 'retiro';
  monto: number;
  notas: string | null;
}

export default function ReservasPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Solo el perfil gerencial (pastor) accede a Reservas — mismo criterio que Finanzas
  useEffect(() => {
    if (user && user.role !== 'pastor') router.replace('/intranet/dashboard');
  }, [user, router]);

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [saldoGeneral, setSaldoGeneral] = useState(0);
  const [disponible, setDisponible] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verArchivadas, setVerArchivadas] = useState(false);

  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);

  const [movimiento, setMovimiento] = useState<{ reserva: Reserva; tipo: 'deposito' | 'retiro' } | null>(null);
  const [montoMov, setMontoMov] = useState('');
  const [fechaMov, setFechaMov] = useState(hoy());
  const [notasMov, setNotasMov] = useState('');
  const [guardandoMov, setGuardandoMov] = useState(false);

  const [historial, setHistorial] = useState<Reserva | null>(null);
  const [movimientosHistorial, setMovimientosHistorial] = useState<MovimientoReserva[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [eliminar, setEliminar] = useState<Reserva | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch('/api/finanzas/reservas');
      const data = await res.json();
      setReservas(data.reservas ?? []);
      setSaldoGeneral(data.saldoGeneral ?? 0);
      setDisponible(data.disponible ?? 0);
    } catch {
      toast.error('No pudimos cargar Reservas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const totalReservado = useMemo(() => reservas.reduce((s, r) => s + r.saldo, 0), [reservas]);
  const visibles = useMemo(
    () => reservas.filter((r) => verArchivadas || !r.archivada),
    [reservas, verArchivadas],
  );

  async function crearReserva(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    try {
      const res = await fetch('/api/finanzas/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre.trim() }),
      });
      if (res.ok) {
        toast.success('Reserva creada.');
        setNuevoNombre('');
        setNuevaAbierta(false);
        cargar();
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Error al crear.' }));
        toast.error(error ?? 'Error al crear.');
      }
    } finally {
      setCreando(false);
    }
  }

  function abrirMovimiento(reserva: Reserva, tipo: 'deposito' | 'retiro') {
    setMovimiento({ reserva, tipo });
    setMontoMov('');
    setFechaMov(hoy());
    setNotasMov('');
  }

  async function guardarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    if (!movimiento || !(Number(montoMov) > 0)) {
      toast.error('Ingresa un monto válido.');
      return;
    }
    setGuardandoMov(true);
    try {
      const res = await fetch(`/api/finanzas/reservas/${movimiento.reserva.id}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: movimiento.tipo,
          monto: Number(montoMov),
          fecha: fechaMov,
          notas: notasMov,
        }),
      });
      if (res.ok) {
        toast.success(movimiento.tipo === 'deposito' ? 'Depósito registrado.' : 'Retiro registrado.');
        setMovimiento(null);
        cargar();
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Error al guardar.' }));
        toast.error(error ?? 'Error al guardar.');
      }
    } finally {
      setGuardandoMov(false);
    }
  }

  async function abrirHistorial(reserva: Reserva) {
    setHistorial(reserva);
    setCargandoHistorial(true);
    try {
      const res = await fetch(`/api/finanzas/reservas/${reserva.id}/movimientos`);
      const data = await res.json();
      setMovimientosHistorial(data.movimientos ?? []);
    } catch {
      toast.error('No se pudo cargar el historial.');
    } finally {
      setCargandoHistorial(false);
    }
  }

  async function alternarArchivada(reserva: Reserva) {
    const res = await fetch(`/api/finanzas/reservas/${reserva.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivada: !reserva.archivada }),
    });
    if (res.ok) {
      toast.success(reserva.archivada ? 'Reserva desarchivada.' : 'Reserva archivada.');
      cargar();
    } else {
      toast.error('No se pudo actualizar.');
    }
  }

  async function confirmarEliminar() {
    if (!eliminar) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/finanzas/reservas/${eliminar.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Reserva eliminada.');
        setEliminar(null);
        cargar();
      } else {
        const { error } = await res.json().catch(() => ({ error: 'No se pudo eliminar.' }));
        toast.error(error ?? 'No se pudo eliminar.');
      }
    } finally {
      setEliminando(false);
    }
  }

  if (!user || user.role !== 'pastor') return null;

  return (
    <div>
      <div className="mb-6 md:mb-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-primary" />
            Reservas
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Plata apartada del saldo general — sigue siendo de la iglesia, solo que ya tiene un destino
          </p>
        </div>
        <Button onClick={() => setNuevaAbierta(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva reserva
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Panorama general */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo total (Finanzas)</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">{formatCLP(saldoGeneral)}</p>
                </div>
                <Wallet className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Reservado</p>
                  <p className="text-lg font-bold text-primary tabular-nums">{formatCLP(totalReservado)}</p>
                </div>
                <PiggyBank className="h-5 w-5 text-primary shrink-0" />
              </CardContent>
            </Card>
            <Card className={disponible >= 0 ? 'bg-green-50 border-green-200' : 'bg-destructive/5 border-destructive/20'}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Disponible para reservar</p>
                <p className={`text-lg font-bold tabular-nums ${disponible >= 0 ? 'text-green-700' : 'text-destructive'}`}>
                  {formatCLP(disponible)}
                </p>
              </CardContent>
            </Card>
          </div>

          {reservas.some((r) => r.archivada) && (
            <button
              type="button"
              onClick={() => setVerArchivadas((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {verArchivadas ? 'Ocultar archivadas' : 'Ver archivadas'}
            </button>
          )}

          {/* Reservas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibles.length === 0 ? (
              <p className="text-muted-foreground text-sm py-10 text-center col-span-full">
                Sin reservas {verArchivadas ? '' : 'activas'}. Crea una para empezar a ahorrar.
              </p>
            ) : (
              visibles.map((r) => (
                <Card key={r.id} className={r.archivada ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2 min-w-0">
                        <span className="truncate">{r.nombre}</span>
                        {r.archivada && <Badge variant="outline" className="shrink-0 text-[10px]">Archivada</Badge>}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-2xl font-bold text-primary tabular-nums">{formatCLP(r.saldo)}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => abrirMovimiento(r, 'deposito')} disabled={r.archivada}>
                        <ArrowDownCircle className="h-4 w-4 mr-1.5 text-green-600" />
                        Depositar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => abrirMovimiento(r, 'retiro')} disabled={r.saldo <= 0}>
                        <ArrowUpCircle className="h-4 w-4 mr-1.5 text-destructive" />
                        Retirar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => abrirHistorial(r)}>
                        <History className="h-4 w-4 mr-1.5" />
                        Historial
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => alternarArchivada(r)} title={r.archivada ? 'Desarchivar' : 'Archivar'}>
                        {r.archivada ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                      {r.saldo === 0 && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setEliminar(r)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Nueva reserva */}
      <Dialog open={nuevaAbierta} onOpenChange={(o) => { if (!o) setNuevaAbierta(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              Nueva reserva
            </DialogTitle>
            <DialogDescription>Ponle un nombre — luego le depositas cuando quieras apartar plata.</DialogDescription>
          </DialogHeader>
          <form onSubmit={crearReserva} className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                autoFocus
                placeholder="Ej: Ahorro para el retiro de jóvenes"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setNuevaAbierta(false)} disabled={creando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creando || !nuevoNombre.trim()}>
                {creando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Crear reserva'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Depositar / Retirar */}
      <Dialog open={!!movimiento} onOpenChange={(o) => { if (!o) setMovimiento(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movimiento?.tipo === 'deposito' ? (
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-destructive" />
              )}
              {movimiento?.tipo === 'deposito' ? 'Depositar en' : 'Retirar de'} {movimiento?.reserva.nombre}
            </DialogTitle>
            <DialogDescription>
              {movimiento?.tipo === 'deposito'
                ? `Disponible para reservar: ${formatCLP(disponible)}`
                : `Saldo actual de esta reserva: ${movimiento ? formatCLP(movimiento.reserva.saldo) : ''}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={guardarMovimiento} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto (CLP)</Label>
                <Input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  autoFocus
                  value={montoMov}
                  onChange={(e) => setMontoMov(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" value={fechaMov} onChange={(e) => setFechaMov(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                placeholder="Ej: Excedente de diciembre"
                value={notasMov}
                onChange={(e) => setNotasMov(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setMovimiento(null)} disabled={guardandoMov}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardandoMov}>
                {guardandoMov ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Historial de una reserva */}
      <Dialog open={!!historial} onOpenChange={(o) => { if (!o) setHistorial(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historial · {historial?.nombre}
            </DialogTitle>
          </DialogHeader>
          {cargandoHistorial ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : movimientosHistorial.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin movimientos todavía.</p>
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {movimientosHistorial.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatFechaCL(m.fecha)}</span>
                      <Badge
                        variant="outline"
                        className={m.tipo === 'deposito' ? 'text-green-700 border-green-200 bg-green-50' : 'text-destructive border-destructive/20 bg-destructive/5'}
                      >
                        {m.tipo === 'deposito' ? 'Depósito' : 'Retiro'}
                      </Badge>
                    </div>
                    {m.notas && <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.notas}</p>}
                  </div>
                  <span className={`font-semibold tabular-nums shrink-0 ${m.tipo === 'deposito' ? 'text-green-700' : 'text-destructive'}`}>
                    {m.tipo === 'deposito' ? '+' : '-'}{formatCLP(m.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <Dialog open={!!eliminar} onOpenChange={(o) => { if (!o && !eliminando) setEliminar(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar reserva
            </DialogTitle>
            <DialogDescription>
              Se eliminará <span className="font-semibold text-foreground">{eliminar?.nombre}</span> y su historial. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEliminar(null)} disabled={eliminando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarEliminar} disabled={eliminando}>
              {eliminando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminando...</> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
