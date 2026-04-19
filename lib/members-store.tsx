'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Member } from './types';
import { supabase } from './supabase';

interface MembersContextType {
  members: Member[];
  isLoading: boolean;
  addMember: (member: Omit<Member, 'id'>) => Promise<void>;
  updateMember: (id: string, data: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  getMemberById: (id: string) => Member | undefined;
  refreshMembers: () => Promise<void>;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

// Mapear fila de Supabase al tipo Member
function mapToMember(row: any): Member {
  return {
    id: String(row.id),
    firstName: row.nombre?.split(' ')[0] ?? '',
    lastName: row.nombre?.split(' ').slice(1).join(' ') ?? '',
    email: row.email ?? '',
    phone: row.telefono ?? row.whatsapp ?? '',
    registrationDate: row.fecha_registro
      ? new Date(row.fecha_registro).toISOString().split('T')[0]
      : row.created_at
      ? new Date(row.created_at).toISOString().split('T')[0]
      : '',
    status: 'active',
    ministry: row.region ?? '',
    notes: [
      row.bautizado ? `Bautizado: ${row.bautizado}` : '',
      row.tiempo_conversion ? `Conversion: ${row.tiempo_conversion}` : '',
      row.comuna ? `Comuna: ${row.comuna}` : '',
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

// Mapear Member al formato de Supabase para insertar/actualizar
function mapToRow(member: Omit<Member, 'id'>) {
  return {
    nombre: `${member.firstName} ${member.lastName}`.trim(),
    email: member.email || null,
    telefono: member.phone || null,
    fecha_registro: member.registrationDate || new Date().toISOString(),
    source_tipo: 'intranet',
    source_id: Date.now(),
    region: member.ministry || null,
  };
}

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMembers(data.map(mapToMember));
    } else {
      console.error('Error fetching members:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const addMember = async (memberData: Omit<Member, 'id'>) => {
    const row = mapToRow(memberData);
    const { data, error } = await supabase
      .from('personas')
      .insert(row)
      .select()
      .single();

    if (!error && data) {
      setMembers(prev => [mapToMember(data), ...prev]);
    } else {
      console.error('Error adding member:', error);
    }
  };

  const updateMember = async (id: string, memberData: Partial<Member>) => {
    const updateRow: any = {};
    if (memberData.firstName || memberData.lastName) {
      const current = members.find(m => m.id === id);
      const firstName = memberData.firstName ?? current?.firstName ?? '';
      const lastName = memberData.lastName ?? current?.lastName ?? '';
      updateRow.nombre = `${firstName} ${lastName}`.trim();
    }
    if (memberData.email !== undefined) updateRow.email = memberData.email;
    if (memberData.phone !== undefined) updateRow.telefono = memberData.phone;
    if (memberData.ministry !== undefined) updateRow.region = memberData.ministry;
    if (memberData.registrationDate !== undefined) updateRow.fecha_registro = memberData.registrationDate;

    const { data, error } = await supabase
      .from('personas')
      .update(updateRow)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setMembers(prev => prev.map(m => (m.id === id ? mapToMember(data) : m)));
    } else {
      console.error('Error updating member:', error);
    }
  };

  const deleteMember = async (id: string) => {
    const { error } = await supabase
      .from('personas')
      .delete()
      .eq('id', id);

    if (!error) {
      setMembers(prev => prev.filter(m => m.id !== id));
    } else {
      console.error('Error deleting member:', error);
    }
  };

  const getMemberById = (id: string) => members.find(m => m.id === id);

  return (
    <MembersContext.Provider
      value={{ members, isLoading, addMember, updateMember, deleteMember, getMemberById, refreshMembers: fetchMembers }}
    >
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  const context = useContext(MembersContext);
  if (context === undefined) {
    throw new Error('useMembers must be used within a MembersProvider');
  }
  return context;
}
