'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getCultos, getMiembrosNuevos, getPersonas, getAsistenciasDeCulto, getAsistencias } from '@/lib/datos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CalendarPlus, Users, UserCheck, XCircle, Trash2, ShieldAlert, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  CULTO_TIPOS, CULTO_TIPO_KEYS, descripcionCulto, idsQueAsistieron,
  type CultoTipo, type Elegibilidad,
} from '@/lib/cultos-tipos';
import { ministerioDeRol, esRolKids, TIPOS_MARCABLES_KIDS } from '@/lib/roles';

type Persona = {
  id: number;
  nombre: string;
  tipo: 'adulto' | 'nino' | 'joven' | 'nuevo';
  telefono: string | null;
  sexo: string | null;
  edad: number | null;
};

type Culto = {
  id: number;
  fecha: string;
  descripcion: string;
  activo: boolean;
  tipo: CultoTipo;
};

type Filtro = 'todos' | 'adulto' | 'joven' | 'nino' | 'nuevo';

// Cada cuánto se re-consulta el estado de los cultos mientras la pantalla
// está a la vista. 30s es suficiente para que "se abrió el culto" se sienta
// inmediato sin cargar el servidor con una consulta por segundo.
const REFRESCO_MS = 30_000;

function personaKey(p: Persona) {
  return `${p.tipo}::${p.id}`;
}

function tipoBadge(tipo: Persona['tipo']) {
  if (tipo === 'adulto') return <Badge className="bg-primary/10 text-primary border-primary/25 text-xs">Adulto</Badge>;
  if (tipo === 'joven') return <Badge className="bg-[#c08a3e]/10 text-[#a06f2e] border-[#c08a3e]/25 text-xs">Joven</Badge>;
  if (tipo === 'nino') return <Badge className="bg-accent/10 text-accent border-accent/25 text-xs">Niño</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Visita</Badge>;
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
  // Rol de ministerio: limitado a su propio tipo de culto
  const ministerio = ministerioDeRol(user?.role ?? '');
  const esSomosluz = user?.role === 'somosluz';
  // Kids: sin reunión propia. Trabaja sobre el culto general abierto por Somos
  // Luz y solo puede marcar niños — no crea, no cierra y no elimina cultos.
  const esKids = esRolKids(user?.role ?? '');
  const puedeMarcar = (p: Persona) => !esKids || TIPOS_MARCABLES_KIDS.includes(p.tipo);

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
  const [nuevoTipo, setNuevoTipo] = useState<CultoTipo>('general');
  const [creando, setCreando] = useState(false);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [cerrandoCulto, setCerrandoCulto] = useState(false);
  // Excepciones (ej. jóvenes fuera de rango): mostrar también a los no elegibles
  const [verTodos, setVerTodos] = useState(false);

  // Historial completo de asistencias (no solo del culto seleccionado): hace
  // falta para saber quién ya asistió alguna vez a un culto de Youth, que es
  // lo que decide si un Adulto de 15-20 años cuenta como público de Youth.
  const [todasAsistencias, setTodasAsistencias] = useState<{ culto_id: number; persona_id: number | null }[]>([]);

  // Estado para eliminar culto
  const [showEliminar, setShowEliminar] = useState(false);
  const [pwdEliminar, setPwdEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

  // Candado de ministerios (rol somosluz): ocultos hasta ingresar la clave del pastor
  const [ministeriosDesbloqueados, setMinisteriosDesbloqueados] = useState(false);
  const [showDesbloquear, setShowDesbloquear] = useState(false);
  const [pwdDesbloquear, setPwdDesbloquear] = useState('');
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [errorDesbloquear, setErrorDesbloquear] = useState('');

  const desbloquearMinisterios = async () => {
    setDesbloqueando(true);
    setErrorDesbloquear('');
    const res = await fetch('/api/auth/verify-pastor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwdDesbloquear }),
    });
    const { ok } = await res.json().catch(() => ({ ok: false }));
    if (ok) {
      setMinisteriosDesbloqueados(true);
      setShowDesbloquear(false);
      setPwdDesbloquear('');
      toast.success('Reuniones de ministerios visibles.');
    } else {
      setErrorDesbloquear('Contraseña incorrecta.');
    }
    setDesbloqueando(false);
  };

  useEffect(() => {
    const load = async () => {
      setLoadingCultos(true);
      try {
        const data = await getCultos({ orden: 'desc' });
        setCultos(data as Culto[]);
        if (data.length > 0) setCultoId(data[0].id);
      } catch {
        toast.error('No se pudieron cargar los cultos.');
      }
      setLoadingCultos(false);
    };
    load();
  }, []);

  useEffect(() => {
    getAsistencias().then(setTodasAsistencias).catch(() => {});
  }, []);

  // `silencioso` = recarga de fondo (sincronización): no muestra el estado de
  // carga ni molesta con un toast si falla, para no interrumpir el conteo.
  const cargarPersonas = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoadingPersonas(true);
    try {
      const [pdata, ndata] = await Promise.all([getPersonas(), getMiembrosNuevos()]);

      const lista: Persona[] = [
        ...pdata.map((p) => ({
          id: Number(p.id),
          nombre: p.nombre,
          tipo: p.source_tipo as 'adulto' | 'nino' | 'joven',
          telefono: p.telefono,
          sexo: p.sexo ?? null,
          edad: typeof p.edad === 'number' ? p.edad : null,
        })),
        ...ndata.map((p) => ({
          id: Number(p.id),
          nombre: p.nombre,
          tipo: 'nuevo' as const,
          telefono: p.telefono,
          sexo: null,
          edad: null,
        })),
      ].sort((a, b) => a.nombre.localeCompare(b.nombre));

      setPersonas(lista);
    } catch {
      if (!silencioso) toast.error('No se pudieron cargar las personas.');
    }
    if (!silencioso) setLoadingPersonas(false);
  }, []);

  useEffect(() => {
    cargarPersonas();
  }, [cargarPersonas]);

  const cargarAsistencias = useCallback(async (id: number) => {
    const data = await getAsistenciasDeCulto(id).catch(() => []);

    const keys = new Set<string>();
    for (const a of data) {
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

  // Sincronización con lo que pasa en otros dispositivos. Sin esto la pantalla
  // se quedaba con la foto del momento en que se abrió: si Somos Luz abría (o
  // cerraba) el culto desde su teléfono, el resto tenía que recargar a mano.
  // Se nota sobre todo en Kids, cuya vista depende de un culto que abre otro.
  // Mismo patrón que hooks/use-peticiones-pendientes.ts.
  //
  // La referencia evita recrear el intervalo en cada render: el timer llama
  // siempre a la última versión de la función, con el estado actual.
  const sincronizarRef = useRef<() => void>(() => {});

  useEffect(() => {
    sincronizarRef.current = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        // No re-selecciona el culto: respeta el que el usuario tenga elegido.
        // Si el elegido dejó de estar visible (ej. lo cerraron), de eso se
        // encarga el efecto de re-selección de más abajo.
        setCultos((await getCultos({ orden: 'desc' })) as Culto[]);
        // También la lista de personas: si Somos Luz registra a alguien en la
        // puerta, quien está tomando asistencia debe verlo sin salir y volver
        // a la pantalla (el caso típico de la maestra de Kids el domingo).
        await cargarPersonas(true);
        // Con un marcado en vuelo no tocamos la lista de presentes, para no
        // hacer parpadear el check que el usuario acaba de tocar.
        if (cultoId && !savingKey) await cargarAsistencias(cultoId);
      } catch {
        // Silencioso: un fallo de red no debe interrumpir la toma de asistencia.
      }
    };
  });

  useEffect(() => {
    const tick = () => sincronizarRef.current();
    const timer = setInterval(tick, REFRESCO_MS);
    // Al volver a la pestaña/app: es el caso más común en el celular y el que
    // más rápido debe reaccionar, sin esperar al intervalo.
    const alVolver = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

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
    // Kids solo marca niños (y visitantes, que no traen edad). Adultos y
    // jóvenes se ven con "Ver todos" pero quedan de solo lectura, para que no
    // pueda desmarcar por error a alguien que registró Somos Luz.
    if (!puedeMarcar(persona)) {
      toast.warning('Tu perfil solo puede marcar la asistencia de los niños.');
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
    // El rol limita qué tipos puede crear (también se valida en el servidor)
    const tipo = tiposDisponibles.includes(nuevoTipo) ? nuevoTipo : tiposDisponibles[0];
    const res = await fetch('/api/cultos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: nuevaFecha,
        descripcion: descripcionCulto(tipo, nuevaFecha),
        tipo,
      }),
    });
    if (res.ok) {
      const { culto } = await res.json();
      if (culto) {
        setCultos((prev) => [culto, ...prev]);
        setCultoId(culto.id);
        setNuevaFecha('');
        setNuevoTipo('general');
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

  // Cultos visibles según el rol:
  // - pastor: todos · ministerio: solo su tipo
  // - kids: además, solo el que está ABIERTO. Se abre y cierra junto con el
  //   dominical, así que al cerrarlo Somos Luz desaparece de su vista y la
  //   maestra no toca historial.
  // - somosluz: solo generales (ministerios ocultos hasta desbloquear con clave del pastor)
  const cultosVisibles = cultos.filter((c) => {
    if (esPastor) return true;
    if (esKids) return c.tipo === 'kids' && c.activo;
    if (ministerio) return c.tipo === ministerio;
    return ministeriosDesbloqueados || c.tipo === 'general';
  });

  // Si el culto seleccionado dejó de ser visible (cambio de rol/candado), re-seleccionar
  useEffect(() => {
    if (cultoId && !cultosVisibles.some((c) => c.id === cultoId)) {
      setCultoId(cultosVisibles[0]?.id ?? null);
    } else if (!cultoId && cultosVisibles.length > 0) {
      setCultoId(cultosVisibles[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cultos, user?.role, ministeriosDesbloqueados]);

  // Tipos que este rol puede crear
  const tiposDisponibles: CultoTipo[] = esPastor
    ? CULTO_TIPO_KEYS
    : ministerio
      ? [ministerio]
      : ministeriosDesbloqueados
        ? CULTO_TIPO_KEYS
        : ['general'];

  const totalPresentes = presentes.size;
  const cultoActual = cultos.find((c) => c.id === cultoId);

  // Audiencia del culto seleccionado: pre-filtra la lista según el público.
  // 'incompleto' (falta sexo/edad en la ficha) se muestra con aviso, al final.
  const tipoCulto: CultoTipo = cultoActual?.tipo ?? 'general';
  const asistioYouthIds = useMemo(
    () => idsQueAsistieron(cultos, todasAsistencias, 'youth'),
    [cultos, todasAsistencias],
  );
  const elegibilidadDe = (p: Persona): Elegibilidad =>
    CULTO_TIPOS[tipoCulto].elegibilidad({
      source_tipo: p.tipo,
      sexo: p.sexo,
      edad: p.edad,
      asistioAYouthAlgunaVez: asistioYouthIds.has(p.id),
    });

  // El público sale del tipo de culto (CULTO_TIPOS): en el de Kids son los
  // registrados como Niño. Los visitantes quedan fuera por defecto porque no
  // traen edad ni categoría — se ven al activar "Ver todos".
  //
  // Sólo entra el público CONFIRMADO ('si'). Quien tiene la ficha incompleta
  // ('incompleto': falta sexo o edad) NO aparece en la lista pre-filtrada del
  // ministerio: sin ese dato no se puede saber si pertenece, y mezclarlo ensucia
  // la lista de asistencia con gente que quizá no corresponde. Se lo encuentra en
  // la pestaña "Todos" o con "Ver todos", donde además se le puede completar la
  // ficha. (Decisión de Iván, 30/08/2026.)
  const enPublicoDelRol = (p: Persona) => elegibilidadDe(p) === 'si';

  const filtradas = personas
    .filter((p) => filtro === 'todos' || p.tipo === filtro)
    .filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .filter((p) => verTodos || enPublicoDelRol(p))
    .sort((a, b) => {
      // Los de ficha incompleta van al final (dentro del orden alfabético existente)
      const ia = elegibilidadDe(a) === 'incompleto' ? 1 : 0;
      const ib = elegibilidadDe(b) === 'incompleto' ? 1 : 0;
      return ia - ib;
    });

  const totalElegibles = personas.filter(enPublicoDelRol).length;

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'adulto', label: 'Adultos' },
    { key: 'joven', label: 'Jóvenes' },
    { key: 'nino', label: 'Niños' },
    { key: 'nuevo', label: 'Visitas' },
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
            <div className="flex items-center gap-2">
              {esSomosluz && !ministeriosDesbloqueados && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => { setShowDesbloquear(true); setPwdDesbloquear(''); setErrorDesbloquear(''); }}
                  title="Las reuniones de ministerios están ocultas. Requiere la contraseña del pastor."
                >
                  <Lock className="w-4 h-4 mr-1" />
                  Ministerios
                </Button>
              )}
              {esSomosluz && ministeriosDesbloqueados && (
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <Unlock className="w-3.5 h-3.5" />
                  Ministerios visibles
                </span>
              )}
              {!esKids && (
                <Button size="sm" variant="outline" onClick={() => setMostrarNuevo(!mostrarNuevo)}>
                  <CalendarPlus className="w-4 h-4 mr-1" />
                  Nuevo culto
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mostrarNuevo && (
            <div className="grid gap-3 p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-1.5">
                <Label>Tipo de reunión <span className="text-red-500">*</span></Label>
                {tiposDisponibles.length === 1 ? (
                  <p className="text-sm font-medium text-foreground">
                    {CULTO_TIPOS[tiposDisponibles[0]].label}
                    <span className="text-muted-foreground font-normal"> · {CULTO_TIPOS[tiposDisponibles[0]].publico}</span>
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2 flex-wrap">
                      {tiposDisponibles.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNuevoTipo(t)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                            ${nuevoTipo === t
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                        >
                          {CULTO_TIPOS[t].label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Público: {CULTO_TIPOS[tiposDisponibles.includes(nuevoTipo) ? nuevoTipo : tiposDisponibles[0]].publico}
                    </p>
                  </>
                )}
              </div>
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
              {esKids && cultosVisibles.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No hay ningún culto abierto todavía. Cuando Somos Luz abra el culto
                  dominical, aparecerá aquí para que tomes la asistencia de los niños.
                </p>
              )}
              {cultosVisibles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCultoId(c.id)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors
                    ${cultoId === c.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{c.descripcion}</p>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {c.tipo !== 'general' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cultoId === c.id ? 'bg-primary-foreground/20' : 'bg-accent/10 text-accent'}`}>
                          {CULTO_TIPOS[c.tipo].publico}
                        </span>
                      )}
                      {c.activo && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Abierto</span>
                      )}
                    </span>
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
                  {tipoCulto !== 'general' && (
                    <span className="ml-2 text-accent font-medium">
                      · {CULTO_TIPOS[tipoCulto].publico}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                  <UserCheck className="w-3 h-3" />
                  {totalPresentes} presentes
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3 h-3" />
                  {totalElegibles} {esKids ? 'niños' : tipoCulto === 'general' ? 'total' : 'del público'}
                </Badge>
                {/* Kids no abre ni cierra el culto: eso lo hace Somos Luz. */}
                {cultoActual?.activo && !esKids && (
                  <Button size="sm" variant="destructive" onClick={cerrarCulto} disabled={cerrandoCulto}>
                    {cerrandoCulto
                      ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      : <XCircle className="w-4 h-4 mr-1" />}
                    Cerrar culto
                  </Button>
                )}
                {cultoId && !esKids && (
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
            <div className="flex gap-2 mt-2 flex-wrap items-center">
              {/* Kids no necesita filtrar por tipo: su lista ya es solo niños. */}
              {!esKids && FILTROS.map(({ key, label }) => (
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
              {tipoCulto !== 'general' && (
                <button
                  onClick={() => setVerTodos((v) => !v)}
                  className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${verTodos
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                  title={esKids
                    ? 'Muestra al resto de la congregación (incluye visitantes). Solo puedes marcar niños y visitantes.'
                    : 'Muestra también a quienes no calzan con el público (para excepciones)'}
                >
                  {verTodos ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {verTodos ? (esKids ? 'Solo niños' : 'Solo el público') : 'Ver todos'}
                </button>
              )}
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
                  const eleg = elegibilidadDe(persona);
                  const bloqueada = !puedeMarcar(persona);

                  return (
                    <div
                      key={key}
                      onClick={() => toggleAsistencia(persona)}
                      className={`flex items-center gap-4 px-6 py-3 transition-colors
                        ${bloqueada
                          ? 'cursor-not-allowed opacity-60'
                          : `cursor-pointer hover:bg-muted/50 ${presente ? 'bg-green-50' : ''}`}`}
                    >
                      {/* Una persona bloqueada que ya está presente (la marcó Somos Luz)
                          se sigue viendo marcada, en verde atenuado — ocultarlo haría
                          creer que falta por marcar. */}
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                        ${presente
                          ? bloqueada ? 'bg-green-500/40 border-green-500/40' : 'bg-green-500 border-green-500'
                          : 'bg-white border-border'}`}>
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
                      {eleg === 'incompleto' && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200" title="Completa sexo/edad en su ficha para clasificarla en este culto">
                          Dato incompleto
                        </Badge>
                      )}
                      {verTodos && !esKids && eleg === 'no' && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Fuera del público
                        </Badge>
                      )}
                      {bloqueada && (
                        <Badge variant="outline" className="text-xs text-muted-foreground gap-1" title="Solo puedes marcar niños y visitantes">
                          <Lock className="w-3 h-3" />
                          Solo lectura
                        </Badge>
                      )}
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

      {/* Dialog: desbloquear reuniones de ministerios (rol somosluz) */}
      <Dialog open={showDesbloquear} onOpenChange={(o) => { if (!o && !desbloqueando) setShowDesbloquear(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Reuniones de ministerios
            </DialogTitle>
            <DialogDescription>
              Las asistencias de Amadas, Hombría, Discipulado y Youth están reservadas.
              Ingresa la <span className="font-semibold text-foreground">contraseña del pastor</span> para verlas en esta sesión.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="pwd-ministerios">Contraseña del pastor</Label>
            <Input
              id="pwd-ministerios"
              type="password"
              value={pwdDesbloquear}
              autoFocus
              onChange={(e) => setPwdDesbloquear(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && pwdDesbloquear) desbloquearMinisterios(); }}
              placeholder="••••••••"
              disabled={desbloqueando}
            />
          </div>
          {errorDesbloquear && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{errorDesbloquear}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDesbloquear(false)} disabled={desbloqueando}>Cancelar</Button>
            <Button onClick={desbloquearMinisterios} disabled={desbloqueando || !pwdDesbloquear}>
              {desbloqueando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verificando...</> : 'Mostrar ministerios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar eliminación de culto */}
      <Dialog open={showEliminar} onOpenChange={(o) => { if (!o && !eliminando) { setShowEliminar(false); setPwdEliminar(''); setErrorEliminar(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar culto
            </DialogTitle>
            <DialogDescription>
              Se eliminará <span className="font-semibold text-foreground">{cultos.find(c => c.id === cultoId)?.descripcion}</span> y todas sus asistencias registradas.
              {cultoActual?.tipo === 'general' && (
                <> También se eliminará la <span className="font-semibold text-foreground">clase de Kids</span> de ese mismo domingo, con las suyas.</>
              )}
              {' '}Esta acción no se puede deshacer.
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