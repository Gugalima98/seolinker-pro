export interface NetworkSite {
  id: number;
  url: string;
  niche: string;
  metrics: {
    da: number;
    traffic: number;
    price: number;
  };
  features: string[];
  available: boolean;
}

export const mockNetworkSites: NetworkSite[] = [
  {
    id: 1,
    url: 'expertsdeseo.com',
    niche: 'Marketing Digital',
    metrics: { da: 45, traffic: 15000, price: 150 },
    features: ['Artigo Completo', 'Link DoFollow', 'Publicação Rápida'],
    available: true
  },
  {
    id: 2,
    url: 'investimentosfaceis.net',
    niche: 'Finanças',
    metrics: { da: 38, traffic: 8500, price: 120 },
    features: ['Guest Post', 'Link DoFollow', 'Nicho Relevante'],
    available: true
  },
  {
    id: 3,
    url: 'marketingpro.com.br',
    niche: 'Marketing Digital',
    metrics: { da: 52, traffic: 22000, price: 200 },
    features: ['Artigo Premium', 'Link DoFollow', 'Alto DA'],
    available: true
  },
  {
    id: 4,
    url: 'fitnesslife.blog',
    niche: 'Saúde e Fitness',
    metrics: { da: 34, traffic: 12000, price: 100 },
    features: ['Conteúdo Visual', 'Link DoFollow', 'Engajamento Alto'],
    available: false
  },
  {
    id: 5,
    url: 'techreviews.net',
    niche: 'Tecnologia',
    metrics: { da: 48, traffic: 18000, price: 175 },
    features: ['Review Técnico', 'Link DoFollow', 'Autoridade'],
    available: true
  },
  {
    id: 6,
    url: 'lifestyle.magazine',
    niche: 'Lifestyle',
    metrics: { da: 41, traffic: 14000, price: 140 },
    features: ['Artigo Lifestyle', 'Link DoFollow', 'Público Feminino'],
    available: true
  }
];