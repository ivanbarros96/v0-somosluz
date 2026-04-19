'use client';

import { useMemo, useState } from 'react';
import { Eye, Pencil, Trash2, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMembers } from '@/lib/members-store';
import { type AdultoMember, type Member, type NinoMember, getMemberInitials, isAdultoMember, isNinoMember } from '@/lib/types';
import { MemberForm } from '@/components/intranet/member-form';

function fmt(v: string | number | null | undefined) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

function MemberAvatar({ member }: { member: Member }) {
  const cls = member.tipo === 'adulto' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white';
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
    <Badge variant="outline" className={tipo === 'adulto' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'}>
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
              <p>{fmt((member as any).fecha_nacimiento)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Edad</p>
              <p>{fmt((member as any).edad)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Bautizado</p>
              <p>{fmt(member.bautizado)}</p>
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

function EditAdultoDialog({ member, open, onClose }: { member: AdultoMember | null; open: boolean; onClose: () => void }) {
  const { updateMember } = useMembers();
  const [form, setForm] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  useMemo(() => setForm(member ? { ...member } : null), [member]);
  if (!member || !form) return null;
  const set = (k: string, v: any) => setForm((p: any) => p ? { ...p, [k]: v } : p);
  const save = async () => {
    setSaving(true);
    try { await updateMember(member.id, form); onClose(); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar adulto</DialogTitle>
          <DialogDescription>Actualiza los datos pastorales y de contacto.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="md:col-span-2 grid gap-2"><Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} /></div>
          <div className="grid gap-2"><Label>Sexo</Label>
            <Select value={form.sexo ?? ''} onValueChange={(v) => set('sexo', v || null)}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Femenino">Femenino</SelectItem>
              </SelectContent>
            </Select></div>
          <div className="grid gap-2"><Label>Bautizado</Label>
            <Select value={form.bautizado ?? ''} onValueChange={(v) => set('bautizado', v || null)}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="en_proceso">En proceso</SelectItem>
              </SelectContent>
            </Select></div>
          <div className="grid gap-2"><Label>Fecha nacimiento</Label>
            <Input value={form.fecha_nacimiento ?? ''} onChange={(e) => set('fecha_nacimiento', e.target.value || null)} placeholder="DD/M/YYYY" /></div>
          <div className="grid gap-2"><Label>Edad</Label>
            <Input type="number" min={0} value={form.edad ?? ''} onChange={(e) => set('edad', e.target.value === '' ? null : Number(e.target.value))} /></div>
          <div className="grid gap-2"><Label>Teléfono</Label>
            <Input value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value || null)} /></div>
          <div className="grid gap-2"><Label>WhatsApp</Label>
            <Input value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value || null)} /></div>
          <div className="grid gap-2"><Label>Email</Label>
            <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value || null)} /></div>
          <div className="grid gap-2"><Label>Tiempo conversión</Label>
            <Input value={form.tiempo_conversion ?? ''} onChange={(e) => set('tiempo_conversion', e.target.value || null)} placeholder="Ej: 16 Años" /></div>
          <div className="grid gap-2"><Label>Región</Label>
            <Input value={form.region ?? ''} onChange={(e) => set('region', e.target.value || null)} /></div>
          <div className="grid gap-2"><Label>Comuna</Label>
            <Input value={form.comuna ?? ''} onChange={(e) => set('comuna', e.target.value || null)} /></div>
          <div className="md:col-span-2 grid gap-2"><Label>Dirección</Label>
            <Input value={form.direccion ?? ''} onChange={(e) => set('direccion', e.target.value || null)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditNinoDialog({ member, open, onClose }: { member: NinoMember | null; open: boolean; onClose: () => void }) {
  const { updateMember } = useMembers();
  const [form, setForm] = useState<NinoMember | null>(null);
  const [saving, setSaving] = useState(false);
  useMemo(() => setForm(member ? { ...member } : null), [member]);
  if (!member || !form) return null;
  const set = <K extends keyof NinoMember>(k: K, v: NinoMember[K]) => setForm((p) => p ? { ...p, [k]: v } : p);
  const save = async () => {
    setSaving(true);
    try { await updateMember(member.id, form); onClose(); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar niño</DialogTitle>
          <DialogDescription>Actualiza los datos del menor y su apoderado.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="md:col-span-2 grid gap-2"><Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} /></div>
          <div className="grid gap-2"><Label>Fecha nacimiento</Label>
            <Input value={form.fecha_nacimiento ?? ''} onChange={(e) => set('fecha_nacimiento', e.target.value || null)} placeholder="DD/M/YYYY" /></div>
          <div className="grid gap-2"><Label>Edad</Label>
            <Input type="number" min={0} value={form.edad ?? ''} onChange={(e) => set('edad', e.target.value === '' ? null : Number(e.target.value))} /></div>
          <div className="grid gap-2"><Label>Sexo</Label>
            <Select value={form.sexo ?? ''} onValueChange={(v) => set('sexo', v || null)}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Femenino">Femenino</SelectItem>
              </SelectContent>
            </Select></div>
          <div className="grid gap-2"><Label>Nombre apoderado</Label>
            <Input value={form.nombre_apoderado ?? ''} onChange={(e) => set('nombre_apoderado', e.target.value || null)} /></div>
          <div className="grid gap-2"><Label>Teléfono apoderado</Label>
            <Input value={form.telefono_apoderado ?? ''} onChange={(e) => set('telefono_apoderado', e.target.value || null)} /></div>
          <div className="grid gap-2"><Label>Región</Label>
            <Input value={form.region ?? ''} onChange={(e) => set('region', e.target.value || null)} /></div>
          <div className="grid gap-2"><Label>Comuna</Label>
            <Input value={form.comuna ?? ''} onChange={(e) => set('comuna', e.target.value || null)} /></div>
          <div className="md:col-span-2 grid gap-2"><Label>Dirección</Label>
            <Input value={form.direccion ?? ''} onChange={(e) => set('direccion', e.target.value || null)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MembersTable() {
  const { members, isLoading, error, deleteMember } = useMembers();
  const [viewing, setViewing] = useState<Member | null>(null);
  const [editAdulto, setEditAdulto] = useState<AdultoMember | null>(null);
  const [editNino, setEditNino] = useState<NinoMember | null>(null);

  const adultos = useMemo(() => members.filter(isAdultoMember), [members]);
  const ninos = useMemo(() => members.filter(isNinoMember), [members]);

  const handleDelete = async (m: Member) => {
    if (window.confirm(`¿Eliminar a ${m.nombre}?`)) await deleteMember(m.id);
  };

  const Actions = ({ m }: { m: Member }) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={() => setViewing(m)}><Eye className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => isAdultoMember(m) ? setEditAdulto(m) : setEditNino(m as NinoMember)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(m)}>
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
                        <TableCell>{fmt(m.bautizado)}</TableCell>
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
                    <TableHead>Región / Comuna</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ninos.length === 0
                    ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Sin niños registrados.</TableCell></TableRow>
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
                        <TableCell>{fmt(m.region)}{m.comuna ? ` / ${m.comuna}` : ''}</TableCell>
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
      <Dialog open={!!(editAdulto || editNino)} onOpenChange={(o) => { if (!o) { setEditAdulto(null); setEditNino(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar miembro</DialogTitle>
            <DialogDescription>Actualiza los datos del registro.</DialogDescription>
          </DialogHeader>
          <MemberForm
            member={editAdulto ?? editNino}
            onSuccess={() => { setEditAdulto(null); setEditNino(null); }}
            onCancel={() => { setEditAdulto(null); setEditNino(null); }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MembersTable;