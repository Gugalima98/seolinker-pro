export interface Notification {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  read: boolean;
  timestamp: string;
  userId?: number;
}

export const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'success',
    message: 'Seu backlink para meublogdenichox.com foi publicado com sucesso!',
    read: false,
    timestamp: '2024-09-15T14:30:00Z',
    userId: 1
  },
  {
    id: 2,
    type: 'info',
    message: 'Novo site adicionado à rede: expertsdeseo.com (DA: 45)',
    read: false,
    timestamp: '2024-09-15T10:15:00Z'
  },
  {
    id: 3,
    type: 'warning',
    message: 'Seu backlink está aguardando aprovação há 3 dias',
    read: true,
    timestamp: '2024-09-14T18:00:00Z',
    userId: 1
  },
  {
    id: 4,
    type: 'success',
    message: 'Parabéns! Você subiu 2 posições no ranking mensal',
    read: true,
    timestamp: '2024-09-13T12:00:00Z',
    userId: 1
  }
];