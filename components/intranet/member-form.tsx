'use client';

import { useState, useEffect, useRef } from 'react';
import { useMembers } from '@/lib/members-store';
import { useAuth } from '@/lib/auth-context';
import type { Member, AdultoMember, NinoMember, JovenMember } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlagIcon } from '@/components/ui/flag-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import {
  buscarPersonas, existePersona, existeMiembroNuevo, buscarDirectorio,
  type DirectorioRow,
} from '@/lib/datos';
import { ministerioDeRol, registraSinAprobacion } from '@/lib/roles';
import { PAISES, REGIONES } from '@/lib/chile';

// Palabras del nombre, sin tildes y en minúscula, ignorando partículas cortas
// ("de", "la"). Comparar por palabras y no por texto completo es lo que permite
// ver que "Nicol ortiz" y "Nicol Yaritza Ortiz Garcia" son probablemente la
// misma persona: comparten dos palabras aunque el texto entero no coincida.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');
function palabrasDe(nombre: string): string[] {
  return nombre
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3);
}

function soloDigitos(valor: string | null | undefined) {
  return (valor ?? '').replace(/[^0-9]/g, '');
}

// La categoría real la elige quien registra (la pestaña), no un cálculo por
// edad — evita el caso de un joven de 18 que participa en Discipulado y no en
// Youth, o un niño de 14 a punto de cumplir 15.
type Modo = 'adulto' | 'joven' | 'nino' | 'nuevo';

// Umbral solo para el AVISO visual del tab Niño (no bloquea, no clasifica).
const EDAD_AVISO_NINO = 15;
// Rango "esperado" de Youth — el aviso es solo informativo, no bloquea.
const EDAD_YOUTH_MIN = 15;
const EDAD_YOUTH_MAX = 20;

// Qué pestañas de registro puede usar cada rol. El Pastor no llega a
// renderizar este formulario (bloqueado antes, en registro/page.tsx).
//   - Somos Luz: registra la asistencia dominical completa → las 4 pestañas.
//   - Amadas / Hombría / Discipulado: su gente adulta y los niños que traen
//     (los niños no tienen reunión propia, van al general).
//   - Youth: solo su propia audiencia.
//   - "Visita" lo puede usar cualquiera menos Pastor: puede llegar una visita
//     a cualquier reunión, no solo al culto general. (El modo se sigue
//     llamando 'nuevo' en el código y escribe en la tabla miembros_nuevos;
//     solo cambió la etiqueta visible.)
function modosPermitidosParaRol(role: string | undefined): Modo[] {
  const ministerio = ministerioDeRol(role ?? '');
  if (ministerio === 'youth') return ['joven', 'nuevo'];
  if (ministerio === 'mujeres' || ministerio === 'hombres' || ministerio === 'discipulado') {
    return ['adulto', 'nino', 'nuevo'];
  }
  return ['adulto', 'joven', 'nino', 'nuevo'];
}

// Visitante que se está convirtiendo en miembro. Cuando viene, el formulario
// arranca con sus datos ya cargados y al guardar usa el endpoint de conversión
// (que además le traspasa el historial de asistencias) en vez de crear una
// ficha suelta.
export interface VisitanteAConvertir {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

interface MemberFormProps {
  member?: Member | null;
  visitante?: VisitanteAConvertir | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TAB_LABELS: Record<Modo, string> = {
  adulto: '👤 Adulto',
  joven: '🧑 Youth',
  nino: '🧒 Niño',
  nuevo: '✨ Visita',
};

// Recordatorio sutil de a quién corresponde cada pestaña, para quien no se
// sabe las reglas de memoria.
const TAB_HINT: Record<Modo, string> = {
  adulto: '+18 años, en general',
  joven: '15–20 años',
  nino: '14 años o menos — requiere un apoderado',
  nuevo: 'Vino a la iglesia pero aún no es miembro',
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);
const ANIOS = Array.from({ length: new Date().getFullYear() - 1929 }, (_, i) => new Date().getFullYear() - i);
const NUMS_CONVERSION = Array.from({ length: 50 }, (_, i) => i + 1);

function emptyForm() {
  return {
    nombre: '',
    sexo: '',
    codTel: '+56', telefono: '',
    codWa: '+56', whatsapp: '',
    email: '',
    region: '', comuna: '',
    direccion: '',
    bautizado: false,
    convNum: '', convUnidad: '',
    dia: '', mes: '', anio: '',
    // '' = sin responder · 'si' = primera iglesia · 'no' = ya venía del evangelio
    primeraIglesia: '' as '' | 'si' | 'no',
  };
}

function parseTelefono(full: string | null) {
  if (!full) return { code: '+56', num: '' };
  const p = PAISES.find((p) => full.startsWith(p.code));
  if (p) return { code: p.code, num: full.slice(p.code.length).trim() };
  return { code: '+56', num: full.trim() };
}

function calcEdad(d: number, m: number, a: number) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - a;
  const dm = hoy.getMonth() + 1 - m;
  if (dm < 0 || (dm === 0 && hoy.getDate() < d)) edad--;
  return edad;
}

function parseTiempoConversion(val: string | null) {
  if (!val) return { num: '', unidad: '' };
  const parts = val.trim().split(' ');
  return { num: parts[0] ?? '', unidad: parts[1] ?? '' };
}

// Calcula el estado inicial del formulario a partir del miembro a editar.
// Se usa como inicializador perezoso de useState (no en un useEffect posterior)
// porque los Select de shadcn/Radix, una vez montados con value="", no
// reflejan un cambio de value hecho DESPUÉS del primer render salvo que el
// usuario interactúe — el trigger se queda mostrando el placeholder aunque el
// estado interno ya tenga el valor correcto. Al calcular esto antes del
// primer render, el Select nace ya con el valor correcto y el problema no
// llega a producirse. (MemberForm siempre se remonta por miembro vía
// key={editing.id} en members-table.tsx, así que un inicializador perezoso
// basta — no hace falta reaccionar a cambios de `member` en un mismo montaje.)
function computeForm(member: Member | null | undefined) {
  if (!member) return emptyForm();

  const tel = parseTelefono(member.telefono);
  const base = {
    nombre: member.nombre ?? '',
    sexo: member.sexo ?? '',
    codTel: tel.code, telefono: tel.num,
    codWa: '+56', whatsapp: '',
    email: member.email ?? '',
    region: member.region ?? '',
    comuna: member.comuna ?? '',
    direccion: member.direccion ?? '',
    bautizado: false,
    convNum: '', convUnidad: '',
    dia: '', mes: '', anio: '',
    primeraIglesia: '' as '' | 'si' | 'no',
  };

  // Adulto y Youth comparten exactamente los mismos campos (Youth asiste por
  // sí mismo, sin apoderado en este formulario).
  if (member.tipo === 'adulto' || member.tipo === 'joven') {
    const a = member as AdultoMember | JovenMember;
    const wa = parseTelefono(a.whatsapp);
    base.codWa = wa.code;
    base.whatsapp = wa.num;
    base.bautizado = a.bautizado === 'si';
    // null (sin dato) se mantiene como '' para no forzar una respuesta que
    // nadie dio: las fichas anteriores a agosto 2026 no traen este campo.
    base.primeraIglesia = a.primera_iglesia === true ? 'si' : a.primera_iglesia === false ? 'no' : '';
    const conv = parseTiempoConversion(a.tiempo_conversion);
    base.convNum = conv.num;
    base.convUnidad = conv.unidad;
    if (a.fecha_nacimiento) {
      const parts = a.fecha_nacimiento.split('/');
      base.dia = String(parseInt(parts[0] ?? '0', 10)) || '';
      base.mes = String(parseInt(parts[1] ?? '0', 10)) || '';
      base.anio = parts[2] ?? '';
    }
  }

  if (member.tipo === 'nino') {
    const n = member as NinoMember;
    if (n.fecha_nacimiento) {
      const parts = n.fecha_nacimiento.split('/');
      base.dia = String(parseInt(parts[0] ?? '0', 10)) || '';
      base.mes = String(parseInt(parts[1] ?? '0', 10)) || '';
      base.anio = parts[2] ?? '';
    }
  }

  return base;
}

export function MemberForm({ member, visitante, onSuccess, onCancel }: MemberFormProps) {
  const { addMember, updateMember, convertirVisitante } = useMembers();
  const { user } = useAuth();
  const isEditing = !!member;
  const esConversion = !!visitante;

  // Un único punto de guardado para las tres pestañas (adulto/joven/niño):
  // convertir un visitante, editar, o crear desde cero.
  const guardar = async (data: Parameters<typeof addMember>[0]) => {
    if (visitante) return convertirVisitante(visitante.id, data);
    if (isEditing) return updateMember(member!.id, data);
    return addMember(data);
  };

  // Pestañas que este rol puede usar al CREAR (en edición, el modo ya viene
  // fijado por el tipo del miembro que se está editando, no por el rol).
  // Al convertir se saca "Nuevo": la persona YA es una visita, la gracia es
  // pasarla a una categoría real.
  const modosPermitidos = modosPermitidosParaRol(user?.role).filter(
    (m) => !esConversion || m !== 'nuevo',
  );

  const [modo, setModo] = useState<Modo>(() => {
    if (member) {
      if (member.tipo === 'nino') return 'nino';
      if (member.tipo === 'joven') return 'joven';
      return 'adulto';
    }
    return modosPermitidos[0] ?? 'adulto';
  });

  const [form, setForm] = useState(() => {
    const base = computeForm(member);
    if (!visitante) return base;
    // El teléfono del visitante viene como "+56 912345678": se separa para
    // que calce con el selector de país + número del formulario.
    const [cod, ...resto] = (visitante.telefono ?? '').trim().split(' ');
    const tieneCodigo = cod.startsWith('+') && resto.length > 0;
    return {
      ...base,
      nombre: visitante.nombre,
      codTel: tieneCodigo ? cod : base.codTel,
      telefono: tieneCodigo ? resto.join(' ') : (visitante.telefono ?? ''),
      email: visitante.email ?? '',
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  // Fichas parecidas encontradas al guardar. Es un AVISO, no un bloqueo: dos
  // personas pueden llamarse igual, así que la decisión queda en quien registra.
  const [posiblesDuplicados, setPosiblesDuplicados] = useState<DirectorioRow[]>([]);
  // En ref y no en estado: el botón "Registrar de todos modos" vuelve a llamar a
  // handleSubmit en el acto, y un setState no se vería a tiempo.
  const omitirAviso = useRef(false);

  // Autocomplete apoderado. Precargado también de forma perezosa (mismo
  // motivo que `form`): Niño es el único modo con apoderado en este
  // formulario. Youth ya no lo gestiona aquí; si un registro antiguo tenía
  // uno, se preserva intacto al guardar sin mostrarse (ver handleSubmit).
  const [apoderadoQuery, setApoderadoQuery] = useState(() =>
    member?.tipo === 'nino' ? (member as NinoMember).nombre_apoderado ?? '' : '',
  );
  const [apoderadoResultados, setApoderadoResultados] = useState<{ id: string; nombre: string; telefono: string | null }[]>([]);
  const [apoderadoBuscando, setApoderadoBuscando] = useState(false);
  const [apoderadoSeleccionado, setApoderadoSeleccionado] = useState<{ id: string; nombre: string; telefono: string | null } | null>(() => {
    if (member?.tipo !== 'nino') return null;
    const n = member as NinoMember;
    return n.nombre_apoderado ? { id: '', nombre: n.nombre_apoderado, telefono: n.telefono_apoderado ?? null } : null;
  });
  const [apoderadoDropdownOpen, setApoderadoDropdownOpen] = useState(false);
  const apoderadoRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (apoderadoRef.current && !apoderadoRef.current.contains(e.target as Node)) {
        setApoderadoDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar apoderados al escribir
  useEffect(() => {
    if (apoderadoQuery.length < 2) {
      setApoderadoResultados([]);
      setApoderadoDropdownOpen(false);
      return;
    }
    // Si ya hay uno seleccionado y el query coincide con su nombre, no buscar
    if (apoderadoSeleccionado && apoderadoQuery === apoderadoSeleccionado.nombre) return;

    setApoderadoBuscando(true);
    const timer = setTimeout(async () => {
      const data = await buscarPersonas(apoderadoQuery, 'adulto').catch(() => []);
      // El id llega como número desde la API; el resto del formulario lo maneja como texto.
      setApoderadoResultados(data.map((p) => ({ ...p, id: String(p.id) })));
      setApoderadoDropdownOpen(true);
      setApoderadoBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [apoderadoQuery]);

  const set = (key: string, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleRegionChange = (val: string) => {
    setForm((f) => ({ ...f, region: val, comuna: '' }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOk(false);

    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (modo !== 'nuevo' && !form.sexo) { setError('Selecciona el sexo.'); return; }

    if (modo === 'nino') {
      if (!apoderadoQuery.trim()) {
        setError('El apoderado es obligatorio.'); return;
      }
      if (!apoderadoSeleccionado) {
        setError('Debes seleccionar un apoderado de la lista.'); return;
      }
    }

    setLoading(true);
    try {
      // Duplicado: SIEMPRE se revisan ambas tablas (personas y miembros_nuevos),
      // sea cual sea el modo. Antes solo "Nuevo" cruzaba las dos tablas — un
      // visitante ya anotado en miembros_nuevos podía volver a registrarse como
      // Adulto/Niño/Youth sin que nada lo detectara, porque ese camino solo
      // miraba personas. Eso dejó duplicados reales en producción.
      const excluirId = isEditing && member?.id ? member.id : undefined;
      const [existeEnPersonas, existeEnNuevos] = await Promise.all([
        existePersona(form.nombre.trim(), excluirId),
        // Al editar, el propio registro puede venir de una migración de un
        // "Nuevo" ya convertido — no hay id de miembros_nuevos que excluir
        // porque esa fila ya no existe, así que solo se filtra en modo alta.
        // Al convertir hay que excluir al propio visitante: si no, se detecta
        // a sí mismo y la conversión queda bloqueada para siempre.
        isEditing
          ? Promise.resolve(false)
          : existeMiembroNuevo(form.nombre.trim(), visitante?.id),
      ]);

      if (existeEnPersonas || existeEnNuevos) {
        setError('Ya existe un registro con este nombre. Verifica si la persona ya fue ingresada.');
        setLoading(false);
        return;
      }

      if (modo === 'nuevo') {
        const telFull = form.telefono ? `${form.codTel} ${form.telefono}` : null;
        const res = await fetch('/api/miembros-nuevos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: form.nombre.trim(),
            telefono: telFull,
            email: form.email.trim().toLowerCase(),
          }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: 'Error al registrar.' }));
          throw new Error(error ?? 'Error al registrar.');
        }
        setOk(true);
        setForm(emptyForm());
        onSuccess?.();
        return;
      }

      const telFull = form.telefono ? `${form.codTel} ${form.telefono}` : null;
      const waFull = form.whatsapp
        ? `${form.codWa} ${form.whatsapp}`
        : form.telefono ? `${form.codTel} ${form.telefono}` : null;
      // Si declaró que es su primera iglesia, el tiempo en el evangelio no
      // aplica: se guarda null aunque hubiera quedado algo escrito antes de
      // cambiar la respuesta.
      const primeraIglesia = form.primeraIglesia === 'si' ? true
        : form.primeraIglesia === 'no' ? false
        : null;
      const convFull = primeraIglesia === true ? null
        : (form.convNum && form.convUnidad) ? `${form.convNum} ${form.convUnidad}` : null;
      // Nadie puede estar bautizado sin haber pisado nunca una iglesia: si
      // declaró que es su primera vez, se guarda 'no' aunque el check hubiera
      // quedado marcado antes de cambiar la respuesta.
      const bautizadoFinal: 'si' | 'no' =
        primeraIglesia === true ? 'no' : form.bautizado ? 'si' : 'no';

      const fecha = (form.dia && form.mes && form.anio)
        ? `${form.dia}/${form.mes}/${form.anio}` : null;
      const edad = (form.dia && form.mes && form.anio)
        ? calcEdad(+form.dia, +form.mes, +form.anio) : null;

      // Niño: tipo fijo 'nino', con apoderado obligatorio del autocomplete.
      // La categoría la decide el tab elegido, ya no un cálculo de edad.
      if (modo === 'nino') {
        const data: Omit<NinoMember, 'id' | 'created_at'> = {
          tipo: 'nino',
          fecha_registro: member?.fecha_registro ?? new Date().toISOString(),
          nombre: form.nombre.trim(),
          sexo: form.sexo || null,
          telefono: null,
          whatsapp: null,
          email: null,
          region: null, comuna: null, direccion: null,
          fecha_nacimiento: fecha,
          edad,
          nombre_apoderado: apoderadoSeleccionado!.nombre,
          telefono_apoderado: apoderadoSeleccionado!.telefono,
        };
        await guardar(data);
        setOk(true);
        if (!isEditing) { setForm(emptyForm()); setApoderadoQuery(''); setApoderadoSeleccionado(null); }
        onSuccess?.();
        return;
      }

      // Youth: tipo fijo 'joven', mismos campos que Adulto (asiste por sí
      // mismo). Solo se conserva el apoderado si el registro editado ya
      // tenía uno de una migración/edición anterior — este formulario no lo
      // gestiona para Youth.
      if (modo === 'joven') {
        const previo = isEditing && member?.tipo === 'joven' ? (member as JovenMember) : null;

        const data: Omit<JovenMember, 'id' | 'created_at'> = {
          tipo: 'joven',
          fecha_registro: member?.fecha_registro ?? new Date().toISOString(),
          nombre: form.nombre.trim(),
          sexo: form.sexo || null,
          telefono: telFull,
          whatsapp: waFull,
          email: form.email.trim().toLowerCase() || null,
          region: form.region || null,
          comuna: form.comuna || null,
          direccion: form.direccion.trim() || null,
          bautizado: bautizadoFinal,
          tiempo_conversion: convFull,
          primera_iglesia: primeraIglesia,
          fecha_nacimiento: fecha,
          edad,
          nombre_apoderado: previo?.nombre_apoderado ?? null,
          telefono_apoderado: previo?.telefono_apoderado ?? null,
        };
        await guardar(data);
        setOk(true);
        if (!isEditing) setForm(emptyForm());
        onSuccess?.();
        return;
      }

      // Adulto: tipo fijo 'adulto'.
      const data: Omit<AdultoMember, 'id' | 'created_at'> = {
        tipo: 'adulto',
        fecha_registro: member?.fecha_registro ?? new Date().toISOString(),
        nombre: form.nombre.trim(),
        sexo: form.sexo || null,
        telefono: telFull,
        whatsapp: waFull,
        email: form.email.trim().toLowerCase() || null,
        region: form.region || null,
        comuna: form.comuna || null,
        direccion: form.direccion.trim() || null,
        bautizado: bautizadoFinal,
        tiempo_conversion: convFull,
        primera_iglesia: primeraIglesia,
        fecha_nacimiento: fecha,
        edad,
      };
      await guardar(data);

      setOk(true);
      if (!isEditing) setForm(emptyForm());
      onSuccess?.();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  }

  const comunas = form.region ? (REGIONES[form.region] ?? []) : [];

  // Edad calculada solo para mostrar el aviso suave en el tab Niño — NO decide el tipo.
  const edadPreview = (form.dia && form.mes && form.anio)
    ? calcEdad(+form.dia, +form.mes, +form.anio)
    : null;
  const mostrarAvisoEdadNino = modo === 'nino' && edadPreview !== null && edadPreview >= EDAD_AVISO_NINO;
  // Solo avisa — Youth es una decisión de a quién ministerio pertenece, no
  // un cálculo por edad, así que un Youth fuera de 15-20 igual se deja pasar.
  const mostrarAvisoEdadYouth = modo === 'joven' && edadPreview !== null
    && (edadPreview < EDAD_YOUTH_MIN || edadPreview > EDAD_YOUTH_MAX);

  // Cambiar de categoría limpia el apoderado (solo aplica a Niño) pero conserva
  // el resto de lo tipeado, porque `form` es un único estado compartido entre
  // pestañas. La usan tanto los tabs como los atajos de los avisos de edad.
  const cambiarModo = (nuevo: Modo) => {
    setModo(nuevo);
    setError(''); setOk(false);
    setApoderadoQuery('');
    setApoderadoSeleccionado(null);
    setApoderadoResultados([]);
    setApoderadoDropdownOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {!isEditing && modosPermitidos.length > 1 && (
        <Tabs value={modo} onValueChange={(v) => cambiarModo(v as Modo)}>
          <TabsList className="w-full">
            {modosPermitidos.map((m) => (
              <TabsTrigger key={m} value={m} className="flex-1">{TAB_LABELS[m]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
            {modo === 'nino'
              ? 'Datos del Niño'
              : modo === 'joven'
                ? 'Datos de Youth'
                : modo === 'nuevo'
                  ? 'Datos del Visitante'
                  : 'Datos Personales'}
          </CardTitle>
          <p className="text-xs text-muted-foreground/70">{TAB_HINT[modo]}</p>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-1">
            <Label>Nombre Completo <span className="text-red-500">*</span></Label>
            <Input
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: María Isabel García"
            />
          </div>

          {modo !== 'nuevo' && (
            <div className="space-y-1">
              <Label>Fecha de Nacimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={form.dia} onValueChange={(v) => set('dia', v)}>
                  <SelectTrigger><SelectValue placeholder="Día" /></SelectTrigger>
                  <SelectContent>
                    {DIAS.map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.mes} onValueChange={(v) => set('mes', v)}>
                  <SelectTrigger><SelectValue placeholder="Mes" /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.anio} onValueChange={(v) => set('anio', v)}>
                  <SelectTrigger><SelectValue placeholder="Año" /></SelectTrigger>
                  <SelectContent>
                    {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {mostrarAvisoEdadNino && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <span className="block">
                      Esta persona tendría {edadPreview} años según la fecha ingresada.
                      ¿Seguro que corresponde al grupo Niño y no a Youth?
                    </span>
                    {/* Los niños crecen y en algún momento pasan a Youth. Sin este
                        botón había que cerrar, cambiar de pestaña y volver a
                        escribir todo. Cambiar de modo conserva lo ya tipeado
                        porque `form` es un solo estado compartido entre pestañas. */}
                    {modosPermitidos.includes('joven') && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-amber-300 bg-white text-xs text-amber-900 hover:bg-amber-100"
                        onClick={() => cambiarModo('joven')}
                      >
                        <ArrowRight className="mr-1 h-3 w-3" />
                        Cambiar a Youth
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {mostrarAvisoEdadYouth && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <span className="block">
                      Esta persona tendría {edadPreview} años según la fecha ingresada — fuera del
                      rango habitual de Youth (15–20). Puedes registrarla igual si corresponde.
                    </span>
                    {/* El atajo se ofrece según por qué lado se salió del rango:
                        más chico va a Niño, más grande va a Adulto. */}
                    {edadPreview !== null && edadPreview < EDAD_YOUTH_MIN && modosPermitidos.includes('nino') && (
                      <Button
                        type="button" size="sm" variant="outline"
                        className="h-7 border-amber-300 bg-white text-xs text-amber-900 hover:bg-amber-100"
                        onClick={() => cambiarModo('nino')}
                      >
                        <ArrowRight className="mr-1 h-3 w-3" />
                        Cambiar a Niño
                      </Button>
                    )}
                    {edadPreview !== null && edadPreview > EDAD_YOUTH_MAX && modosPermitidos.includes('adulto') && (
                      <Button
                        type="button" size="sm" variant="outline"
                        className="h-7 border-amber-300 bg-white text-xs text-amber-900 hover:bg-amber-100"
                        onClick={() => cambiarModo('adulto')}
                      >
                        <ArrowRight className="mr-1 h-3 w-3" />
                        Cambiar a Adulto
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {modo !== 'nuevo' && (
            <div className="space-y-1">
              <Label>Sexo <span className="text-red-500">*</span></Label>
              <div className="flex gap-3">
                {['Masculino', 'Femenino'].map((s) => (
                  <button
                    key={s} type="button"
                    onClick={() => set('sexo', s)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors
                      ${form.sexo === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {s === 'Masculino' ? '♂ Masculino' : '♀ Femenino'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(modo === 'adulto' || modo === 'joven') && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Fe y Comunidad</p>

              {/* Va ANTES del tiempo de conversión porque lo condiciona: a
                  quien está en su primera iglesia no tiene sentido preguntarle
                  hace cuánto conoce el evangelio. */}
              <div className="space-y-1.5">
                <Label>¿Es su primera vez en una iglesia cristiana?</Label>
                <div className="flex gap-2">
                  {/* Solo "Sí" y "No", sin coletilla: pedido de Johnny en la reunión del
                      24/08/2026. La pregunta ya es clara por sí sola y el texto extra
                      hacía dudar de qué se estaba respondiendo. */}
                  {([['si', 'Sí'], ['no', 'No']] as const).map(([valor, texto]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => set('primeraIglesia', form.primeraIglesia === valor ? '' : valor)}
                      aria-pressed={form.primeraIglesia === valor}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        form.primeraIglesia === valor
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {texto}
                    </button>
                  ))}
                </div>
                {form.primeraIglesia === 'si' && (
                  <p className="text-xs text-muted-foreground">
                    Se marcará para el acompañamiento de quienes recién conocen el evangelio.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Solo aplica a quien ya venía del evangelio */}
                <div className={`space-y-1 ${form.primeraIglesia === 'si' ? 'hidden' : ''}`}>
                  <Label>Tiempo de Conversión</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={form.convNum} onValueChange={(v) => set('convNum', v)}>
                      <SelectTrigger><SelectValue placeholder="N°" /></SelectTrigger>
                      <SelectContent>
                        {NUMS_CONVERSION.map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={form.convUnidad} onValueChange={(v) => set('convUnidad', v)}>
                      <SelectTrigger><SelectValue placeholder="Unidad" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Meses">Meses</SelectItem>
                        <SelectItem value="Años">Años</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* También depende de la primera pregunta: el bautismo ocurre
                    EN una iglesia, así que quien nunca ha pisado una no puede
                    estar bautizado. Preguntarlo sería contradictorio. */}
                <div className={`space-y-1 ${form.primeraIglesia === 'si' ? 'hidden' : ''}`}>
                  <Label>¿Bautizado/a?</Label>
                  <div
                    onClick={() => set('bautizado', !form.bautizado)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none
                      ${form.bautizado ? 'bg-primary/10 border-primary' : 'bg-muted border-border'}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0
                      ${form.bautizado ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
                      {form.bautizado && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">Sí, está bautizado/a</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Niño: autocomplete de apoderado */}
          {modo === 'nino' && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Apoderado</p>
              <div className="space-y-1" ref={apoderadoRef}>
                <Label>Apoderado <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={apoderadoQuery}
                    onChange={(e) => {
                      setApoderadoQuery(e.target.value);
                      if (apoderadoSeleccionado && e.target.value !== apoderadoSeleccionado.nombre) {
                        setApoderadoSeleccionado(null);
                      }
                    }}
                    onFocus={() => { if (apoderadoResultados.length > 0) setApoderadoDropdownOpen(true); }}
                    placeholder="Buscar por nombre..."
                    autoComplete="off"
                  />
                  {apoderadoBuscando && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {apoderadoDropdownOpen && apoderadoResultados.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                      {apoderadoResultados.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setApoderadoSeleccionado(a);
                            setApoderadoQuery(a.nombre);
                            setApoderadoDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors flex justify-between items-center gap-4"
                        >
                          <span className="text-sm font-medium text-foreground">{a.nombre}</span>
                          {a.telefono && <span className="text-xs text-muted-foreground shrink-0">{a.telefono}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {apoderadoDropdownOpen && apoderadoQuery.length >= 2 && !apoderadoBuscando && apoderadoResultados.length === 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg px-4 py-3 text-sm text-muted-foreground">
                      Sin resultados. Registra primero al adulto.
                    </div>
                  )}
                </div>
                {apoderadoSeleccionado && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
                    <span className="font-semibold">Apoderado: {apoderadoSeleccionado.nombre}</span>
                    {apoderadoSeleccionado.telefono && <span>— {apoderadoSeleccionado.telefono}</span>}
                  </div>
                )}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Contacto: Adulto, Youth y Nuevo. Niño NO — su contacto es el apoderado. */}
      {(modo === 'adulto' || modo === 'joven' || modo === 'nuevo') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="space-y-1">
              <Label>Teléfono</Label>
              <div className="flex gap-2">
                <Select value={form.codTel} onValueChange={(v) => set('codTel', v)}>
                  <SelectTrigger className="w-28">
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <FlagIcon iso={PAISES.find((p) => p.code === form.codTel)?.iso ?? ''} className="h-3.5 w-5 rounded-[2px] shrink-0" />
                        {form.codTel}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PAISES.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        <FlagIcon iso={p.iso} className="h-3.5 w-5 rounded-[2px] shrink-0" /> {p.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={form.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                  placeholder="9 1234 5678"
                  className="flex-1"
                  inputMode="tel"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Email <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>

            {(modo === 'adulto' || modo === 'joven') && (
              <>
                <div className="space-y-1">
                  <Label>WhatsApp</Label>
                  <div className="flex gap-2">
                    <Select value={form.codWa} onValueChange={(v) => set('codWa', v)}>
                      <SelectTrigger className="w-28">
                        <SelectValue>
                          <span className="flex items-center gap-1.5">
                            <FlagIcon iso={PAISES.find((p) => p.code === form.codWa)?.iso ?? ''} className="h-3.5 w-5 rounded-[2px] shrink-0" />
                            {form.codWa}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PAISES.map((p) => (
                          <SelectItem key={p.code} value={p.code}>
                            <FlagIcon iso={p.iso} className="h-3.5 w-5 rounded-[2px] shrink-0" /> {p.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={form.whatsapp}
                      onChange={(e) => set('whatsapp', e.target.value)}
                      placeholder="9 1234 5678"
                      className="flex-1"
                      inputMode="tel"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Ubicación</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Región</Label>
                      <Select value={form.region} onValueChange={handleRegionChange}>
                        <SelectTrigger><SelectValue placeholder="Seleccione región..." /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(REGIONES).map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Comuna</Label>
                      <Select
                        value={form.comuna}
                        onValueChange={(v) => set('comuna', v)}
                        disabled={!form.region}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={form.region ? 'Seleccione comuna...' : 'Primero seleccione región'} />
                        </SelectTrigger>
                        <SelectContent>
                          {comunas.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Dirección</Label>
                    <Input
                      value={form.direccion}
                      onChange={(e) => set('direccion', e.target.value)}
                      placeholder="Ej: Av. Brasil 1234"
                    />
                  </div>
                </div>
              </>
            )}

          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}
      {ok && !isEditing && (
        modo !== 'nuevo' && !registraSinAprobacion(user?.role ?? '') ? (
          // Quien no autoriza fichas deja la suya esperando el visto bueno de
          // Secretaría. Decirle "registrado" sin más seria mentirle: todavia no
          // aparece en los listados ni en la asistencia del domingo.
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Ficha enviada. Queda <strong>esperando autorización de Secretaría</strong> antes de
              aparecer en los listados.
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            ✓ {modo === 'nuevo' ? 'Visitante registrado en miembros nuevos' : 'Miembro registrado exitosamente'}
          </div>
        )
      )}

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {esConversion
            ? 'Convertir en miembro ✓'
            : isEditing
            ? 'Guardar Cambios ✓'
            : modo === 'nino'
              ? 'Registrar Niño ✓'
              : modo === 'joven'
                ? 'Registrar Youth ✓'
                : modo === 'nuevo'
                  ? 'Registrar Visita ✓'
                  : 'Registrar Miembro ✓'}
        </Button>
      </div>

    </form>
  );
}
