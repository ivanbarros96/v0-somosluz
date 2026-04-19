'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CalendarPlus, Users, UserCheck, XCircle } from 'lucide-react';

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
  if (tipo === 'adulto') return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Adulto</Badge>;
  if (tipo === 'nino') return <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">Niño</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Nuevo</Badge>;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function AsistenciaPanel() {
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

  const cargarAsistencias = useCallback(async (id: number) => {
    const { data } = await supabase
      .from('asistencias')
      .select('persona_id, miembro_nuevo_id')
      .eq('culto_id', id);

    const keys = new Set<string>();
    for (const a of data ?? []) {
      if (a.persona_id) keys.add(`adulto::${a.persona_id}`);
      if (a.persona_id) keys.add(`nino::${a.persona_id}`);
      if (a.miembro_nuevo_id) keys.add(`nuevo::${a.miembro_nuevo_id}`);
    }
    setPresentes(keys);
  }, []);

  useEffect(() => {
    if (cultoId) cargarAsistencias(cultoId);
  }, [cultoId, cargarAsistencias]);

  const toggleAsistencia = async (persona: Persona) => {
    if (!cultoId) return;
    const key = personaKey(persona);
    setSavingKey(key);

    if (presentes.has(key)) {
      const query = supabase.from('asistencias').delete().eq('culto_id', cultoId);
      if (persona.tipo === 'nuevo') {
        await query.eq('miembro_nuevo_id', persona.id);
      } else {
        await query.eq('persona_id', persona.id);
      }
      setPresentes((prev) => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      const row: any = { culto_id: cultoId, fecha_registro: new Date().toISOString() };
      if (persona.tipo === 'nuevo') {
        row.miembro_nuevo_id = persona.id;
      } else {
        row.persona_id = persona.id;
      }
      await supabase.from('asistencias').insert(row);
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
    const { data, error } = await supabase
      .from('cultos')
      .insert({ fecha: nuevaFecha, descripcion: desc, activo: true })
      .select()
      .single();
    if (!error && data) {
      setCultos((prev) => [data, ...prev]);
      setCultoId(data.id);
      setNuevaFecha('');
      setMostrarNuevo(false);
    }
    setCreando(false);
  };

  const cerrarCulto = async () => {
    if (!cultoId) return;
    setCerrandoCulto(true);
    const { error } = await supabase.from('cultos').update({ activo: false }).eq('id', cultoId);
    if (!error) {
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
    </div>
  );
}