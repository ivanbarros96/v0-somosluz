'use client';

import { useState } from 'react';
import { Member } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useMembers } from '@/lib/members-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Plus, Search, Eye } from 'lucide-react';

interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registrationDate: string;
  status: 'active' | 'inactive';
  ministry: string;
  notes: string;
}

const emptyFormData: MemberFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  registrationDate: new Date().toISOString().split('T')[0],
  status: 'active',
  ministry: '',
  notes: ''
};

export function MembersTable() {
  const { user } = useAuth();
  const { members, addMember, updateMember, deleteMember } = useMembers();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(emptyFormData);

  const isAdmin = user?.role === 'admin';

  // Filter members by search term
  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      (member.ministry?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      registrationDate: member.registrationDate,
      status: member.status,
      ministry: member.ministry || '',
      notes: member.notes || ''
    });
  };

  const handleOpenAdd = () => {
    setIsAddingNew(true);
    setFormData(emptyFormData);
  };

  const handleCloseDialog = () => {
    setEditingMember(null);
    setIsAddingNew(false);
    setFormData(emptyFormData);
  };

  const handleSave = () => {
    if (isAddingNew) {
      addMember(formData);
    } else if (editingMember) {
      updateMember(editingMember.id, formData);
    }
    handleCloseDialog();
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteMember(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div>
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar miembros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <Button onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Miembro
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Ministerio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {searchTerm ? 'No se encontraron miembros' : 'No hay miembros registrados'}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.firstName} {member.lastName}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>{member.ministry || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                      {member.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(member.registrationDate)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingMember(member)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(member)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewingMember} onOpenChange={() => setViewingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Miembro</DialogTitle>
          </DialogHeader>
          {viewingMember && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nombre</Label>
                  <p className="font-medium">{viewingMember.firstName} {viewingMember.lastName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <p>
                    <Badge variant={viewingMember.status === 'active' ? 'default' : 'secondary'}>
                      {viewingMember.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{viewingMember.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Telefono</Label>
                  <p className="font-medium">{viewingMember.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ministerio</Label>
                  <p className="font-medium">{viewingMember.ministry || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha Registro</Label>
                  <p className="font-medium">{formatDate(viewingMember.registrationDate)}</p>
                </div>
              </div>
              {viewingMember.notes && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="font-medium">{viewingMember.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddingNew || !!editingMember} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAddingNew ? 'Agregar Miembro' : 'Editar Miembro'}
            </DialogTitle>
            <DialogDescription>
              {isAddingNew ? 'Completa los datos del nuevo miembro' : 'Modifica los datos del miembro'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ministry">Ministerio</Label>
                <Input
                  id="ministry"
                  value={formData.ministry}
                  onChange={(e) => setFormData({ ...formData, ministry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationDate">Fecha de Registro</Label>
              <Input
                id="registrationDate"
                type="date"
                value={formData.registrationDate}
                onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {isAddingNew ? 'Agregar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Miembro</AlertDialogTitle>
            <AlertDialogDescription>
              Esta seguro que desea eliminar a {deleteConfirm?.firstName} {deleteConfirm?.lastName}? 
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
