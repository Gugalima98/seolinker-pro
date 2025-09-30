export interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: 'Aberto' | 'Em Andamento' | 'Resolvido' | 'Fechado';
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  category: 'Técnico' | 'Billing' | 'Geral' | 'Bug Report';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: number;
  author: 'user' | 'support';
  authorName: string;
  message: string;
  timestamp: string;
  attachments?: string[];
}

export const mockTickets: Ticket[] = [
  {
    id: 1,
    subject: 'Problema com criação de backlink',
    description: 'Não consigo criar um backlink para meu site. O sistema apresenta erro após selecionar o site da rede.',
    status: 'Em Andamento',
    priority: 'Alta',
    category: 'Técnico',
    createdAt: '2024-09-13T10:30:00Z',
    updatedAt: '2024-09-14T15:45:00Z',
    messages: [
      {
        id: 1,
        author: 'user',
        authorName: 'João Silva',
        message: 'Olá, estou com problemas para criar backlinks. Quando seleciono um site da rede, aparece um erro e o processo não continua.',
        timestamp: '2024-09-13T10:30:00Z'
      },
      {
        id: 2,
        author: 'support',
        authorName: 'Carlos - Suporte',
        message: 'Olá João! Obrigado por entrar em contato. Estou investigando o problema que você relatou. Pode me informar qual navegador você está usando?',
        timestamp: '2024-09-13T14:20:00Z'
      },
      {
        id: 3,
        author: 'user',
        authorName: 'João Silva',
        message: 'Estou usando Chrome versão 118. O erro acontece sempre que clico em "Escolher Este Site".',
        timestamp: '2024-09-13T16:45:00Z'
      },
      {
        id: 4,
        author: 'support',
        authorName: 'Carlos - Suporte',
        message: 'Identificamos o problema e já aplicamos uma correção. Pode tentar novamente? O processo deve funcionar normalmente agora.',
        timestamp: '2024-09-14T15:45:00Z'
      }
    ]
  },
  {
    id: 2,
    subject: 'Dúvida sobre faturamento',
    description: 'Gostaria de entender melhor como funciona a cobrança dos backlinks criados.',
    status: 'Resolvido',
    priority: 'Baixa',
    category: 'Billing',
    createdAt: '2024-09-10T09:15:00Z',
    updatedAt: '2024-09-11T11:30:00Z',
    messages: [
      {
        id: 5,
        author: 'user',
        authorName: 'João Silva',
        message: 'Olá, gostaria de entender melhor como funciona a cobrança. Sou cobrado por backlink criado ou é um valor mensal fixo?',
        timestamp: '2024-09-10T09:15:00Z'
      },
      {
        id: 6,
        author: 'support',
        authorName: 'Ana - Billing',
        message: 'Olá! Nossa cobrança é feita por backlink criado. Cada backlink tem um preço que varia conforme o DA e qualidade do site da rede escolhido. Você pode ver os preços na hora de escolher o site.',
        timestamp: '2024-09-11T11:30:00Z'
      }
    ]
  },
  {
    id: 3,
    subject: 'Sugestão de melhoria',
    description: 'Seria interessante ter um filtro por nicho na seleção de sites da rede.',
    status: 'Aberto',
    priority: 'Média',
    category: 'Geral',
    createdAt: '2024-09-15T14:20:00Z',
    updatedAt: '2024-09-15T14:20:00Z',
    messages: [
      {
        id: 7,
        author: 'user',
        authorName: 'João Silva',
        message: 'Seria muito útil ter um filtro por nicho quando estamos escolhendo os sites da rede para criar backlinks. Isso facilitaria muito o processo!',
        timestamp: '2024-09-15T14:20:00Z'
      }
    ]
  }
];