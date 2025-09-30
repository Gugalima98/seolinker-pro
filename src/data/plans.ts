interface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  monthlyPrice: number;
  isPopular?: boolean;
  buttonText: string;
  siteLimit: number;
}

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Ideal para quem está começando, com direito a 1 site.',
    features: [
      '1 site cadastrado',
      'Backlinks ilimitados',
      'Acesso a sites de nicho',
      'Suporte por email',
      'Relatórios básicos',
    ],
    monthlyPrice: 97,
    buttonText: 'Escolher Starter',
    siteLimit: 1,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Solução para profissionais, com direito a 5 sites.',
    features: [
      '5 sites cadastrados',
      'Backlinks ilimitados',
      'Acesso a sites de nicho e premium',
      'Suporte prioritário',
      'Relatórios avançados',
    ],
    monthlyPrice: 197,
    isPopular: true,
    buttonText: 'Escolher Pro',
    siteLimit: 5,
  },
  {
    id: 'agency',
    name: 'Agência',
    description: 'Escalabilidade para agências, com direito a 10 sites.',
    features: [
      '10 sites cadastrados',
      'Backlinks ilimitados',
      'Acesso a todos os tipos de sites',
      'Suporte dedicado',
      'Relatórios completos e personalizados',
      'API de integração',
    ],
    monthlyPrice: 397,
    buttonText: 'Escolher Agência',
    siteLimit: 10,
  },
  {
    id: 'legacy',
    name: 'Legacy',
    description: 'Plano exclusivo para membros antigos. Reative para continuar.',
    features: [
      'Sites ilimitados',
      'Backlinks ilimitados',
      'Acesso a sites de nicho',
      'Suporte por email',
      'Relatórios básicos',
    ],
    monthlyPrice: 97,
    buttonText: 'Reativar Legacy',
    siteLimit: Infinity,
  },
];