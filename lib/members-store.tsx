'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Member, AdultoMember, NinoMember } from './types';
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

// ── Mapear fila Supabase → Member ──────────────────────────

function mapToMember(row: any): Member {
  const tipo: 'adulto' | 'nino' = row.source_tipo === 'nino' ? 'nino' : 'adulto';

  const base = {
    id: String(row.id),
    tipo,
    sourceId: row.source_id,
    fechaRegistro: row.fecha_registro
      ? new Date(row.fecha_registro).toISOString().split('T')[0]
      : row.created_at
        ? new Date(row.created_at).toISOString().split('T')[0]
        : '',
    nombre: row.nombre ?? '',
    sexo: row.sexo ?? '',
    telefono: row.telefono ?? '',
    whatsapp: row.whatsapp ?? '',
    email: row.email ?? '',
    region: row.region ?? '',
    comuna: row.comuna ?? '',
    direccion: row.direccion ?? '',
    status: 'active' as const,
    notes: row.notes ?? '',
  };

  if (tipo === 'nino') {
    const nino: NinoMember = {
      ...base,
      tipo: 'nino',
      fechaNacimiento: row.fecha_nacimiento
        ? new Date(row.fecha_nacimiento).toISOString().split('T')[0]
        : undefined,
      edad: row.edad ?? undefined,
      nombreApoderado: row.nombre_apoderado ?? '',
      telefonoApoderado: row.telefono_apoderado ?? '',
    };
    return nino;
  } else {
    const adulto: AdultoMember = {
      ...base,
      tipo: 'adulto',
      bautizado: row.bautizado ?? '',
      tiempoConversion: row.tiempo_conversion ?? '',
    };
    return adulto;
  }
}

// ── Mapear Member → fila Supabase ──────────────────────────

function mapToRow(member: Omit<Member, 'id'>) {
  const base: any = {
    source_tipo: member.tipo,
    source_id: member.sourceId ?? Date.now(),
    fecha_registro: member.fechaRegistro || new Date().toISOString(),
    nombre: member.nombre?.trim() || '',
    sexo: member.sexo || null,
    telefono: member.telefono || null,
    whatsapp: member.whatsapp || null,
    email: member.email || null,
    region: member.region || null,
    comuna: member.comuna || null,
    direccion: member.direccion || null,
    notes: member.notes || null,
  };

  if (member.tipo === 'nino') {
    base.fecha_nacimiento = member.fechaNacimiento || null;
    base.edad = member.edad ?? null;
    base.nombre_apoderado = member.nombreApoderado || null;
    base.telefono_apoderado = member.telefonoApoderado || null;
  } else {
    base.bautizado = member.bautizado || null;
    base.tiempo_conversion = member.tiempoConversion || null;
  }

  return base;
}

// ── Mapear campos de update parcial → columnas Supabase ────

function mapUpdateFields(data: Partial<Member>): any {
  const row: any = {};

  if (data.nombre !== undefined) row.nombre = data.nombre;
  if (data.sexo !== undefined) row.sexo = data.sexo;
  if (data.telefono !== undefined) row.telefono = data.telefono;
  if (data.whatsapp !== undefined) row.whatsapp = data.whatsapp;
  if (data.email !== undefined) row.email = data.email;
  if (data.region !== undefined) row.region = data.region;
  if (data.comuna !== undefined) row.comuna = data.comuna;
  if (data.direccion !== undefined) row.direccion = data.direccion;
  if (data.fechaRegistro !== undefined) row.fecha_registro = data.fechaRegistro;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.tipo !== undefined) row.source_tipo = data.tipo;

  // Campos de adulto
  if ('bautizado' in data && data.bautizado !== undefined) row.bautizado = data.bautizado;
  if ('tiempoConversion' in data && data.tiempoConversion !== undefined)
    row.tiempo_conversion = data.tiempoConversion;

  // Campos de niño
  if ('fechaNacimiento' in data && data.fechaNacimiento !== undefined)
    row.fecha_nacimiento = data.fechaNacimiento;
  if ('edad' in data && data.edad !== undefined) row.edad = data.edad;
  if ('nombreApoderado' in data && data.nombreApoderado !== undefined)
    row.nombre_apoderado = data.nombreApoderado;
  if ('telefonoApoderado' in data && data.telefonoApoderado !== undefined)
    row.telefono_apoderado = data.telefonoApoderado;

  return row;
}

// ── Provider ───────────────────────────────────────────────

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
    const updateRow = mapUpdateFields(memberData);

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
    const { error } = await supabase.from('personas').delete().eq('id', id);

    if (!error) {
      setMembers(prev => prev.filter(m => m.id !== id));
    } else {
      console.error('Error deleting member:', error);
    }
  };

  const getMemberById = (id: string) => members.find(m => m.id === id);

  return (
    <MembersContext.Provider
      value={{
        members,
        isLoading,
        addMember,
        updateMember,
        deleteMember,
        getMemberById,
        refreshMembers: fetchMembers,
      }}
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