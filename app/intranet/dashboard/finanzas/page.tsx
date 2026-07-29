'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Wallet, TrendingUp, TrendingDown, Receipt, Loader2, Trash2, Plus, ExternalLink,
  ArrowLeftRight, Download, X,
} from 'lucide-react';
import {
  type Ingreso, type Egreso, type Movimiento, type TipoIngreso, type CategoriaEgreso,
  TIPOS_INGRESO, LABEL_TIPO_INGRESO, CATEGORIAS_EGRESO, LABEL_CATEGORIA_EGRESO,
  opcionesMes, formatCLP, formatFechaCL,
} from '@/lib/finanzas';

// Usa hora LOCAL (Chile) en vez de .toISOString(), que convierte a UTC y podía
// adelantar la fecha/mes hasta 4 horas durante la noche (bug corregido).
const mesActual = () => format(new Date(), 'yyyy-MM');
const hoy = () => format(new Date(), 'yyyy-MM-dd');

const BADGE_TIPO: Record<TipoIngreso, string> = {
  diezmo: 'bg-primary/10 text-primary border-primary/25',
  ofrenda: 'bg-accent/10 text-accent border-accent/25',
  ofrenda_especial: 'bg-amber-100 text-amber-700 border-amber-200',
};

const SIN_CATEGORIA = '__sin_categoria__';

export default function FinanzasPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Solo el perfil gerencial (pastor) accede a Finanzas
  useEffect(() => {
    if (user && user.role !== 'pastor') router.replace('/intranet/dashboard');
  }, [user, router]);

  const [mes, setMes] = useState(mesActual());
  const [rangoDesde, setRangoDesde] = useState<string | null>(null);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  const [formIngreso, setFormIngreso] = useState({
    fecha: hoy(),
    tipo: 'diezmo' as TipoIngreso,
    monto: '',
    notas: '',
  });
  const [guardandoIngreso, setGuardandoIngreso] = useState(false);

  const [formEgreso, setFormEgreso] = useState({
    fecha: hoy(),
    detalle: '',
    monto: '',
    categoria: SIN_CATEGORIA as CategoriaEgreso | typeof SIN_CATEGORIA,
  });
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  const [guardandoEgreso, setGuardandoEgreso] = useState(false);

  const [eliminarIngreso, setEliminarIngreso] = useState<Ingreso | null>(null);
  const [eliminarEgreso, setEliminarEgreso] = useState<Egreso | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Rango histórico (primer registro) — una sola vez, para armar el selector de meses
  useEffect(() => {
    fetch('/api/finanzas/rango')
      .then((r) => r.json())
      .then((d) => setRangoDesde(d.desde ?? null))
      .catch(() => setRangoDesde(null));
  }, []);

  const opciones = useMemo(() => opcionesMes(rangoDesde), [rangoDesde]);

  // Vista previa de la foto antes de guardar — libera el objeto anterior para
  // no acumular memoria si el usuario cambia de archivo varias veces.
  useEffect(() => {
    if (!comprobante) {
      setComprobantePreview(null);
      return;
    }
    const url = URL.createObjectURL(comprobante);
    setComprobantePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [comprobante]);

  async function cargar(mesConsulta: string) {
    setLoading(true);
    try {
      const [rIngresos, rEgresos, rMovimientos] = await Promise.all([
        fetch(`/api/finanzas/ingresos?mes=${mesConsulta}`),
        fetch(`/api/finanzas/egresos?mes=${mesConsulta}`),
        fetch(`/api/finanzas/movimientos?mes=${mesConsulta}`),
      ]);
      const [dIngresos, dEgresos, dMovimientos] = await Promise.all([
        rIngresos.json(),
        rEgresos.json(),
        rMovimientos.json(),
      ]);
      setIngresos(dIngresos.ingresos ?? []);
      setEgresos(dEgresos.egresos ?? []);
      setMovimientos(dMovimientos.movimientos ?? []);
    } catch {
      toast.error('No pudimos cargar los datos de Finanzas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar(mes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  const resumen = useMemo(() => {
    const porTipo = (tipo: TipoIngreso) =>
      ingresos.filter((i) => i.tipo === tipo).reduce((s, i) => s + Number(i.monto), 0);
    const totalDiezmo = porTipo('diezmo');
    const totalOfrenda = porTipo('ofrenda');
    const totalOfrendaEspecial = porTipo('ofrenda_especial');
    const totalIngresos = totalDiezmo + totalOfrenda + totalOfrendaEspecial;
    const totalEgresos = egresos.reduce((s, e) => s + Number(e.monto), 0);
    return {
      totalDiezmo,
      totalOfrenda,
      totalOfrendaEspecial,
      totalIngresos,
      totalEgresos,
      saldo: totalIngresos - totalEgresos,
    };
  }, [ingresos, egresos]);

  const esGeneral = mes === 'general';

  async function registrarIngreso(e: React.FormEvent) {
    e.preventDefault();
    if (!formIngreso.fecha || !(Number(formIngreso.monto) > 0)) {
      toast.error('Completa fecha y un monto válido.');
      return;
    }
    setGuardandoIngreso(true);
    try {
      const res = await fetch('/api/finanzas/ingresos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: formIngreso.fecha,
          tipo: formIngreso.tipo,
          monto: Number(formIngreso.monto),
          notas: formIngreso.notas,
        }),
      });
      if (res.ok) {
        toast.success('Ingreso registrado.');
        setFormIngreso({ fecha: hoy(), tipo: 'diezmo', monto: '', notas: '' });
        cargar(mes);
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Error al guardar.' }));
        toast.error(error ?? 'Error al guardar.');
      }
    } finally {
      setGuardandoIngreso(false);
    }
  }

  async function registrarEgreso(e: React.FormEvent) {
    e.preventDefault();
    if (!formEgreso.fecha || !formEgreso.detalle.trim() || !(Number(formEgreso.monto) > 0)) {
      toast.error('Completa fecha, detalle y un monto válido.');
      return;
    }
    setGuardandoEgreso(true);
    try {
      const body = new FormData();
      body.set('fecha', formEgreso.fecha);
      body.set('detalle', formEgreso.detalle.trim());
      body.set('monto', formEgreso.monto);
      if (formEgreso.categoria !== SIN_CATEGORIA) body.set('categoria', formEgreso.categoria);
      if (comprobante) body.set('comprobante', comprobante);

      const res = await fetch('/api/finanzas/egresos', { method: 'POST', body });
      if (res.ok) {
        if (comprobante) {
          toast.success('Egreso registrado.');
        } else {
          // Aviso suave, no bloqueante: buena práctica contable, sin frenar al usuario.
          toast.warning('Egreso registrado sin foto de comprobante. Puedes agregarla más tarde si la consigues.');
        }
        setFormEgreso({ fecha: hoy(), detalle: '', monto: '', categoria: SIN_CATEGORIA });
        setComprobante(null);
        cargar(mes);
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Error al guardar.' }));
        toast.error(error ?? 'Error al guardar.');
      }
    } finally {
      setGuardandoEgreso(false);
    }
  }

  async function confirmarEliminarIngreso() {
    if (!eliminarIngreso) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/finanzas/ingresos/${eliminarIngreso.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Ingreso eliminado.');
        setEliminarIngreso(null);
        cargar(mes);
      } else {
        toast.error('No se pudo eliminar.');
      }
    } finally {
      setEliminando(false);
    }
  }

  async function confirmarEliminarEgreso() {
    if (!eliminarEgreso) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/finanzas/egresos/${eliminarEgreso.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Egreso eliminado.');
        setEliminarEgreso(null);
        cargar(mes);
      } else {
        toast.error('No se pudo eliminar.');
      }
    } finally {
      setEliminando(false);
    }
  }

  function exportarCSV() {
    window.open(`/api/finanzas/exportar?mes=${mes}`, '_blank');
  }

  if (!user || user.role !== 'pastor') return null;

  return (
    <div>
      <div className="mb-6 md:mb-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Finanzas
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Diezmos, ofrendas y gastos · panorama mensual
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={exportarCSV} title="Exportar a Excel/CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Resumen del período */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Diezmos</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {formatCLP(resumen.totalDiezmo)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Ofrendas</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {formatCLP(resumen.totalOfrenda)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Ofrendas Especiales</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {formatCLP(resumen.totalOfrendaEspecial)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Ingresos</p>
                  <p className="text-lg font-bold text-primary tabular-nums">
                    {formatCLP(resumen.totalIngresos)}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Egresos</p>
                  <p className="text-lg font-bold text-destructive tabular-nums">
                    {formatCLP(resumen.totalEgresos)}
                  </p>
                </div>
                <TrendingDown className="h-5 w-5 text-destructive shrink-0" />
              </CardContent>
            </Card>
            <Card
              className={
                resumen.saldo >= 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-destructive/5 border-destructive/20'
              }
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  {esGeneral ? 'Saldo del período' : 'Saldo del mes'}
                </p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    resumen.saldo >= 0 ? 'text-green-700' : 'text-destructive'
                  }`}
                >
                  {formatCLP(resumen.saldo)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Formularios */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Registrar Ingreso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={registrarIngreso} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={formIngreso.fecha}
                        onChange={(e) => setFormIngreso((f) => ({ ...f, fecha: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Tipo</Label>
                      <Select
                        value={formIngreso.tipo}
                        onValueChange={(v) =>
                          setFormIngreso((f) => ({ ...f, tipo: v as TipoIngreso }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_INGRESO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Monto (CLP)</Label>
                    <Input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      placeholder="Ej: 150000"
                      value={formIngreso.monto}
                      onChange={(e) => setFormIngreso((f) => ({ ...f, monto: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      Notas <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="Ej: Culto general 20/07"
                      value={formIngreso.notas}
                      onChange={(e) => setFormIngreso((f) => ({ ...f, notas: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" disabled={guardandoIngreso} className="w-full">
                    {guardandoIngreso ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Registrar Ingreso
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-destructive" />
                  Registrar Egreso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={registrarEgreso} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={formEgreso.fecha}
                        onChange={(e) => setFormEgreso((f) => ({ ...f, fecha: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Monto (CLP)</Label>
                      <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        placeholder="Ej: 12000"
                        value={formEgreso.monto}
                        onChange={(e) => setFormEgreso((f) => ({ ...f, monto: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Detalle</Label>
                    <Input
                      placeholder="Ej: Cosas de aseo"
                      value={formEgreso.detalle}
                      onChange={(e) => setFormEgreso((f) => ({ ...f, detalle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      Categoría <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Select
                      value={formEgreso.categoria}
                      onValueChange={(v) =>
                        setFormEgreso((f) => ({ ...f, categoria: v as CategoriaEgreso }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SIN_CATEGORIA}>Sin categoría</SelectItem>
                        {CATEGORIAS_EGRESO.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>
                      Foto del comprobante{' '}
                      <span className="text-muted-foreground font-normal">(recomendado)</span>
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                    />
                    {comprobantePreview && (
                      <div className="relative mt-2 inline-block">
                        <Image
                          src={comprobantePreview}
                          alt="Vista previa del comprobante"
                          width={96}
                          height={96}
                          unoptimized
                          className="rounded-md border border-border object-cover h-24 w-24"
                        />
                        <button
                          type="button"
                          onClick={() => setComprobante(null)}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 shadow-sm"
                          aria-label="Quitar foto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={guardandoEgreso}
                    variant="destructive"
                    className="w-full"
                  >
                    {guardandoEgreso ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Registrar Egreso
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Historial */}
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="movimientos">
                <div className="p-4 md:p-6 pb-0">
                  <TabsList className="grid w-full max-w-lg grid-cols-3">
                    <TabsTrigger value="movimientos" className="gap-1.5">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Movimientos <Badge variant="secondary">{movimientos.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="ingresos" className="gap-1.5">
                      Ingresos <Badge variant="secondary">{ingresos.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="egresos" className="gap-1.5">
                      Egresos <Badge variant="secondary">{egresos.length}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="movimientos" className="mt-0">
                  {movimientos.length === 0 ? (
                    <p className="py-10 text-center text-muted-foreground text-sm">
                      Sin movimientos en este período.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Detalle</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movimientos.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatFechaCL(m.fecha)}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate">{m.detalle}</span>
                                  {m.categoria && (
                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                      {LABEL_CATEGORIA_EGRESO[m.categoria]}
                                    </Badge>
                                  )}
                                  {m.comprobante_url && (
                                    <a
                                      href={m.comprobante_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-foreground shrink-0"
                                      aria-label="Ver comprobante"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell
                                className={`text-right font-medium tabular-nums whitespace-nowrap ${
                                  m.tipo === 'ingreso' ? 'text-green-700' : 'text-destructive'
                                }`}
                              >
                                {m.tipo === 'ingreso' ? '+' : '-'}
                                {formatCLP(m.monto)}
                              </TableCell>
                              <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                                {formatCLP(m.saldo)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ingresos" className="mt-0">
                  <div className="divide-y divide-border">
                    {ingresos.length === 0 ? (
                      <p className="py-10 text-center text-muted-foreground text-sm">
                        Sin ingresos registrados en este período.
                      </p>
                    ) : (
                      ingresos.map((i) => (
                        <div
                          key={i.id}
                          className="flex items-center justify-between gap-3 px-4 md:px-6 py-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">
                                {formatFechaCL(i.fecha)}
                              </span>
                              <Badge variant="outline" className={BADGE_TIPO[i.tipo]}>
                                {LABEL_TIPO_INGRESO[i.tipo]}
                              </Badge>
                            </div>
                            {i.notas && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {i.notas}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-semibold text-foreground tabular-nums">
                              {formatCLP(i.monto)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setEliminarIngreso(i)}
                              aria-label="Eliminar ingreso"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="egresos" className="mt-0">
                  <div className="divide-y divide-border">
                    {egresos.length === 0 ? (
                      <p className="py-10 text-center text-muted-foreground text-sm">
                        Sin egresos registrados en este período.
                      </p>
                    ) : (
                      egresos.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between gap-3 px-4 md:px-6 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {e.comprobante_url ? (
                              <a
                                href={e.comprobante_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0"
                              >
                                <Image
                                  src={e.comprobante_url}
                                  alt={`Comprobante: ${e.detalle}`}
                                  width={44}
                                  height={44}
                                  className="rounded-md border border-border object-cover h-11 w-11"
                                />
                              </a>
                            ) : (
                              <div className="h-11 w-11 rounded-md border border-dashed border-border shrink-0 flex items-center justify-center">
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {e.detalle}
                                </p>
                                {e.categoria && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {LABEL_CATEGORIA_EGRESO[e.categoria]}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatFechaCL(e.fecha)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-semibold text-destructive tabular-nums">
                              -{formatCLP(e.monto)}
                            </span>
                            {e.comprobante_url && (
                              <a
                                href={e.comprobante_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Ver comprobante"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setEliminarEgreso(e)}
                              aria-label="Eliminar egreso"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmar eliminación de ingreso */}
      <Dialog
        open={!!eliminarIngreso}
        onOpenChange={(o) => {
          if (!o && !eliminando) setEliminarIngreso(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar ingreso
            </DialogTitle>
            <DialogDescription>
              Se eliminará el registro de{' '}
              {eliminarIngreso && LABEL_TIPO_INGRESO[eliminarIngreso.tipo]} por{' '}
              <span className="font-semibold text-foreground">
                {eliminarIngreso && formatCLP(eliminarIngreso.monto)}
              </span>{' '}
              del {eliminarIngreso && formatFechaCL(eliminarIngreso.fecha)}. Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEliminarIngreso(null)} disabled={eliminando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarEliminarIngreso} disabled={eliminando}>
              {eliminando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación de egreso */}
      <Dialog
        open={!!eliminarEgreso}
        onOpenChange={(o) => {
          if (!o && !eliminando) setEliminarEgreso(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar egreso
            </DialogTitle>
            <DialogDescription>
              Se eliminará <span className="font-semibold text-foreground">{eliminarEgreso?.detalle}</span>{' '}
              por{' '}
              <span className="font-semibold text-foreground">
                {eliminarEgreso && formatCLP(eliminarEgreso.monto)}
              </span>
              , junto a su comprobante. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEliminarEgreso(null)} disabled={eliminando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarEliminarEgreso} disabled={eliminando}>
              {eliminando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
