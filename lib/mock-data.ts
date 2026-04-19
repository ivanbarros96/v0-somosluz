import { Member } from './types';

// Datos mock de miembros
export const initialMembers: Member[] = [
  {
    id: '1',
    firstName: 'Maria',
    lastName: 'Gonzalez',
    email: 'maria.gonzalez@email.com',
    phone: '+56 9 1234 5678',
    registrationDate: '2024-01-15',
    status: 'active',
    ministry: 'Alabanza',
    notes: 'Lider del equipo de alabanza'
  },
  {
    id: '2',
    firstName: 'Carlos',
    lastName: 'Rodriguez',
    email: 'carlos.rodriguez@email.com',
    phone: '+56 9 2345 6789',
    registrationDate: '2024-03-20',
    status: 'active',
    ministry: 'Jovenes',
    notes: ''
  },
  {
    id: '3',
    firstName: 'Ana',
    lastName: 'Martinez',
    email: 'ana.martinez@email.com',
    phone: '+56 9 3456 7890',
    registrationDate: '2024-06-10',
    status: 'active',
    ministry: 'Ninos',
    notes: 'Maestra de escuela dominical'
  },
  {
    id: '4',
    firstName: 'Pedro',
    lastName: 'Sanchez',
    email: 'pedro.sanchez@email.com',
    phone: '+56 9 4567 8901',
    registrationDate: '2025-01-05',
    status: 'inactive',
    ministry: 'Multimedia',
    notes: 'Viajo temporalmente'
  },
  {
    id: '5',
    firstName: 'Laura',
    lastName: 'Fernandez',
    email: 'laura.fernandez@email.com',
    phone: '+56 9 5678 9012',
    registrationDate: '2025-08-22',
    status: 'active',
    ministry: 'Intercesion',
    notes: 'Nueva integrante'
  }
];

// Credenciales hardcodeadas
export const CREDENTIALS = {
  admin: {
    username: 'ADMIN',
    password: 'SOMOSLUZ',
    role: 'admin' as const,
    name: 'Administrador'
  },
  user: {
    username: 'somosluz',
    password: 'somosluz',
    role: 'user' as const,
    name: 'Usuario Somos Luz'
  }
};
