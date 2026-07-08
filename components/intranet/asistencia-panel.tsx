'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CalendarPlus, Users, UserCheck, XCircle, Trash2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

type Persona = {
  id: number;
  nombre: string;
  tipo: 'adulto' | 'nino' | 'nuevo';
  telefono: string | null;
};

type Culto = {
  id: number;
  fecha: string;
  descripcion: string;
  activo: boolean;
};

type Filtro = 'todos' | 'adulto' | 'nino' | 'nuevo';

function personaKey(p: Persona) {
  return `${p.tipo}::${p.id}`;
}

function tipoBadge(tipo: Persona['tipo']) {
  if (tipo === 'adulto') return <Badge className="bg-primary/10 text-primary border-primary/25 text-xs">Adulto</Badge>;
  if (tipo === 'nino') return <Badge className="bg-accent/10 text-accent border-accent/25 text-xs">Niño</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Nuevo</Badge>;
}

function formatFecha(iso: string) {
  // La fecha del culto se guarda como medianoche UTC (timestamptz).
  // Formateamos en UTC para mostrar el día calendario tal cual fue elegido,
  // sin que la zona del navegador (Chile UTC-4) lo desplace al día anterior.
  return new Date(iso).toLocaleDateString('es-CL', {
    timeZone: 'UTC',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function AsistenciaPanel() {
  const { user } = useAuth();
  const esPastor = user?.role === 'pastor';

  const [cultos, setCultos] = useState<Culto[]>([]);
  const [cultoId, setCultoId] = useState<number | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [presentes, setPresentes] = useState<Set<string>>(new Set());
  const [loadingCultos, setLoadingCultos] = useState(true);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [creando, setCreando] = useState(false);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [cerrandoCulto, setCerrandoCulto] = useState(false);

  // Estado para eliminar culto
  const [showEliminar, setShowEliminar] = useState(false);
  const [pwdEliminar, setPwdEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoadingCultos(true);
      const { data } = await supabase
        .from('cultos')
        .select('id, fecha, descripcion, activo')
        .order('fecha', { ascending: false });
      setCultos(data ?? []);
      if (data && data.length > 0) setCultoId(data[0].id);
      setLoadingCultos(false);
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingPersonas(true);
      const [{ data: pdata }, { data: ndata }] = await Promise.all([
        supabase.from('personas').select('id, nombre, source_tipo, telefono').order('nombre'),
        supabase.from('miembros_nuevos').select('id, nombre, telefono').order('nombre'),
      ]);

      const lista: Persona[] = [
        ...(pdata ?? []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          tipo: p.source_tipo as 'adulto' | 'nino',
          telefono: p.telefono,
        })),
        ...(ndata ?? []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          tipo: 'nuevo' as const,
          telefono: p.telefono,
        })),
      ].sort((a, b) => a.nombre.localeCompare(b.nombre));

      setPersonas(lista);
      setLoadingPersonas(false);
    };
    load();
  }, []);

  // ✅ CÓDIGO CORRECTO
  const cargarAsistencias = useCallback(async (id: number) => {
    const { data } = await supabase
      .from('asistencias')
      .select('persona_id, miembro_nuevo_id')
      .eq('culto_id', id);

    const keys = new Set<string>();
    for (const a of data ?? []) {
      if (a.persona_id) {
        // Buscar el tipo real de la persona en el estado `personas`
        const persona = personas.find(p => p.id === a.persona_id && p.tipo !== 'nuevo');
        if (persona) keys.add(`${persona.tipo}::${a.persona_id}`);
      }
      if (a.miembro_nuevo_id) keys.add(`nuevo::${a.miembro_nuevo_id}`);
    }
    setPresentes(keys);
  }, [personas]); // ← agregar personas como dependencia

  useEffect(() => {
    if (cultoId) cargarAsistencias(cultoId);
  }, [cultoId, cargarAsistencias]);

  const eliminarCulto = async () => {
    if (!cultoId) return;
    setEliminando(true);
    setErrorEliminar('');
    const res = await fetch(`/api/cultos/${cultoId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: esPastor ? '' : pwdEliminar }),
    });
    if (res.ok) {
      setCultos((prev) => prev.filter((c) => c.id !== cultoId));
      setCultoId(null);
      setShowEliminar(false);
      setPwdEliminar('');
      toast.success('Culto eliminado.');
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Error al eliminar.' }));
      setErrorEliminar(error ?? 'Error al eliminar.');
    }
    setEliminando(false);
  };

  const toggleAsistencia = async (persona: Persona) => {
    if (!cultoId) return;
    const cultoActual = cultos.find((c) => c.id === cultoId);
    if (!cultoActual?.activo) {
      toast.warning(
        `"${cultoActual?.descripcion ?? 'Este culto'}" ya fue cerrado. No es posible modificar la asistencia. Habla con el administrador si necesitas hacer cambios.`,
        { duration: 5000 }
      );
      return;
    }
    const key = personaKey(persona);
    setSavingKey(key);

    const idField = persona.tipo === 'nuevo'
      ? { miembroNuevoId: persona.id }
      : { personaId: persona.id };

    if (presentes.has(key)) {
      await fetch('/api/asistencias', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cultoId, ...idField }),
      });
      setPresentes((prev) => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      await fetch('/api/asistencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cultoId, ...idField }),
      });
      setPresentes((prev) => new Set(prev).add(key));
    }
    setSavingKey(null);
  };

  const crearCulto = async () => {
    if (!nuevaFecha) return;
    setCreando(true);
    const desc = `Culto dominical ${new Date(nuevaFecha + 'T12:00:00').toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    })}`;
    const res = await fetch('/api/cultos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: nuevaFecha, descripcion: desc }),
    });
    if (res.ok) {
      const { culto } = await res.json();
      if (culto) {
        setCultos((prev) => [culto, ...prev]);
        setCultoId(culto.id);
        setNuevaFecha('');
        setMostrarNuevo(false);
      }
    }
    setCreando(false);
  };

  const cerrarCulto = async () => {
    if (!cultoId) return;
    setCerrandoCulto(true);
    const res = await fetch(`/api/cultos/${cultoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: false }),
    });
    if (res.ok) {
      setCultos((prev) => prev.map((c) => c.id === cultoId ? { ...c, activo: false } : c));
    }
    setCerrandoCulto(false);
  };

  const filtradas = personas
    .filter((p) => filtro === 'todos' || p.tipo === filtro)
    .filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const totalPresentes = presentes.size;
  const cultoActual = cultos.find((c) => c.id === cultoId);

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'adulto', label: 'Adultos' },
    { key: 'nino', label: 'Niños' },
    { key: 'nuevo', label: 'Nuevos' },
  ];

  return (
    <div className="space-y-5">

      {/* Selector de culto */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
              Culto / Fecha
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setMostrarNuevo(!mostrarNuevo)}>
              <CalendarPlus className="w-4 h-4 mr-1" />
              Nuevo culto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mostrarNuevo && (
            <div className="grid gap-3 p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-1">
                <Label>Fecha <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                />
              </div>
              <Button onClick={crearCulto} disabled={creando || !nuevaFecha}>
                {creando && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Crear y seleccionar
              </Button>
            </div>
          )}

          {loadingCultos ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando cultos...
            </div>
          ) : (
            <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
              {cultos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCultoId(c.id)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors
                    ${cultoId === c.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.descripcion}</p>
                    {c.activo && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Abierto</span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${cultoId === c.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatFecha(c.fecha)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de personas */}
      {cultoId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">{cultoActual?.descripcion ?? 'Asistencia'}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cultoActual ? formatFecha(cultoActual.fecha) : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                  <UserCheck className="w-3 h-3" />
                  {totalPresentes} presentes
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3 h-3" />
                  {personas.length} total
                </Badge>
                {cultoActual?.activo && (
                  <Button size="sm" variant="destructive" onClick={cerrarCulto} disabled={cerrandoCulto}>
                    {cerrandoCulto
                      ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      : <XCircle className="w-4 h-4 mr-1" />}
                    Cerrar culto
                  </Button>
                )}
                {cultoId && (
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setShowEliminar(true); setPwdEliminar(''); setErrorEliminar(''); }}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar Culto
                  </Button>
                )}
              </div>
            </div>

            {/* Buscador */}
            <Input
              className="mt-3"
              placeholder="Buscar persona..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            {/* Filtros por tipo */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {FILTROS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFiltro(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${filtro === key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="px-0 pt-0">
            {loadingPersonas ? (
              <div className="py-10 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando personas...
              </div>
            ) : (
              <div className="divide-y">
                {filtradas.map((persona) => {
                  const key = personaKey(persona);
                  const presente = presentes.has(key);
                  const saving = savingKey === key;

                  return (
                    <div
                      key={key}
                      onClick={() => toggleAsistencia(persona)}
                      className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors
                        hover:bg-muted/50 ${presente ? 'bg-green-50' : ''}`}
                    >
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                        ${presente ? 'bg-green-500 border-green-500' : 'bg-white border-border'}`}>
                        {saving
                          ? <Loader2 className="w-3 h-3 animate-spin text-white" />
                          : presente && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${presente ? 'text-green-800' : ''}`}>
                          {persona.nombre}
                        </p>
                        {persona.telefono && (
                          <p className="text-xs text-muted-foreground">{persona.telefono}</p>
                        )}
                      </div>
                      {tipoBadge(persona.tipo)}
                      {presente && !saving && (
                        <span className="text-xs text-green-600 font-medium">✓ Presente</span>
                      )}
                    </div>
                  );
                })}
                {filtradas.length === 0 && (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    No se encontraron personas.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog: confirmar eliminación de culto */}
      <Dialog open={showEliminar} onOpenChange={(o) => { if (!o && !eliminando) { setShowEliminar(false); setPwdEliminar(''); setErrorEliminar(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar culto
            </DialogTitle>
            <DialogDescription>
              Se eliminará <span className="font-semibold text-foreground">{cultos.find(c => c.id === cultoId)?.descripcion}</span> y todas sus asistencias registradas. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {!esPastor && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Requiere autorización. Ingresa la <strong>contraseña del pastor</strong>.</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd-eliminar-culto">Contraseña del pastor</Label>
                <Input
                  id="pwd-eliminar-culto"
                  type="password"
                  value={pwdEliminar}
                  autoFocus
                  onChange={(e) => setPwdEliminar(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && pwdEliminar) eliminarCulto(); }}
                  placeholder="••••••••"
                  disabled={eliminando}
                />
              </div>
            </div>
          )}

          {errorEliminar && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{errorEliminar}</p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEliminar(false)} disabled={eliminando}>Cancelar</Button>
            <Button variant="destructive" onClick={eliminarCulto} disabled={eliminando || (!esPastor && !pwdEliminar)}>
              {eliminando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminando...</> : 'Eliminar culto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}