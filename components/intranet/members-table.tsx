'use client';

import { useState } from 'react';
import { Member, AdultoMember, NinoMember, isAdulto, isNino } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useMembers } from '@/lib/members-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Plus, Search, Eye, Users, Baby } from 'lucide-react';

// ── Iniciales para avatar ──────────────────────────────────

function getInitials(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({ nombre, tipo }: { nombre: string; tipo: 'adulto' | 'nino' }) {
  const bg = tipo === 'adulto' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${bg} shrink-0`}>
      {getInitials(nombre)}
    </div>
  );
}

// ── Formularios vacíos ─────────────────────────────────────

const emptyAdulto: Omit<AdultoMember, 'id'> = {
  tipo: 'adulto',
  nombre: '',
  sexo: '',
  telefono: '',
  whatsapp: '',
  email: '',
  region: '',
  comuna: '',
  direccion: '',
  bautizado: '',
  tiempoConversion: '',
  fechaRegistro: new Date().toISOString().split('T')[0],
  status: 'active',
  notes: '',
};

const emptyNino: Omit<NinoMember, 'id'> = {
  tipo: 'nino',
  nombre: '',
  sexo: '',
  telefono: '',
  whatsapp: '',
  email: '',
  region: '',
  comuna: '',
  direccion: '',
  fechaNacimiento: '',
  edad: undefined,
  nombreApoderado: '',
  telefonoApoderado: '',
  fechaRegistro: new Date().toISOString().split('T')[0],
  status: 'active',
  notes: '',
};

// ── Componente principal ───────────────────────────────────

export function MembersTable() {
  const { user } = useAuth();
  const { members, addMember, updateMember, deleteMember } = useMembers();

  const isAdmin = user?.role === 'admin';

  const adultos = members.filter(isAdulto);
  const ninos = members.filter(isNino);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'adultos' | 'ninos'>('adultos');

  // Dialogs
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [isAddingAdulto, setIsAddingAdulto] = useState(false);
  const [isAddingNino, setIsAddingNino] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Member | null>(null);

  // Forms
  const [adultoForm, setAdultoForm] = useState<Omit<AdultoMember, 'id'>>(emptyAdulto);
  const [ninoForm, setNinoForm] = useState<Omit<NinoMember, 'id'>>(emptyNino);

  // ── Filtro ───────────────────────────────────────────────

  const filterMembers = <T extends Member>(list: T[]): T[] => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.region?.toLowerCase().includes(q) ||
      m.comuna?.toLowerCase().includes(q) ||
      (isNino(m) && m.nombreApoderado?.toLowerCase().includes(q))
    );
  };

  // ── Abrir edición ────────────────────────────────────────

  const openEdit = (m: Member) => {
    setEditMember(m);
    if (isAdulto(m)) setAdultoForm({ ...emptyAdulto, ...m });
    else setNinoForm({ ...emptyNino, ...m });
  };

  const closeDialogs = () => {
    setEditMember(null);
    setIsAddingAdulto(false);
    setIsAddingNino(false);
    setAdultoForm(emptyAdulto);
    setNinoForm(emptyNino);
  };

  // ── Guardar ──────────────────────────────────────────────

  const handleSaveAdulto = async () => {
    if (editMember) await updateMember(editMember.id, adultoForm);
    else await addMember(adultoForm);
    closeDialogs();
  };

  const handleSaveNino = async () => {
    if (editMember) await updateMember(editMember.id, ninoForm);
    else await addMember(ninoForm);
    closeDialogs();
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteMember(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  // ── UI ───────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, región..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={() => { setIsAddingAdulto(true); setAdultoForm(emptyAdulto); }}
              variant="default"
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Agregar Adulto
            </Button>
            <Button
              onClick={() => { setIsAddingNino(true); setNinoForm(emptyNino); }}
              variant="outline"
              className="gap-2"
            >
              <Baby className="h-4 w-4" />
              Agregar Niño
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="adultos" className="gap-2">
            <Users className="h-4 w-4" />
            Adultos
            <Badge variant="secondary" className="ml-1">{adultos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ninos" className="gap-2">
            <Baby className="h-4 w-4" />
            Niños
            <Badge variant="secondary" className="ml-1">{ninos.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Tabla ADULTOS ── */}
        <TabsContent value="adultos">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Teléfono / WhatsApp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Región / Comuna</TableHead>
                  <TableHead>Bautizado</TableHead>
                  <TableHead>Conversión</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterMembers(adultos).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      {search ? 'Sin resultados' : 'No hay adultos registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filterMembers(adultos).map(m => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar nombre={m.nombre} tipo="adulto" />
                          <span className="font-medium">{m.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>{m.sexo || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div>{m.telefono || '—'}</div>
                        {m.whatsapp && <div className="text-muted-foreground">{m.whatsapp}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{m.email || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div>{m.region || '—'}</div>
                        {m.comuna && <div className="text-muted-foreground">{m.comuna}</div>}
                      </TableCell>
                      <TableCell>
                        {m.bautizado ? (
                          <Badge variant={m.bautizado === 'Sí' ? 'default' : 'secondary'}>
                            {m.bautizado}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{m.tiempoConversion || '—'}</TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          member={m}
                          isAdmin={isAdmin}
                          onView={() => setViewMember(m)}
                          onEdit={() => openEdit(m)}
                          onDelete={() => setDeleteConfirm(m)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Tabla NIÑOS ── */}
        <TabsContent value="ninos">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Apoderado</TableHead>
                  <TableHead>Tel. Apoderado</TableHead>
                  <TableHead>Región / Comuna</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterMembers(ninos).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      {search ? 'Sin resultados' : 'No hay niños registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filterMembers(ninos).map(m => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar nombre={m.nombre} tipo="nino" />
                          <span className="font-medium">{m.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>{m.edad ?? '—'}</TableCell>
                      <TableCell>{m.sexo || '—'}</TableCell>
                      <TableCell>{m.nombreApoderado || '—'}</TableCell>
                      <TableCell>{m.telefonoApoderado || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div>{m.region || '—'}</div>
                        {m.comuna && <div className="text-muted-foreground">{m.comuna}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          member={m}
                          isAdmin={isAdmin}
                          onView={() => setViewMember(m)}
                          onEdit={() => openEdit(m)}
                          onDelete={() => setDeleteConfirm(m)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modal VER ── */}
      <Dialog open={!!viewMember} onOpenChange={() => setViewMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewMember && <Avatar nombre={viewMember.nombre} tipo={viewMember.tipo} />}
              {viewMember?.nombre}
              {viewMember && (
                <Badge className={viewMember.tipo === 'adulto' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-purple-100 text-purple-700 border-purple-200'} variant="outline">
                  {viewMember.tipo === 'adulto' ? 'Adulto' : 'Niño'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewMember && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Nombre" value={viewMember.nombre} />
              <Field label="Sexo" value={viewMember.sexo} />
              <Field label="Teléfono" value={viewMember.telefono} />
              <Field label="WhatsApp" value={viewMember.whatsapp} />
              <Field label="Email" value={viewMember.email} span />
              <Field label="Región" value={viewMember.region} />
              <Field label="Comuna" value={viewMember.comuna} />
              <Field label="Dirección" value={viewMember.direccion} span />
              <Field label="Fecha Registro" value={formatDate(viewMember.fechaRegistro)} />
              {isAdulto(viewMember) && <>
                <Field label="Bautizado" value={viewMember.bautizado} />
                <Field label="Tiempo conversión" value={viewMember.tiempoConversion} span />
              </>}
              {isNino(viewMember) && <>
                <Field label="Fecha Nacimiento" value={formatDate(viewMember.fechaNacimiento)} />
                <Field label="Edad" value={viewMember.edad !== undefined ? String(viewMember.edad) : undefined} />
                <Field label="Apoderado" value={viewMember.nombreApoderado} />
                <Field label="Tel. Apoderado" value={viewMember.telefonoApoderado} />
              </>}
              {viewMember.notes && <Field label="Notas" value={viewMember.notes} span />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog EDITAR / AGREGAR ADULTO ── */}
      <Dialog
        open={isAddingAdulto || (!!editMember && isAdulto(editMember as Member))}
        onOpenChange={closeDialogs}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMember ? 'Editar Adulto' : 'Agregar Adulto'}</DialogTitle>
            <DialogDescription>
              {editMember ? 'Modifica los datos del adulto' : 'Completa los datos del nuevo adulto'}
            </DialogDescription>
          </DialogHeader>
          <AdultoForm form={adultoForm} onChange={setAdultoForm} isAdmin={isAdmin} />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancelar</Button>
            <Button onClick={handleSaveAdulto}>{editMember ? 'Guardar' : 'Agregar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog EDITAR / AGREGAR NIÑO ── */}
      <Dialog
        open={isAddingNino || (!!editMember && isNino(editMember as Member))}
        onOpenChange={closeDialogs}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMember ? 'Editar Niño' : 'Agregar Niño'}</DialogTitle>
            <DialogDescription>
              {editMember ? 'Modifica los datos del niño' : 'Completa los datos del nuevo niño'}
            </DialogDescription>
          </DialogHeader>
          <NinoForm form={ninoForm} onChange={setNinoForm} isAdmin={isAdmin} />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancelar</Button>
            <Button onClick={handleSaveNino}>{editMember ? 'Guardar' : 'Agregar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmación eliminar ── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Persona</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar a <strong>{deleteConfirm?.nombre}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Botones de acción por fila ─────────────────────────────

function RowActions({
  member, isAdmin, onView, onEdit, onDelete,
}: {
  member: Member;
  isAdmin: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-1 justify-end">
      <Button variant="ghost" size="sm" onClick={onView} title="Ver detalle">
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onEdit} title="Editar">
        <Edit className="h-4 w-4" />
      </Button>
      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ── Helper Field para modal ver ────────────────────────────

function Field({ label, value, span }: { label: string; value?: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}

// ── Formulario Adulto ──────────────────────────────────────

function AdultoForm({
  form, onChange, isAdmin,
}: {
  form: Omit<AdultoMember, 'id'>;
  onChange: (f: Omit<AdultoMember, 'id'>) => void;
  isAdmin: boolean;
}) {
  const u = (field: keyof Omit<AdultoMember, 'id'>, val: string) =>
    onChange({ ...form, [field]: val });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label>Nombre completo</Label>
          <Input value={form.nombre} onChange={e => u('nombre', e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Sexo</Label>
          <Select value={form.sexo ?? ''} onValueChange={v => u('sexo', v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculino">Masculino</SelectItem>
              <SelectItem value="Femenino">Femenino</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Teléfono</Label>
          <Input value={form.telefono ?? ''} onChange={e => u('telefono', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>WhatsApp</Label>
          <Input value={form.whatsapp ?? ''} onChange={e => u('whatsapp', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={form.email ?? ''} onChange={e => u('email', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Región</Label>
          <Input value={form.region ?? ''} onChange={e => u('region', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Comuna</Label>
          <Input value={form.comuna ?? ''} onChange={e => u('comuna', e.target.value)} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Dirección</Label>
          <Input value={form.direccion ?? ''} onChange={e => u('direccion', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Bautizado</Label>
          <Select value={form.bautizado ?? ''} onValueChange={v => u('bautizado', v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Sí">Sí</SelectItem>
              <SelectItem value="No">No</SelectItem>
              <SelectItem value="En proceso">En proceso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Tiempo de conversión</Label>
          <Input
            value={form.tiempoConversion ?? ''}
            onChange={e => u('tiempoConversion', e.target.value)}
            placeholder="ej: 2 años"
          />
        </div>
        <div className="space-y-1">
          <Label>Fecha de registro</Label>
          <Input
            type="date"
            value={form.fechaRegistro}
            onChange={e => u('fechaRegistro', e.target.value)}
            disabled={!isAdmin}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Notas</Label>
          <Textarea
            value={form.notes ?? ''}
            onChange={e => u('notes', e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

// ── Formulario Niño ────────────────────────────────────────

function NinoForm({
  form, onChange, isAdmin,
}: {
  form: Omit<NinoMember, 'id'>;
  onChange: (f: Omit<NinoMember, 'id'>) => void;
  isAdmin: boolean;
}) {
  const u = (field: keyof Omit<NinoMember, 'id'>, val: any) =>
    onChange({ ...form, [field]: val });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label>Nombre completo</Label>
          <Input value={form.nombre} onChange={e => u('nombre', e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Fecha de nacimiento</Label>
          <Input
            type="date"
            value={form.fechaNacimiento ?? ''}
            onChange={e => u('fechaNacimiento', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Edad</Label>
          <Input
            type="number"
            min={0}
            max={17}
            value={form.edad ?? ''}
            onChange={e => u('edad', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="space-y-1">
          <Label>Sexo</Label>
          <Select value={form.sexo ?? ''} onValueChange={v => u('sexo', v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculino">Masculino</SelectItem>
              <SelectItem value="Femenino">Femenino</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Región</Label>
          <Input value={form.region ?? ''} onChange={e => u('region', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Comuna</Label>
          <Input value={form.comuna ?? ''} onChange={e => u('comuna', e.target.value)} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Dirección</Label>
          <Input value={form.direccion ?? ''} onChange={e => u('direccion', e.target.value)} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Nombre del apoderado</Label>
          <Input
            value={form.nombreApoderado ?? ''}
            onChange={e => u('nombreApoderado', e.target.value)}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Teléfono del apoderado</Label>
          <Input
            value={form.telefonoApoderado ?? ''}
            onChange={e => u('telefonoApoderado', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Fecha de registro</Label>
          <Input
            type="date"
            value={form.fechaRegistro}
            onChange={e => u('fechaRegistro', e.target.value)}
            disabled={!isAdmin}
          />
        </div>
      </div>
    </div>
  );
}