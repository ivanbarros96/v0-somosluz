'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { buscarPersonas } from '@/lib/datos';
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
  Wallet, TrendingUp, TrendingDown, Receipt, Loader2, Trash2, Pencil, Plus, ExternalLink,
  ArrowLeftRight, Download, X,
} from 'lucide-react';
import {
  type Ingreso, type Egreso, type Movimiento, type TipoIngreso, type CategoriaEgreso,
  TIPOS_INGRESO, LABEL_TIPO_INGRESO, CATEGORIAS_EGRESO, labelCategoriaEgreso,
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

// Campo de persona: busca entre miembros ya registrados (autocompletar) o
// permite dejar cualquier nombre libre (visitantes, proveedores). Si el
// usuario edita el texto después de elegir una sugerencia, se trata como
// nombre libre de nuevo (personaId vuelve a null).
function PersonaField({
  nombre,
  onChange,
  placeholder = 'Nombre (opcional) — busca un miembro o escribe uno nuevo',
}: {
  nombre: string;
  onChange: (nombre: string, personaId: string | null) => void;
  placeholder?: string;
}) {
  const [resultados, setResultados] = useState<{ id: string; nombre: string }[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (nombre.trim().length < 2) {
      setResultados([]);
      setDropdownOpen(false);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(async () => {
      const data = await buscarPersonas(nombre).catch(() => []);
      // El id llega como número desde la API; el resto del formulario lo maneja como texto.
      setResultados(data.map((p) => ({ id: String(p.id), nombre: p.nombre })));
      setDropdownOpen(true);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre]);

  return (
    <div className="relative" ref={ref}>
      <Input
        value={nombre}
        onChange={(e) => onChange(e.target.value, null)}
        onFocus={() => {
          if (resultados.length > 0) setDropdownOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {buscando && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {dropdownOpen && resultados.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {resultados.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(p.nombre, p.id);
                setDropdownOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors text-sm"
            >
              {p.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Selector de categoría de egreso. Al elegir "Otros" pide escribir el nombre
// de la categoría; si alguna ya se repitió 3+ veces en el historial, aparece
// como atajo (clic y listo, sin volver a tipearla).
function CategoriaEgresoField({
  categoria,
  categoriaPersonalizada,
  categoriasFrecuentes,
  onChange,
}: {
  categoria: CategoriaEgreso | typeof SIN_CATEGORIA;
  categoriaPersonalizada: string;
  categoriasFrecuentes: string[];
  onChange: (categoria: CategoriaEgreso | typeof SIN_CATEGORIA, categoriaPersonalizada: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Select
        value={categoria}
        onValueChange={(v) => onChange(v as CategoriaEgreso, v === 'otros' ? categoriaPersonalizada : '')}
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
      {categoria === 'otros' && (
        <>
          <Input
            placeholder="Nombre de la categoría (ej: Flete, Regalo)"
            value={categoriaPersonalizada}
            onChange={(e) => onChange('otros', e.target.value)}
          />
          {categoriasFrecuentes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {categoriasFrecuentes.map((texto) => (
                <button
                  key={texto}
                  type="button"
                  onClick={() => onChange('otros', texto)}
                  className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                    categoriaPersonalizada === texto
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
    personaNombre: '',
    personaId: null as string | null,
  });
  const [guardandoIngreso, setGuardandoIngreso] = useState(false);

  const [formEgreso, setFormEgreso] = useState({
    fecha: hoy(),
    detalle: '',
    monto: '',
    categoria: SIN_CATEGORIA as CategoriaEgreso | typeof SIN_CATEGORIA,
    categoriaPersonalizada: '',
    personaNombre: '',
    personaId: null as string | null,
  });
  const [comprobantes, setComprobantes] = useState<File[]>([]);
  const [guardandoEgreso, setGuardandoEgreso] = useState(false);

  // Categorías "Otros: X" que ya se repitieron 3+ veces en todo el historial —
  // aparecen como atajo seleccionable en vez de tener que volver a escribirlas.
  const [categoriasFrecuentes, setCategoriasFrecuentes] = useState<string[]>([]);

  const [eliminarIngreso, setEliminarIngreso] = useState<Ingreso | null>(null);
  const [eliminarEgreso, setEliminarEgreso] = useState<Egreso | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Edición
  const [editandoIngreso, setEditandoIngreso] = useState<Ingreso | null>(null);
  const [formEditIngreso, setFormEditIngreso] = useState({
    fecha: '',
    tipo: 'diezmo' as TipoIngreso,
    monto: '',
    notas: '',
    personaNombre: '',
    personaId: null as string | null,
  });
  const [guardandoEditIngreso, setGuardandoEditIngreso] = useState(false);

  const [editandoEgreso, setEditandoEgreso] = useState<Egreso | null>(null);
  const [formEditEgreso, setFormEditEgreso] = useState({
    fecha: '',
    detalle: '',
    monto: '',
    categoria: SIN_CATEGORIA as CategoriaEgreso | typeof SIN_CATEGORIA,
    categoriaPersonalizada: '',
    personaNombre: '',
    personaId: null as string | null,
  });
  const [guardandoEditEgreso, setGuardandoEditEgreso] = useState(false);
  // Comprobantes existentes marcados para borrar (por id) + fotos nuevas a agregar.
  const [comprobantesABorrar, setComprobantesABorrar] = useState<Set<number>>(new Set());
  const [comprobantesNuevos, setComprobantesNuevos] = useState<File[]>([]);
  const [comprobantesNuevosPreview, setComprobantesNuevosPreview] = useState<string[]>([]);

  useEffect(() => {
    const urls = comprobantesNuevos.map((f) => URL.createObjectURL(f));
    setComprobantesNuevosPreview(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [comprobantesNuevos]);

  // Rango histórico (primer registro) — una sola vez, para armar el selector de meses
  useEffect(() => {
    fetch('/api/finanzas/rango')
      .then((r) => r.json())
      .then((d) => setRangoDesde(d.desde ?? null))
      .catch(() => setRangoDesde(null));
  }, []);

  const opciones = useMemo(() => opcionesMes(rangoDesde), [rangoDesde]);

  // Vista previa de las fotos antes de guardar — libera los objetos anteriores
  // para no acumular memoria si el usuario cambia de archivos varias veces.
  const [comprobantesPreview, setComprobantesPreview] = useState<string[]>([]);
  useEffect(() => {
    const urls = comprobantes.map((f) => URL.createObjectURL(f));
    setComprobantesPreview(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [comprobantes]);

  useEffect(() => {
    fetch('/api/finanzas/categorias-frecuentes')
      .then((r) => r.json())
      .then((d) => setCategoriasFrecuentes(d.categorias ?? []))
      .catch(() => {});
  }, []);

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
          personaId: formIngreso.personaId,
          personaNombre: formIngreso.personaNombre,
        }),
      });
      if (res.ok) {
        toast.success('Ingreso registrado.');
        setFormIngreso({ fecha: hoy(), tipo: 'diezmo', monto: '', notas: '', personaNombre: '', personaId: null });
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
    if (formEgreso.categoria === 'otros' && !formEgreso.categoriaPersonalizada.trim()) {
      toast.error('Escribe el nombre de la categoría.');
      return;
    }
    setGuardandoEgreso(true);
    try {
      const body = new FormData();
      body.set('fecha', formEgreso.fecha);
      body.set('detalle', formEgreso.detalle.trim());
      body.set('monto', formEgreso.monto);
      if (formEgreso.categoria !== SIN_CATEGORIA) {
        body.set('categoria', formEgreso.categoria);
        if (formEgreso.categoria === 'otros') {
          body.set('categoriaPersonalizada', formEgreso.categoriaPersonalizada.trim());
        }
      }
      if (formEgreso.personaNombre.trim()) {
        body.set('personaNombre', formEgreso.personaNombre.trim());
        if (formEgreso.personaId) body.set('personaId', formEgreso.personaId);
      }
      comprobantes.forEach((f) => body.append('comprobantes', f));

      const res = await fetch('/api/finanzas/egresos', { method: 'POST', body });
      if (res.ok) {
        if (comprobantes.length) {
          toast.success('Egreso registrado.');
        } else {
          // Aviso suave, no bloqueante: buena práctica contable, sin frenar al usuario.
          toast.warning('Egreso registrado sin foto de comprobante. Puedes agregarla más tarde si la consigues.');
        }
        setFormEgreso({ fecha: hoy(), detalle: '', monto: '', categoria: SIN_CATEGORIA, categoriaPersonalizada: '', personaNombre: '', personaId: null });
        setComprobantes([]);
        cargar(mes);
        fetch('/api/finanzas/categorias-frecuentes').then((r) => r.json()).then((d) => setCategoriasFrecuentes(d.categorias ?? [])).catch(() => {});
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Error al guardar.' }));
        toast.error(error ?? 'Error al guardar.');
      }
    } finally {
      setGuardandoEgreso(false);
    }
  }

  function abrirEditarIngreso(i: Ingreso) {
    setFormEditIngreso({
      fecha: i.fecha,
      tipo: i.tipo,
      monto: String(i.monto),
      notas: i.notas ?? '',
      personaNombre: i.persona_nombre ?? '',
      personaId: i.persona_id ? String(i.persona_id) : null,
    });
    setEditandoIngreso(i);
  }

  async function guardarEditIngreso(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoIngreso) return;
    if (!formEditIngreso.fecha || !(Number(formEditIngreso.monto) > 0)) {
      toast.error('Completa fecha y un monto válido.');
      return;
    }
    setGuardandoEditIngreso(true);
    try {
      const res = await fetch(`/api/finanzas/ingresos/${editandoIngreso.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: formEditIngreso.fecha,
          tipo: formEditIngreso.tipo,
          monto: Number(formEditIngreso.monto),
          notas: formEditIngreso.notas,
          personaId: formEditIngreso.personaId,
          personaNombre: formEditIngreso.personaNombre,
        }),
      });
      if (res.ok) {
        toast.success('Ingreso actualizado.');
        setEditandoIngreso(null);
        cargar(mes);
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Error al actualizar.' }));
        toast.error(error ?? 'Error al actualizar.');
      }
    } finally {
      setGuardandoEditIngreso(false);
    }
  }

  function abrirEditarEgreso(e: Egreso) {
    setFormEditEgreso({
      fecha: e.fecha,
      detalle: e.detalle,
      monto: String(e.monto),
      categoria: e.categoria ?? SIN_CATEGORIA,
      categoriaPersonalizada: e.categoria_personalizada ?? '',
      personaNombre: e.persona_nombre ?? '',
      personaId: e.persona_id ? String(e.persona_id) : null,
    });
    setComprobantesABorrar(new Set());
    setComprobantesNuevos([]);
    setEditandoEgreso(e);
  }

  async function guardarEditEgreso(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoEgreso) return;
    if (!formEditEgreso.fecha || !formEditEgreso.detalle.trim() || !(Number(formEditEgreso.monto) > 0)) {
      toast.error('Completa fecha, detalle y un monto válido.');
      return;
    }
    if (formEditEgreso.categoria === 'otros' && !formEditEgreso.categoriaPersonalizada.trim()) {
      toast.error('Escribe el nombre de la categoría.');
      return;
    }
    setGuardandoEditEgreso(true);
    try {
      const body = new FormData();
      body.set('fecha', formEditEgreso.fecha);
      body.set('detalle', formEditEgreso.detalle.trim());
      body.set('monto', formEditEgreso.monto);
      body.set('categoria', formEditEgreso.categoria === SIN_CATEGORIA ? '' : formEditEgreso.categoria);
      if (formEditEgreso.categoria === 'otros') {
        body.set('categoriaPersonalizada', formEditEgreso.categoriaPersonalizada.trim());
      }
      body.set('personaNombre', formEditEgreso.personaNombre);
      if (formEditEgreso.personaId) body.set('personaId', formEditEgreso.personaId);
      comprobantesABorrar.forEach((id) => body.append('eliminarComprobantes', String(id)));
      comprobantesNuevos.forEach((f) => body.append('comprobantesNuevos', f));

      const res = await fetch(`/api/finanzas/egresos/${editandoEgreso.id}`, {
        method: 'PATCH',
        body,
      });
      if (res.ok) {
        toast.success('Egreso actualizado.');
        setEditandoEgreso(null);
        cargar(mes);
        fetch('/api/finanzas/categorias-frecuentes').then((r) => r.json()).then((d) => setCategoriasFrecuentes(d.categorias ?? [])).catch(() => {});
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Error al actualizar.' }));
        toast.error(error ?? 'Error al actualizar.');
      }
    } finally {
      setGuardandoEditEgreso(false);
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
                      Persona <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <PersonaField
                      nombre={formIngreso.personaNombre}
                      onChange={(nombre, personaId) =>
                        setFormIngreso((f) => ({ ...f, personaNombre: nombre, personaId }))
                      }
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
                      Persona <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <PersonaField
                      nombre={formEgreso.personaNombre}
                      onChange={(nombre, personaId) =>
                        setFormEgreso((f) => ({ ...f, personaNombre: nombre, personaId }))
                      }
                      placeholder="Quién gastó (opcional) — miembro o proveedor"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      Categoría <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <CategoriaEgresoField
                      categoria={formEgreso.categoria}
                      categoriaPersonalizada={formEgreso.categoriaPersonalizada}
                      categoriasFrecuentes={categoriasFrecuentes}
                      onChange={(categoria, categoriaPersonalizada) =>
                        setFormEgreso((f) => ({ ...f, categoria, categoriaPersonalizada }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      Fotos del comprobante{' '}
                      <span className="text-muted-foreground font-normal">(recomendado, hasta 5)</span>
                    </Label>
                    {/* Sin capture="environment": ese atributo abre la cámara directo en
                        el celular y esconde galería/archivos. El selector nativo ya ofrece
                        "Cámara" como una opción más. */}
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setComprobantes(Array.from(e.target.files ?? []).slice(0, 5))}
                    />
                    {comprobantesPreview.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {comprobantesPreview.map((url, i) => (
                          <div key={url} className="relative inline-block">
                            <Image
                              src={url}
                              alt={`Vista previa del comprobante ${i + 1}`}
                              width={96}
                              height={96}
                              unoptimized
                              className="rounded-md border border-border object-cover h-24 w-24"
                            />
                            <button
                              type="button"
                              onClick={() => setComprobantes((prev) => prev.filter((_, j) => j !== i))}
                              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 shadow-sm"
                              aria-label="Quitar foto"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
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
                  <p className="px-4 md:px-6 pb-2 text-xs text-muted-foreground">
                    Solo lectura — para editar o eliminar, usa las pestañas de Ingresos o Egresos.
                  </p>
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
                                      {labelCategoriaEgreso(m.categoria, m.categoriaPersonalizada)}
                                    </Badge>
                                  )}
                                  {m.personaNombre && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      · {m.personaNombre}
                                    </span>
                                  )}
                                  {!!m.comprobantesUrls?.length && (
                                    <a
                                      href={m.comprobantesUrls[0]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-foreground shrink-0"
                                      aria-label="Ver comprobante"
                                      title={m.comprobantesUrls.length > 1 ? `${m.comprobantesUrls.length} fotos` : undefined}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      {m.comprobantesUrls.length > 1 && (
                                        <sup className="ml-0.5">{m.comprobantesUrls.length}</sup>
                                      )}
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
                              {i.persona_nombre && (
                                <span className="text-xs text-muted-foreground">
                                  · {i.persona_nombre}
                                </span>
                              )}
                            </div>
                            {i.notas && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {i.notas}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-semibold text-foreground tabular-nums mr-2">
                              {formatCLP(i.monto)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirEditarIngreso(i)}
                              aria-label="Editar ingreso"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                            {e.comprobantes.length > 0 ? (
                              <a
                                href={e.comprobantes[0].url ?? undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative shrink-0"
                              >
                                <Image
                                  src={e.comprobantes[0].url ?? ''}
                                  alt={`Comprobante: ${e.detalle}`}
                                  width={44}
                                  height={44}
                                  className="rounded-md border border-border object-cover h-11 w-11"
                                />
                                {e.comprobantes.length > 1 && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[10px] leading-none rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                                    {e.comprobantes.length}
                                  </span>
                                )}
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
                                    {labelCategoriaEgreso(e.categoria, e.categoria_personalizada)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatFechaCL(e.fecha)}
                                {e.persona_nombre && <> · {e.persona_nombre}</>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-semibold text-destructive tabular-nums mr-1">
                              -{formatCLP(e.monto)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirEditarEgreso(e)}
                              aria-label="Editar egreso"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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

      {/* Editar ingreso */}
      <Dialog open={!!editandoIngreso} onOpenChange={(o) => { if (!o) setEditandoIngreso(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar ingreso
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarEditIngreso} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formEditIngreso.fecha}
                  onChange={(e) => setFormEditIngreso((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={formEditIngreso.tipo}
                  onValueChange={(v) => setFormEditIngreso((f) => ({ ...f, tipo: v as TipoIngreso }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_INGRESO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                value={formEditIngreso.monto}
                onChange={(e) => setFormEditIngreso((f) => ({ ...f, monto: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Persona <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <PersonaField
                nombre={formEditIngreso.personaNombre}
                onChange={(nombre, personaId) =>
                  setFormEditIngreso((f) => ({ ...f, personaNombre: nombre, personaId }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                value={formEditIngreso.notas}
                onChange={(e) => setFormEditIngreso((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditandoIngreso(null)} disabled={guardandoEditIngreso}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardandoEditIngreso}>
                {guardandoEditIngreso ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Editar egreso */}
      <Dialog open={!!editandoEgreso} onOpenChange={(o) => { if (!o) setEditandoEgreso(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar egreso
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarEditEgreso} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formEditEgreso.fecha}
                  onChange={(e) => setFormEditEgreso((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Monto (CLP)</Label>
                <Input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={formEditEgreso.monto}
                  onChange={(e) => setFormEditEgreso((f) => ({ ...f, monto: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Detalle</Label>
              <Input
                value={formEditEgreso.detalle}
                onChange={(e) => setFormEditEgreso((f) => ({ ...f, detalle: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Persona <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <PersonaField
                nombre={formEditEgreso.personaNombre}
                onChange={(nombre, personaId) =>
                  setFormEditEgreso((f) => ({ ...f, personaNombre: nombre, personaId }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Categoría <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <CategoriaEgresoField
                categoria={formEditEgreso.categoria}
                categoriaPersonalizada={formEditEgreso.categoriaPersonalizada}
                categoriasFrecuentes={categoriasFrecuentes}
                onChange={(categoria, categoriaPersonalizada) =>
                  setFormEditEgreso((f) => ({ ...f, categoria, categoriaPersonalizada }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fotos del comprobante</Label>
              {editandoEgreso && editandoEgreso.comprobantes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editandoEgreso.comprobantes.map((c) => {
                    const marcada = comprobantesABorrar.has(c.id);
                    return (
                      <div key={c.id} className="relative inline-block">
                        <Image
                          src={c.url ?? ''}
                          alt="Comprobante"
                          width={72}
                          height={72}
                          unoptimized
                          className={`rounded-md border object-cover h-18 w-18 ${marcada ? 'opacity-30 border-destructive' : 'border-border'}`}
                          style={{ height: 72, width: 72 }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setComprobantesABorrar((prev) => {
                              const next = new Set(prev);
                              if (marcada) next.delete(c.id); else next.add(c.id);
                              return next;
                            })
                          }
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 shadow-sm"
                          aria-label={marcada ? 'Deshacer eliminación' : 'Quitar esta foto'}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Label className="text-muted-foreground font-normal text-xs">
                Agregar {editandoEgreso && editandoEgreso.comprobantes.length > 0 ? 'más fotos' : 'una foto'}{' '}
                (o reemplaza: marca la actual para quitarla y sube la nueva aquí)
              </Label>
              {/* Sin capture: ver comentario en el formulario de egreso nuevo. */}
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setComprobantesNuevos(Array.from(e.target.files ?? []).slice(0, 5))}
              />
              {comprobantesNuevosPreview.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {comprobantesNuevosPreview.map((url, i) => (
                    <div key={url} className="relative inline-block">
                      <Image
                        src={url}
                        alt={`Foto nueva ${i + 1}`}
                        width={72}
                        height={72}
                        unoptimized
                        className="rounded-md border border-primary object-cover"
                        style={{ height: 72, width: 72 }}
                      />
                      <button
                        type="button"
                        onClick={() => setComprobantesNuevos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 shadow-sm"
                        aria-label="Quitar foto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditandoEgreso(null)} disabled={guardandoEditEgreso}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardandoEditEgreso}>
                {guardandoEditEgreso ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
