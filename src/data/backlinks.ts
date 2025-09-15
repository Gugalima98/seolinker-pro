export interface Backlink {
  id: number;
  clientSiteUrl: string;
  targetUrl: string;
  anchorText: string;
  networkSiteUrl: string;
  status: 'Publicado' | 'Criando Conteúdo' | 'Aguardando Aprovação';
  creationDate: string;
  publishDate?: string;
  metrics?: {
    da: number;
    traffic?: number;
  };
}

export const mockBacklinks: Backlink[] = [
  {
    id: 101,
    clientSiteUrl: 'meublogdenichox.com',
    targetUrl: '/melhores-ferramentas-seo',
    anchorText: 'melhores ferramentas de SEO',
    networkSiteUrl: 'expertsdeseo.com',
    status: 'Publicado',
    creationDate: '2024-09-10',
    publishDate: '2024-09-15',
    metrics: { da: 45, traffic: 1200 }
  },
  {
    id: 102,
    clientSiteUrl: 'financaspessoais.blog',
    targetUrl: '/investimentos-para-iniciantes',
    anchorText: 'guia completo de investimentos',
    networkSiteUrl: 'investimentosfaceis.net',
    status: 'Criando Conteúdo',
    creationDate: '2024-09-12',
    metrics: { da: 38 }
  },
  {
    id: 103,
    clientSiteUrl: 'meublogdenichox.com',
    targetUrl: '/marketing-digital-iniciantes',
    anchorText: 'marketing digital para iniciantes',
    networkSiteUrl: 'marketingpro.com.br',
    status: 'Aguardando Aprovação',
    creationDate: '2024-09-13',
    metrics: { da: 52 }
  },
  {
    id: 104,
    clientSiteUrl: 'lojanicho.com.br',
    targetUrl: '/categoria/roupas-fitness',
    anchorText: 'roupas de academia',
    networkSiteUrl: 'fitnesslife.blog',
    status: 'Publicado',
    creationDate: '2024-09-05',
    publishDate: '2024-09-08',
    metrics: { da: 34, traffic: 800 }
  }
];