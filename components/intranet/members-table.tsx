'use client';

import { useMemo, useState } from 'react';
import { Eye, Loader2, Pencil, Search, ShieldAlert, Trash2, UserRound } from 'lucide-react';
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
import { type AdultoMember, type Member, type NinoMember, getMemberInitials, isAdultoMember, isNinoMember } from '@/lib/types';
import { MemberForm } from '@/components/intranet/member-form';

function fmt(v: string | number | null | undefined) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

function MemberAvatar({ member }: { member: Member }) {
  const cls = member.tipo === 'adulto' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground';
  return (
    <Avatar className="h-9 w-9 border">
      <AvatarFallback className={cls}>
        {getMemberInitials(member.nombre) || <UserRound className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

function TypeBadge({ tipo }: { tipo: 'adulto' | 'nino' }) {
  return (
    <Badge variant="outline" className={tipo === 'adulto' ? 'bg-primary/10 text-primary border-primary/25' : 'bg-accent/10 text-accent border-accent/25'}>
      {tipo === 'adulto' ? 'Adulto' : 'Niño'}
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
  const { members, isLoading, error, deleteMember } = useMembers();
  const { user } = useAuth();
  const esPastor = user?.role === 'pastor';

  const [viewing, setViewing] = useState<Member | null>(null);
  const [editing, setEditing] = useState<Member | null>(null); // ✅ un solo estado
  const [query, setQuery] = useState('');

  // Estado del flujo de eliminación
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [pwd, setPwd] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [working, setWorking] = useState(false);

  const coincide = (m: Member) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [m.nombre, m.telefono, m.email, m.comuna, m.region]
      .some((v) => (v ?? '').toLowerCase().includes(q));
  };

  const adultos = useMemo(
    () => members.filter(isAdultoMember).filter(coincide),
    [members, query],
  );
  const ninos = useMemo(
    () => members.filter(isNinoMember).filter(coincide),
    [members, query],
  );

  const abrirEliminar = (m: Member) => {
    setDeleting(m);
    setPwd('');
    setDeleteError('');
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
      <Button variant="ghost" size="icon" onClick={() => setViewing(m)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setEditing(m)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => abrirEliminar(m)}>
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
          <p className="text-sm text-muted-foreground">Adultos y niños separados en tabs.</p>
          <div className="relative mt-3 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono, email o comuna..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <Tabs defaultValue="adultos">
            <div className="px-6 pb-4">
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="adultos" className="gap-2">
                  Adultos <Badge variant="secondary">{adultos.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="ninos" className="gap-2">
                  Niños <Badge variant="secondary">{ninos.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="adultos" className="mt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Región / Comuna</TableHead>
                    <TableHead>Bautizado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adultos.length === 0
                    ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin adultos registrados.</TableCell></TableRow>
                    : adultos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MemberAvatar member={m} />
                            <span className="font-medium">{m.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>{fmt(m.sexo)}</TableCell>
                        <TableCell>{fmt(m.telefono)}</TableCell>
                        <TableCell>{fmt(m.email)}</TableCell>
                        <TableCell>{fmt(m.region)}{m.comuna ? ` / ${m.comuna}` : ''}</TableCell>
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

            <TabsContent value="ninos" className="mt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Apoderado</TableHead>
                    <TableHead>Tel. apoderado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ninos.length === 0
                    ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Sin niños registrados.</TableCell></TableRow>
                    : ninos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MemberAvatar member={m} />
                            <span className="font-medium">{m.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>{fmt(m.edad)}</TableCell>
                        <TableCell>{fmt(m.sexo)}</TableCell>
                        <TableCell>{fmt(m.nombre_apoderado)}</TableCell>
                        <TableCell>{fmt(m.telefono_apoderado)}</TableCell>
                        <TableCell><Actions m={m} /></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
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
              Vas a eliminar a <span className="font-semibold text-foreground">{deleting?.nombre}</span>. Esta acción no se puede deshacer.
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
