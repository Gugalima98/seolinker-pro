interface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  monthlyPrice: number;
  isPopular?: boolean;
  buttonText: string;
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
  },
];