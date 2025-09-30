export interface User {
  id: string; // Changed from number to string to match Supabase UUID
  email: string;
  password?: string; // Made optional as it's not fetched
  role: 'client' | 'admin';
  name: string;
  avatar?: string;
  backlinkCount?: number;
  joinDate: string;
}

export const mockUsers: User[] = [
  {
    id: 1,
    email: 'cliente@email.com',
    password: '123',
    role: 'client',
    name: 'João Silva',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    backlinkCount: 47,
    joinDate: '2024-01-15'
  },
  {
    id: 2,
    email: 'admin@email.com',
    password: 'admin',
    role: 'admin',
    name: 'Admin Master',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    joinDate: '2023-01-01'
  },
  {
    id: 3,
    email: 'maria@email.com',
    password: '123',
    role: 'client',
    name: 'Maria Santos',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b613b9b0?w=150&h=150&fit=crop&crop=face',
    backlinkCount: 62,
    joinDate: '2024-02-20'
  },
  {
    id: 4,
    email: 'carlos@email.com',
    password: '123',
    role: 'client',
    name: 'Carlos Oliveira',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    backlinkCount: 31,
    joinDate: '2024-03-10'
  }
];