export interface ClientSite {
  id: number;
  userId: number;
  url: string;
  niche: string;
  type: 'Blog de Afiliado' | 'E-commerce' | 'Institucional' | 'Notícias';
  metrics: {
    da: number;
    backlinks: number;
    refDomains: number;
    organicKeywords: number;
  };
  rankingPages: {
    page: string;
    keyword: string;
    position: number;
  }[];
  addedDate: string;
  status: 'active' | 'pending' | 'suspended';
}

export const mockClientSites: ClientSite[] = [
  {
    id: 1,
    userId: 1,
    url: 'meublogdenichox.com',
    niche: 'Marketing Digital',
    type: 'Blog de Afiliado',
    metrics: { da: 35, backlinks: 1200, refDomains: 150, organicKeywords: 850 },
    rankingPages: [
      { page: '/melhores-ferramentas-seo', keyword: 'ferramentas de seo', position: 3 },
      { page: '/como-ganhar-dinheiro-online', keyword: 'ganhar dinheiro online', position: 5 },
      { page: '/marketing-digital-iniciantes', keyword: 'marketing digital', position: 8 }
    ],
    addedDate: '2024-01-20',
    status: 'active'
  },
  {
    id: 2,
    userId: 1,
    url: 'lojanicho.com.br',
    niche: 'E-commerce',
    type: 'E-commerce',
    metrics: { da: 28, backlinks: 450, refDomains: 80, organicKeywords: 320 },
    rankingPages: [
      { page: '/produtos/tenis-esportivo', keyword: 'tênis esportivo', position: 12 },
      { page: '/categoria/roupas-fitness', keyword: 'roupas fitness', position: 7 }
    ],
    addedDate: '2024-02-15',
    status: 'active'
  },
  {
    id: 3,
    userId: 3,
    url: 'financaspessoais.blog',
    niche: 'Finanças',
    type: 'Blog de Afiliado',
    metrics: { da: 42, backlinks: 2100, refDomains: 220, organicKeywords: 1200 },
    rankingPages: [
      { page: '/investimentos-para-iniciantes', keyword: 'investimentos iniciantes', position: 2 },
      { page: '/como-economizar-dinheiro', keyword: 'economizar dinheiro', position: 4 },
      { page: '/cartao-de-credito-sem-anuidade', keyword: 'cartão sem anuidade', position: 6 }
    ],
    addedDate: '2024-02-25',
    status: 'active'
  }
];