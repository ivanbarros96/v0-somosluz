'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Member, AdultoMember, NinoMember } from '@/lib/types';

type MembersContextType = {
  members: Member[];
  isLoading: boolean;
  error: string | null;
  refreshMembers: () => Promise<void>;
  addMember: (data: Omit<AdultoMember, 'id' | 'created_at'> | Omit<NinoMember, 'id' | 'created_at'>) => Promise<void>;
  updateMember: (id: string, data: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
};

const MembersContext = createContext<MembersContextType | undefined>(undefined);

function mapToMember(row: any): Member {
  const base = {
    id: String(row.id),
    source_id: row.source_id ?? null,
    fecha_registro: row.fecha_registro ?? null,
    nombre: row.nombre ?? '',
    sexo: row.sexo ?? null,
    telefono: row.telefono ?? null,
    whatsapp: row.whatsapp ?? null,
    email: row.email ?? null,
    region: row.region ?? null,
    comuna: row.comuna ?? null,
    direccion: row.direccion ?? null,
    created_at: row.created_at ?? null,
  };

  if (row.source_tipo === 'nino') {
    return {
      ...base,
      tipo: 'nino',
      fecha_nacimiento: row.fecha_nacimiento ?? null,
      edad: row.edad ?? null,
      nombre_apoderado: row.nombre_apoderado ?? null,
      telefono_apoderado: row.telefono_apoderado ?? null,
    } as NinoMember;
  }

  return {
    ...base,
    tipo: 'adulto',
    bautizado: row.bautizado ?? null,
    tiempo_conversion: row.tiempo_conversion ?? null,
    fecha_nacimiento: row.fecha_nacimiento ?? null, // ✅
    edad: row.edad ?? null,                          // ✅
  } as AdultoMember;
}

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setMembers((data ?? []).map(mapToMember));
    }
    setIsLoading(false);
  }, []);

  const addMember = useCallback(async (
    data: Omit<AdultoMember, 'id' | 'created_at'> | Omit<NinoMember, 'id' | 'created_at'>
  ) => {
    const row: any = {
      source_tipo: data.tipo,
      source_id: data.source_id,
      fecha_registro: data.fecha_registro,
      nombre: data.nombre,
      sexo: data.sexo,
      telefono: data.telefono,
      whatsapp: data.whatsapp,
      email: data.email,
      region: data.region,
      comuna: data.comuna,
      direccion: data.direccion,
    };

    if (data.tipo === 'adulto') {
      const a = data as Omit<AdultoMember, 'id' | 'created_at'>;
      row.bautizado = a.bautizado;
      row.tiempo_conversion = a.tiempo_conversion;
      row.fecha_nacimiento = a.fecha_nacimiento ?? null; // ✅ sin as any
      row.edad = a.edad ?? null;                         // ✅ sin as any
    } else {
      const n = data as Omit<NinoMember, 'id' | 'created_at'>;
      row.fecha_nacimiento = n.fecha_nacimiento;
      row.edad = n.edad;
      row.nombre_apoderado = n.nombre_apoderado;
      row.telefono_apoderado = n.telefono_apoderado;
    }

    const { error } = await supabase.from('personas').insert(row);
    if (error) throw new Error(error.message);
    await refreshMembers();
  }, [refreshMembers]);

  const updateMember = useCallback(async (id: string, data: Partial<Member>) => {
    const row: any = {};
    if (data.nombre !== undefined) row.nombre = data.nombre;
    if (data.sexo !== undefined) row.sexo = data.sexo;
    if (data.telefono !== undefined) row.telefono = data.telefono;
    if (data.whatsapp !== undefined) row.whatsapp = data.whatsapp;
    if (data.email !== undefined) row.email = data.email;
    if (data.region !== undefined) row.region = data.region;
    if (data.comuna !== undefined) row.comuna = data.comuna;
    if (data.direccion !== undefined) row.direccion = data.direccion;
    if (data.fecha_registro !== undefined) row.fecha_registro = data.fecha_registro;
    if ('bautizado' in data) row.bautizado = data.bautizado;
    if ('tiempo_conversion' in data) row.tiempo_conversion = data.tiempo_conversion;
    if ('fecha_nacimiento' in data) row.fecha_nacimiento = data.fecha_nacimiento;
    if ('edad' in data) row.edad = data.edad;
    if ('nombre_apoderado' in data) row.nombre_apoderado = data.nombre_apoderado;
    if ('telefono_apoderado' in data) row.telefono_apoderado = data.telefono_apoderado;

    const { error } = await supabase.from('personas').update(row).eq('id', id);
    if (error) throw new Error(error.message);
    await refreshMembers();
  }, [refreshMembers]);

  const deleteMember = useCallback(async (id: string) => {
    const { error } = await supabase.from('personas').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  return (
    <MembersContext.Provider value={{ members, isLoading, error, refreshMembers, addMember, updateMember, deleteMember }}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  const ctx = useContext(MembersContext);
  if (!ctx) throw new Error('useMembers debe usarse dentro de MembersProvider');
  return ctx;
}