'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Member } from './types';
import { initialMembers } from './mock-data';

interface MembersContextType {
  members: Member[];
  addMember: (member: Omit<Member, 'id'>) => void;
  updateMember: (id: string, data: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  getMemberById: (id: string) => Member | undefined;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

const MEMBERS_STORAGE_KEY = 'somos_luz_members';

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    // Cargar miembros desde localStorage o usar datos iniciales
    const stored = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (stored) {
      try {
        setMembers(JSON.parse(stored));
      } catch {
        setMembers(initialMembers);
        localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(initialMembers));
      }
    } else {
      setMembers(initialMembers);
      localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(initialMembers));
    }
  }, []);

  const saveToStorage = (newMembers: Member[]) => {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(newMembers));
  };

  const addMember = (memberData: Omit<Member, 'id'>) => {
    const newMember: Member = {
      ...memberData,
      id: Date.now().toString()
    };
    const newMembers = [...members, newMember];
    setMembers(newMembers);
    saveToStorage(newMembers);
  };

  const updateMember = (id: string, data: Partial<Member>) => {
    const newMembers = members.map(m => 
      m.id === id ? { ...m, ...data } : m
    );
    setMembers(newMembers);
    saveToStorage(newMembers);
  };

  const deleteMember = (id: string) => {
    const newMembers = members.filter(m => m.id !== id);
    setMembers(newMembers);
    saveToStorage(newMembers);
  };

  const getMemberById = (id: string) => {
    return members.find(m => m.id === id);
  };

  return (
    <MembersContext.Provider value={{ members, addMember, updateMember, deleteMember, getMemberById }}>
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
