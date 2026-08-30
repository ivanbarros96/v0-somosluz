'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2, Pencil, Search, ShieldAlert, Trash2, UserRound, UserMinus, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMembers } from '@/lib/members-store';
import { useAuth } from '@/lib/auth-context';
import { type AdultoMember, type Member, type NinoMember, getMemberInitials, isAdultoMember, isNinoMember, isJovenMember } from '@/lib/types';
import { ministerioDeRol } from '@/lib/roles';
import { CULTO_TIPOS, idsQueAsistieron } from '@/lib/cultos-tipos';
import { getCultos, getAsistencias, buscarDirectorio, type DirectorioRow } from '@/lib/datos';
import { MemberForm } from '@/components/intranet/member-form';
import { VisitantesPanel } from '@/components/intranet/visitantes-panel';
import { PendientesPanel } from '@/components/intranet/pendientes-panel';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

// Mismos motivos que la pantalla de Retiros, para que el histórico sea
// comparable venga de donde venga la baja.
const MOTIVOS_BAJA = [
  'Se mudó de ciudad/país',
  'Problemas personales',
  'Cambio de iglesia',
  'Enfermedad o salud',
  'Trabajo / horario incompatible',
  'Sin contacto (inubicable)',
  'Otro',
] as const;
const OTRO_BAJA = 'Otro';

// Buscar sin tildes: "Benjamin" tiene que encontrar a "Benjamín". Escribir el
// nombre sin acento era una de las formas en que se colaban los duplicados.
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');
function sinTildes(texto: string) {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase();
}

function fmt(v: string | number | null | undefined) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

/**
 * Teléfono por el que se llega a esta persona, en la vista "Todos", donde
 * conviven los tres tipos.
 *
 * El del apoderado se usa SOLO para niños: ellos no tienen teléfono propio y
 * el del apoderado es el correcto. Jóvenes y adultos deben tener el suyo, así
 * que si falta se muestra vacío a propósito — mostrar el del apoderado taparía
 * un dato que hay que completar. Hoy hay 7 jóvenes en esa situación.
 */
function Contacto({ member }: { member: Member }) {
  if (member.telefono) return <>{member.telefono}</>;

  const delApoderado = member.tipo === 'nino' ? member.telefono_apoderado : null;
  if (!delApoderado) return <>—</>;

  return (
    <span className="inline-flex items-center gap-1">
      <UserRound className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      <span>{delApoderado}</span>
      <span className="sr-only">(del apoderado)</span>
    </span>
  );
}

function MemberAvatar({ member }: { member: Member }) {
  const cls =
    member.tipo === 'adulto' ? 'bg-primary text-primary-foreground'
    : member.tipo === 'joven' ? 'bg-[#c08a3e] text-white'
    : 'bg-accent text-accent-foreground';
  return (
    <Avatar className="h-9 w-9 border">
      <AvatarFallback className={cls}>
        {getMemberInitials(member.nombre) || <UserRound className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

function TypeBadge({ tipo }: { tipo: 'adulto' | 'nino' | 'joven' }) {
  const cls =
    tipo === 'adulto' ? 'bg-primary/10 text-primary border-primary/25'
    : tipo === 'joven' ? 'bg-[#c08a3e]/10 text-[#a06f2e] border-[#c08a3e]/25'
    : 'bg-accent/10 text-accent border-accent/25';
  const label = tipo === 'adulto' ? 'Adulto' : tipo === 'joven' ? 'Joven' : 'Niño';
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  );
}

function ViewDialog({ member, open, onClose }: { member: Member | null; open: boolean; onClose: () => void }) {
  if (!member) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <MemberAvatar member={member} />
            <div className="space-y-1">
              <DialogTitle>{member.nombre}</DialogTitle>
              <TypeBadge tipo={member.tipo} />
            </div>
          </div>
          <DialogDescription>Datos completos del registro.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2 text-sm">
          {([
            ['Nombre', member.nombre],
            ['Sexo', member.sexo],
            ['Teléfono', member.telefono],
            ['WhatsApp', member.whatsapp],
            ['Email', member.email],
            ['Región', member.region],
            ['Comuna', member.comuna],
            ['Dirección', member.direccion],
            ['Fecha registro', member.fecha_registro],
            ['Creado', member.created_at],
          ] as [string, string | null | undefined][]).map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
              <p>{fmt(value)}</p>
            </div>
          ))}
          {isAdultoMember(member) && <>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Fecha nacimiento</p>
              <p>{fmt(member.fecha_nacimiento)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Edad</p>
              <p>{fmt(member.edad)}</p>
            </div>
            <div className="rounded-lg border p-3">
  <p className="text-xs font-medium uppercase text-muted-foreground">Bautizado</p>
  <p>{member.bautizado === 'si' ? 'Sí' : member.bautizado === 'no' ? 'No' : '—'}</p>
</div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Tiempo conversión</p>
              <p>{fmt(member.tiempo_conversion)}</p>
            </div>
          </>}
          {isNinoMember(member) && <>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Fecha nacimiento</p>
              <p>{fmt(member.fecha_nacimiento)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Edad</p>
              <p>{fmt(member.edad)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Apoderado</p>
              <p>{fmt(member.nombre_apoderado)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Tel. apoderado</p>
              <p>{fmt(member.telefono_apoderado)}</p>
            </div>
          </>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MembersTable() {
  const { members, isLoading, error, deleteMember, refreshMembers } = useMembers();
  const { user } = useAuth();
  const esPastor = user?.role === 'pastor';

  const [viewing, setViewing] = useState<Member | null>(null);
  const [editing, setEditing] = useState<Member | null>(null); // ✅ un solo estado
  const [query, setQuery] = useState('');

  // Pestaña activa. Es controlada para poder saltar a "Visitas" desde el aviso
  // de coincidencias.
  const [tab, setTab] = useState('todos');

  // Visitas que coinciden con la búsqueda. Viven en otra tabla (miembros_nuevos),
  // así que no se pueden filtrar sobre la lista local de miembros: se consultan
  // al servidor contra la vista `directorio_unificado`.
  const [visitasCoincidentes, setVisitasCoincidentes] = useState<DirectorioRow[]>([]);

  // Estado del flujo de eliminación
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [dandoBaja, setDandoBaja] = useState<Member | null>(null);
  const [motivoBaja, setMotivoBaja] = useState<string>(MOTIVOS_BAJA[0]);
  const [motivoOtroBaja, setMotivoOtroBaja] = useState('');
  const [bajaError, setBajaError] = useState('');
  const [pwd, setPwd] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [working, setWorking] = useState(false);

  // Rol de ministerio: la lista sale filtrada a su público, con toggle "Ver todos"
  const ministerio = ministerioDeRol(user?.role ?? '');
  const [verTodosMiembros, setVerTodosMiembros] = useState(false);

  // Solo para el rol Youth: un Adulto de 15-20 años no cuenta como público de
  // Youth por edad sola, necesita al menos una asistencia previa a un culto
  // de Youth (ver PersonaAudiencia.asistioAYouthAlgunaVez en cultos-tipos.ts).
  const [asistioYouthIds, setAsistioYouthIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (ministerio !== 'youth') return;
    Promise.all([getCultos({ tipo: 'youth' }), getAsistencias()])
      .then(([cultos, asistencias]) => setAsistioYouthIds(idsQueAsistieron(cultos, asistencias, 'youth')))
      .catch(() => {});
  }, [ministerio]);

  // Buscar también entre las visitas. Sin esto, escribir el nombre de alguien
  // que ya vino como visita no daba ningún resultado y quien registraba asumía
  // que no existía — así nacieron los duplicados entre las dos tablas.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setVisitasCoincidentes([]);
      return;
    }
    const id = setTimeout(() => {
      buscarDirectorio(q, 'visita')
        .then(setVisitasCoincidentes)
        .catch(() => setVisitasCoincidentes([]));
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const enAudiencia = (m: Member) => {
    if (!ministerio || verTodosMiembros) return true;
    // Sólo el público CONFIRMADO ('si'). Los de ficha incompleta ('incompleto':
    // falta sexo o edad) no entran al filtro del ministerio — se ven con "Ver
    // todos", igual que en Asistencia. (Decisión de Iván, 30/08/2026.)
    return CULTO_TIPOS[ministerio].elegibilidad({
      source_tipo: m.tipo,
      sexo: m.sexo,
      edad: 'edad' in m ? (m.edad ?? null) : null,
      asistioAYouthAlgunaVez: asistioYouthIds.has(Number(m.id)),
    }) === 'si';
  };

  const coincide = (m: Member) => {
    const q = sinTildes(query.trim());
    if (!q) return true;
    const enTexto = [m.nombre, m.telefono, m.email, m.comuna, m.region]
      .some((v) => sinTildes(v ?? '').includes(q));
    // El teléfono se guarda con formato ("+56 977411603"), así que buscar solo
    // los dígitos no lo encontraba.
    const soloDigitos = q.replace(/[^0-9]/g, '');
    const enTelefono =
      soloDigitos.length >= 3 &&
      (m.telefono ?? '').replace(/[^0-9]/g, '').includes(soloDigitos);
    return enTexto || enTelefono;
  };

  const todos = useMemo(
    () => members.filter(coincide).filter(enAudiencia),
    [members, query, ministerio, verTodosMiembros],
  );
  const adultos = useMemo(
    () => members.filter(isAdultoMember).filter(coincide).filter(enAudiencia),
    [members, query, ministerio, verTodosMiembros],
  );
  const jovenes = useMemo(
    () => members.filter(isJovenMember).filter(coincide).filter(enAudiencia),
    [members, query, ministerio, verTodosMiembros],
  );
  const ninos = useMemo(
    () => members.filter(isNinoMember).filter(coincide).filter(enAudiencia),
    [members, query, ministerio, verTodosMiembros],
  );

  const abrirEliminar = (m: Member) => {
    setDeleting(m);
    setPwd('');
    setDeleteError('');
  };

  const motivoBajaFinal = motivoBaja === OTRO_BAJA ? motivoOtroBaja.trim() : motivoBaja;

  // Dar de baja = registrar un retiro. La ficha no se toca: es la fila de
  // `retiros` la que saca a la persona de todos los listados (ver
  // GET /api/personas), así que se puede deshacer sin perder nada.
  const confirmarBaja = async () => {
    if (!dandoBaja || !motivoBajaFinal) return;
    setWorking(true);
    setBajaError('');
    try {
      const res = await fetch('/api/retiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: Number(dandoBaja.id),
          nombre: dandoBaja.nombre,
          motivo: motivoBajaFinal,
          observaciones: null,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Error al dar de baja.' }));
        throw new Error(error ?? 'Error al dar de baja.');
      }
      toast.success(`${dandoBaja.nombre} quedó inactivo. Puedes reactivarlo desde Retiros.`);
      setDandoBaja(null);
      await refreshMembers();
    } catch (e: any) {
      setBajaError(e?.message ?? 'Error al dar de baja.');
    } finally {
      setWorking(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!deleting) return;
    setWorking(true);
    setDeleteError('');

    // El perfil operativo envía la clave del pastor; el servidor la valida.
    try {
      await deleteMember(deleting.id, esPastor ? undefined : pwd);
      setDeleting(null);
      setPwd('');
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Error al eliminar.');
    } finally {
      setWorking(false);
    }
  };

  const Actions = ({ m }: { m: Member }) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={() => setViewing(m)} title="Ver ficha">
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setEditing(m)} title="Editar">
        <Pencil className="h-4 w-4" />
      </Button>
      {/* Dar de baja ≠ eliminar. La baja conserva la ficha y el historial: la
          persona sale de los listados y las estadísticas, pero el pastor la
          sigue viendo en Retiros y puede reactivarla. */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => { setDandoBaja(m); setMotivoBaja(MOTIVOS_BAJA[0]); setMotivoOtroBaja(''); setBajaError(''); }}
        title="Dar de baja (deja de aparecer, pero se conserva)"
      >
        <UserMinus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive"
        onClick={() => abrirEliminar(m)}
        title="Eliminar definitivamente"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  if (isLoading) return (
    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">Cargando miembros...</div>
  );

  if (error) return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
  );

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Miembros</CardTitle>
          <p className="text-sm text-muted-foreground">
            {ministerio && !verTodosMiembros
              ? `Mostrando el público de ${CULTO_TIPOS[ministerio].label} (${CULTO_TIPOS[ministerio].publico}).`
              : 'Adultos, jóvenes y niños separados en tabs.'}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div className="relative max-w-sm flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, teléfono, email o comuna..."
                className="pl-9"
              />
            </div>
            {ministerio && (
              <Button
                size="sm"
                variant={verTodosMiembros ? 'default' : 'outline'}
                onClick={() => setVerTodosMiembros((v) => !v)}
              >
                {verTodosMiembros ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {verTodosMiembros ? 'Solo mi público' : 'Ver todos'}
              </Button>
            )}
          </div>

          {/* El aviso es el puente entre las dos tablas: sin él, buscar a
              alguien que ya vino como visita no devolvía nada y se terminaba
              registrando de nuevo como miembro. Convertir conserva su historial
              de asistencias; registrar de nuevo lo parte en dos fichas. */}
          {visitasCoincidentes.length > 0 && tab !== 'visitantes' && (
            <div className="mt-3 flex flex-wrap items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p>
                  También hay <strong>{visitasCoincidentes.length}</strong>{' '}
                  {visitasCoincidentes.length === 1 ? 'visita' : 'visitas'} con ese nombre:{' '}
                  <span className="font-medium text-foreground">
                    {visitasCoincidentes.map((v) => v.nombre).join(', ')}
                  </span>
                  .
                </p>
                <p className="mt-1 text-muted-foreground">
                  Si ya es parte de la iglesia, conviértela en miembro para conservar su
                  historial — no la registres de nuevo.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setTab('visitantes')}>
                Ver en Visitas
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="px-6 pb-4">
              <TabsList className="grid w-full max-w-3xl grid-cols-6">
                <TabsTrigger value="todos" className="gap-2">
                  Todos <Badge variant="secondary">{todos.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="adultos" className="gap-2">
                  Adultos <Badge variant="secondary">{adultos.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="jovenes" className="gap-2">
                  Jóvenes <Badge variant="secondary">{jovenes.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="ninos" className="gap-2">
                  Niños <Badge variant="secondary">{ninos.length}</Badge>
                </TabsTrigger>
                {/* Los visitantes viven en otra tabla (miembros_nuevos), por eso
                    su contenido es un componente aparte y no se mezcla con la
                    lista de miembros. */}
                <TabsTrigger value="visitantes" className="gap-2">
                  Visitas
                  {visitasCoincidentes.length > 0 && (
                    <Badge variant="secondary">{visitasCoincidentes.length}</Badge>
                  )}
                </TabsTrigger>
                {/* Auto-registros del link público esperando revisión */}
                <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="todos" className="mt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todos.length === 0
                    ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Sin miembros registrados.</TableCell></TableRow>
                    : todos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MemberAvatar member={m} />
                            <span className="font-medium">{m.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell><TypeBadge tipo={m.tipo} /></TableCell>
                        <TableCell>{fmt('edad' in m ? m.edad : null)}</TableCell>
                        <TableCell><Contacto member={m} /></TableCell>
                        <TableCell><Actions m={m} /></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="adultos" className="mt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Comuna</TableHead>
                    <TableHead>Bautizado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adultos.length === 0
                    ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Sin adultos registrados.</TableCell></TableRow>
                    : adultos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MemberAvatar member={m} />
                            <span className="font-medium">{m.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>{fmt(m.edad)}</TableCell>
                        <TableCell>{fmt(m.telefono)}</TableCell>
                        <TableCell>{fmt(m.comuna)}</TableCell>
                        <TableCell>
                          {m.bautizado === 'si'
                            ? <span className="text-green-600 font-medium">Sí</span>
                            : m.bautizado === 'no'
                              ? <span className="text-muted-foreground">No</span>
                              : '—'}
                        </TableCell>
                        <TableCell><Actions m={m} /></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="jovenes" className="mt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    {/* Telefono PROPIO, no el del apoderado: a esta edad ya
                        deben tener el suyo. Los vacios son datos por completar,
                        y taparlos con el del apoderado los volveria invisibles. */}
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Bautizado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jovenes.length === 0
                    ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Sin jóvenes registrados.</TableCell></TableRow>
                    : jovenes.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MemberAvatar member={m} />
                            <span className="font-medium">{m.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>{fmt(m.edad)}</TableCell>
                        <TableCell>{fmt(m.telefono)}</TableCell>
                        <TableCell>
                          {m.bautizado === 'si' ? 'Sí' : m.bautizado === 'no' ? 'No' : '—'}
                        </TableCell>
                        <TableCell><Actions m={m} /></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="ninos" className="mt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Apoderado</TableHead>
                    <TableHead>Tel. apoderado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ninos.length === 0
                    ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Sin niños registrados.</TableCell></TableRow>
                    : ninos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MemberAvatar member={m} />
                            <span className="font-medium">{m.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>{fmt(m.edad)}</TableCell>
                        <TableCell>{fmt(m.nombre_apoderado)}</TableCell>
                        <TableCell>{fmt(m.telefono_apoderado)}</TableCell>
                        <TableCell><Actions m={m} /></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="visitantes" className="mt-0">
              <VisitantesPanel query={query} />
            </TabsContent>

            <TabsContent value="pendientes" className="mt-0">
              <PendientesPanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ViewDialog member={viewing} open={!!viewing} onClose={() => setViewing(null)} />

      {/* Confirmar eliminación — el perfil operativo requiere clave del pastor */}
      <Dialog open={!!deleting} onOpenChange={(o) => { if (!o && !working) { setDeleting(null); setPwd(''); setDeleteError(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Eliminar miembro
            </DialogTitle>
            <DialogDescription>
              Vas a eliminar a <span className="font-semibold text-foreground">{deleting?.nombre}</span> y
              todo su historial de asistencia, para siempre. Esta acción no se puede deshacer.
              <br />
              <span className="mt-1.5 inline-block">
                Si solo quieres que deje de aparecer en listados y estadísticas, cierra esto y usa{' '}
                <strong>Dar de baja</strong>: conserva la ficha y se puede revertir.
              </span>
            </DialogDescription>
          </DialogHeader>

          {!esPastor && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Eliminar requiere autorización. Ingresa la <strong>contraseña del pastor</strong> para continuar.</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd-pastor">Contraseña del pastor</Label>
                <Input
                  id="pwd-pastor"
                  type="password"
                  value={pwd}
                  autoFocus
                  onChange={(e) => setPwd(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && pwd) confirmarEliminar(); }}
                  placeholder="••••••••"
                  disabled={working}
                />
              </div>
            </div>
          )}

          {deleteError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{deleteError}</p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleting(null); setPwd(''); setDeleteError(''); }} disabled={working}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarEliminar}
              disabled={working || (!esPastor && !pwd)}
            >
              {working ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminando...</> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dar de baja: no borra nada, solo registra el retiro */}
      <Dialog open={!!dandoBaja} onOpenChange={(o) => { if (!o && !working) setDandoBaja(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-muted-foreground" />
              Dar de baja
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{dandoBaja?.nombre}</span> dejará de
              aparecer en los listados, en la asistencia de cada domingo y en las estadísticas.
              Su ficha y su historial se conservan: el pastor lo sigue viendo en{' '}
              <strong>Retiros</strong> y puede reactivarlo cuando quiera.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Motivo</Label>
            <RadioGroup value={motivoBaja} onValueChange={setMotivoBaja} className="gap-2">
              {MOTIVOS_BAJA.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <RadioGroupItem value={m} id={`baja-${m}`} />
                  <Label htmlFor={`baja-${m}`} className="cursor-pointer text-sm font-normal">{m}</Label>
                </div>
              ))}
            </RadioGroup>
            {motivoBaja === OTRO_BAJA && (
              <Input
                autoFocus
                value={motivoOtroBaja}
                onChange={(e) => setMotivoOtroBaja(e.target.value)}
                placeholder="Escribe el motivo"
                disabled={working}
              />
            )}
          </div>

          {bajaError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{bajaError}</p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDandoBaja(null)} disabled={working}>Cancelar</Button>
            <Button onClick={confirmarBaja} disabled={working || !motivoBajaFinal}>
              {working ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Dar de baja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ FIX CRÍTICO: key={editing.id} fuerza recrear el MemberForm cada vez */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar miembro</DialogTitle>
            <DialogDescription>Actualiza los datos del registro.</DialogDescription>
          </DialogHeader>
          {editing && (
            <MemberForm
              key={editing.id}
              member={editing}
              onSuccess={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MembersTable;
