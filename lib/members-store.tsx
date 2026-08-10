'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getPersonas, getIdsRetirados } from '@/lib/datos';
import { useAuth } from '@/lib/auth-context';
import type { Member, AdultoMember, NinoMember, JovenMember } from '@/lib/types';

type MembersContextType = {
  members: Member[];
  isLoading: boolean;
  error: string | null;
  refreshMembers: () => Promise<void>;
  addMember: (data: Omit<AdultoMember, 'id' | 'created_at'> | Omit<NinoMember, 'id' | 'created_at'> | Omit<JovenMember, 'id' | 'created_at'>) => Promise<void>;
  updateMember: (id: string, data: Partial<Member>) => Promise<void>;
  deleteMember: (id: string, pastorPassword?: string) => Promise<void>;
  convertirVisitante: (visitanteId: number, data: Omit<AdultoMember, 'id' | 'created_at'> | Omit<NinoMember, 'id' | 'created_at'> | Omit<JovenMember, 'id' | 'created_at'>) => Promise<void>;
};

const MembersContext = createContext<MembersContextType | undefined>(undefined);

type NuevoMiembro =
  | Omit<AdultoMember, 'id' | 'created_at'>
  | Omit<NinoMember, 'id' | 'created_at'>
  | Omit<JovenMember, 'id' | 'created_at'>;

// Traduce la ficha del formulario a la fila de la tabla `personas`. Compartido
// entre crear un miembro y convertir un visitante, para que ambos caminos
// guarden exactamente los mismos campos.
// `fecha_nac`, `cumple_mes` y `cumple_dia` no van acá: los deriva de
// `fecha_nacimiento` el trigger trg_personas_sync_fecha_nac.
function memberToRow(data: NuevoMiembro): Record<string, unknown> {
  const row: Record<string, unknown> = {
    source_tipo: data.tipo,
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
    row.fecha_nacimiento = a.fecha_nacimiento ?? null;
    row.edad = a.edad ?? null;
  } else if (data.tipo === 'joven') {
    const j = data as Omit<JovenMember, 'id' | 'created_at'>;
    row.bautizado = j.bautizado;
    row.tiempo_conversion = j.tiempo_conversion;
    row.fecha_nacimiento = j.fecha_nacimiento ?? null;
    row.edad = j.edad ?? null;
    row.nombre_apoderado = j.nombre_apoderado ?? null;
    row.telefono_apoderado = j.telefono_apoderado ?? null;
  } else {
    const n = data as Omit<NinoMember, 'id' | 'created_at'>;
    row.fecha_nacimiento = n.fecha_nacimiento;
    row.edad = n.edad;
    row.nombre_apoderado = n.nombre_apoderado;
    row.telefono_apoderado = n.telefono_apoderado;
  }

  return row;
}

function mapToMember(row: any): Member {
  const base = {
    id: String(row.id),
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

  if (row.source_tipo === 'joven') {
    return {
      ...base,
      tipo: 'joven',
      bautizado: row.bautizado ?? null,
      tiempo_conversion: row.tiempo_conversion ?? null,
      fecha_nacimiento: row.fecha_nacimiento ?? null,
      edad: row.edad ?? null,
      nombre_apoderado: row.nombre_apoderado ?? null,
      telefono_apoderado: row.telefono_apoderado ?? null,
    } as JovenMember;
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
  // Este provider envuelve toda /intranet, incluida la pantalla de login, donde
  // todavía no hay sesión. Los datos ahora vienen de /api (que exige sesión), así
  // que se espera a estar autenticado antes de pedirlos y se recarga al entrar.
  const { isAuthenticated } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Excluir personas retiradas
      const [personas, retirados] = await Promise.all([getPersonas(), getIdsRetirados()]);
      setMembers(
        personas.filter((p) => !retirados.has(Number(p.id))).map(mapToMember),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los miembros.');
    }
    setIsLoading(false);
  }, []);

  const addMember = useCallback(async (data: NuevoMiembro) => {
    const res = await fetch('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberToRow(data)),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Error al crear el miembro.' }));
      throw new Error(error ?? 'Error al crear el miembro.');
    }
    await refreshMembers();
  }, [refreshMembers]);

  // Convierte un visitante en miembro conservando su historial de asistencias.
  // Usa el mismo mapeo que addMember: la diferencia está en el endpoint, que
  // además re-apunta las asistencias y borra el registro de visitante.
  const convertirVisitante = useCallback(async (visitanteId: number, data: NuevoMiembro) => {
    const res = await fetch(`/api/miembros-nuevos/${visitanteId}/convertir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberToRow(data)),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Error al convertir el visitante.' }));
      throw new Error(error ?? 'Error al convertir el visitante.');
    }
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

    const res = await fetch(`/api/personas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Error al actualizar.' }));
      throw new Error(error ?? 'Error al actualizar.');
    }
    await refreshMembers();
  }, [refreshMembers]);

  const deleteMember = useCallback(async (id: string, pastorPassword?: string) => {
    const res = await fetch(`/api/personas/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pastorPassword ?? '' }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Error al eliminar.' }));
      throw new Error(error ?? 'Error al eliminar.');
    }
    await refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    // Al cerrar sesión se descarta la lista para no dejar datos personales
    // en memoria del cliente.
    if (!isAuthenticated) {
      setMembers([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    refreshMembers();
  }, [isAuthenticated, refreshMembers]);

  return (
    <MembersContext.Provider value={{ members, isLoading, error, refreshMembers, addMember, updateMember, deleteMember, convertirVisitante }}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  const ctx = useContext(MembersContext);
  if (!ctx) throw new Error('useMembers debe usarse dentro de MembersProvider');
  return ctx;
}