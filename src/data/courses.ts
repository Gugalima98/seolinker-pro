export interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  thumbnail: string;
  modules: Module[];
  progress: number;
  enrolled: boolean;
  category: string;
}

export interface Module {
  id: number;
  title: string;
  lessons: Lesson[];
  completed: boolean;
}

export interface Lesson {
  id: number;
  title: string;
  duration: string;
  type: 'video' | 'text' | 'quiz';
  videoUrl?: string;
  completed: boolean;
}

export const mockCourses: Course[] = [
  {
    id: 1,
    title: 'SEO Avançado: Link Building Profissional',
    description: 'Aprenda as estratégias mais avançadas de link building para dominar os rankings do Google.',
    instructor: 'João Silva',
    duration: '8h 30min',
    level: 'Avançado',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop',
    progress: 35,
    enrolled: true,
    category: 'SEO',
    modules: [
      {
        id: 1,
        title: 'Fundamentos do Link Building',
        completed: true,
        lessons: [
          { id: 1, title: 'O que são backlinks e por que importam', duration: '15min', type: 'video', completed: true },
          { id: 2, title: 'Tipos de backlinks', duration: '12min', type: 'video', completed: true },
          { id: 3, title: 'Quiz: Fundamentos', duration: '5min', type: 'quiz', completed: true }
        ]
      },
      {
        id: 2,
        title: 'Estratégias Avançadas',
        completed: false,
        lessons: [
          { id: 4, title: 'Guest posting profissional', duration: '20min', type: 'video', completed: true },
          { id: 5, title: 'Link building escalável', duration: '25min', type: 'video', completed: false },
          { id: 6, title: 'Técnicas de outreach', duration: '18min', type: 'video', completed: false }
        ]
      }
    ]
  },
  {
    id: 2,
    title: 'Marketing de Afiliados: Do Zero ao Pro',
    description: 'Domine o marketing de afiliados e crie uma fonte de renda passiva consistente.',
    instructor: 'Maria Santos',
    duration: '12h 15min',
    level: 'Intermediário',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop',
    progress: 0,
    enrolled: false,
    category: 'Marketing',
    modules: [
      {
        id: 3,
        title: 'Introdução ao Marketing de Afiliados',
        completed: false,
        lessons: [
          { id: 7, title: 'O que é marketing de afiliados', duration: '10min', type: 'video', completed: false },
          { id: 8, title: 'Escolhendo seu nicho', duration: '15min', type: 'video', completed: false }
        ]
      }
    ]
  },
  {
    id: 3,
    title: 'WordPress para SEO: Otimização Completa',
    description: 'Configure seu WordPress para máxima performance em SEO e conversões.',
    instructor: 'Carlos Oliveira',
    duration: '6h 45min',
    level: 'Iniciante',
    thumbnail: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300&h=200&fit=crop',
    progress: 100,
    enrolled: true,
    category: 'WordPress',
    modules: [
      {
        id: 4,
        title: 'Configuração Inicial',
        completed: true,
        lessons: [
          { id: 9, title: 'Instalação e configuração', duration: '20min', type: 'video', completed: true },
          { id: 10, title: 'Plugins essenciais para SEO', duration: '25min', type: 'video', completed: true }
        ]
      }
    ]
  }
];