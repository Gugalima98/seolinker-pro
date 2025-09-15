import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Copy,
  Share,
  Eye,
  MousePointer,
  Award,
  Calendar,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Affiliate = () => {
  const { toast } = useToast();
  const [affiliateCode] = useState('SEO2024PROF');
  const [stats, setStats] = useState({
    totalClicks: 0,
    conversions: 0,
    earnings: 0,
    pendingEarnings: 0
  });

  // Simulate animated counters
  useEffect(() => {
    const targetStats = {
      totalClicks: 1247,
      conversions: 23,
      earnings: 2890,
      pendingEarnings: 450
    };

    const animateCount = (target: number, setter: (value: number) => void) => {
      let current = 0;
      const increment = target / 50;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(current));
        }
      }, 30);
    };

    setTimeout(() => animateCount(targetStats.totalClicks, (val) => setStats(prev => ({ ...prev, totalClicks: val }))), 200);
    setTimeout(() => animateCount(targetStats.conversions, (val) => setStats(prev => ({ ...prev, conversions: val }))), 400);
    setTimeout(() => animateCount(targetStats.earnings, (val) => setStats(prev => ({ ...prev, earnings: val }))), 600);
    setTimeout(() => animateCount(targetStats.pendingEarnings, (val) => setStats(prev => ({ ...prev, pendingEarnings: val }))), 800);
  }, []);

  const affiliateLink = `https://seobacklinks.com/ref/${affiliateCode}`;
  const conversionRate = stats.totalClicks > 0 ? ((stats.conversions / stats.totalClicks) * 100).toFixed(2) : '0.00';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência.",
    });
  };

  const recentReferrals = [
    { id: 1, email: 'user1@email.com', date: '2024-09-14', status: 'Convertido', commission: 125 },
    { id: 2, email: 'user2@email.com', date: '2024-09-13', status: 'Pendente', commission: 125 },
    { id: 3, email: 'user3@email.com', date: '2024-09-12', status: 'Convertido', commission: 125 },
    { id: 4, email: 'user4@email.com', date: '2024-09-10', status: 'Convertido', commission: 125 },
  ];

  const monthlyData = [
    { month: 'Maio', clicks: 890, conversions: 18, earnings: 2250 },
    { month: 'Junho', clicks: 1050, conversions: 21, earnings: 2625 },
    { month: 'Julho', clicks: 1180, conversions: 25, earnings: 3125 },
    { month: 'Agosto', clicks: 1320, conversions: 28, earnings: 3500 },
    { month: 'Setembro', clicks: 1247, conversions: 23, earnings: 2890 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">Programa de Afiliados</h1>
        <p className="text-muted-foreground text-lg">
          Ganhe 50% de comissão por cada cliente que você trouxer
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cliques</CardTitle>
            <MousePointer className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{stats.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              No seu link de afiliado
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success animate-count-up">{stats.conversions}</div>
            <p className="text-xs text-muted-foreground">
              Taxa: {conversionRate}%
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">R$ {stats.earnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Comissões recebidas
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Pendentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning animate-count-up">R$ {stats.pendingEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              A ser pago em 7 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate Link Section */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary-hover/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share className="w-5 h-5 text-primary" />
            <span>Seu Link de Afiliado</span>
          </CardTitle>
          <CardDescription>
            Compartilhe este link para ganhar 50% de comissão em cada venda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input 
              value={affiliateLink} 
              readOnly 
              className="flex-1"
            />
            <Button 
              onClick={() => copyToClipboard(affiliateLink)}
              className="bg-gradient-to-r from-primary to-primary-hover"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg">
              <Award className="w-8 h-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold">50% Comissão</h4>
              <p className="text-sm text-muted-foreground">Por cada venda</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <Calendar className="w-8 h-8 text-success mx-auto mb-2" />
              <h4 className="font-semibold">Pagamento em 30 dias</h4>
              <p className="text-sm text-muted-foreground">Após a venda</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <BarChart3 className="w-8 h-8 text-warning mx-auto mb-2" />
              <h4 className="font-semibold">Acompanhamento Real</h4>
              <p className="text-sm text-muted-foreground">Analytics detalhado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="referrals">Indicações</TabsTrigger>
          <TabsTrigger value="materials">Materiais</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Mensal</CardTitle>
                <CardDescription>
                  Acompanhe seu desempenho nos últimos 5 meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyData.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{month.month}</h4>
                        <p className="text-sm text-muted-foreground">
                          {month.clicks} cliques • {month.conversions} conversões
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">R$ {month.earnings.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {((month.conversions / month.clicks) * 100).toFixed(1)}% taxa
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Commission Tiers */}
            <Card>
              <CardHeader>
                <CardTitle>Níveis de Comissão</CardTitle>
                <CardDescription>
                  Ganhe mais conforme suas vendas aumentam
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-primary">Nível Atual: Pro</h4>
                      <Badge className="bg-primary text-white">50%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      1-50 vendas por mês
                    </p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      23/50 vendas para o próximo nível
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg opacity-75">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Expert</h4>
                      <Badge variant="outline">60%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      51-100 vendas por mês
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg opacity-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Master</h4>
                      <Badge variant="outline">70%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      100+ vendas por mês
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Referrals */}
        <TabsContent value="referrals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Indicações Recentes</CardTitle>
              <CardDescription>
                Suas últimas indicações e status de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReferrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{referral.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Indicado em {new Date(referral.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge 
                        variant={referral.status === 'Convertido' ? 'default' : 'secondary'}
                        className={referral.status === 'Convertido' ? 'status-published' : 'status-pending'}
                      >
                        {referral.status}
                      </Badge>
                      <p className="text-sm font-bold">R$ {referral.commission}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Materials */}
        <TabsContent value="materials" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Banners Promocionais</CardTitle>
                <CardDescription>
                  Banners prontos para suas campanhas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="bg-gradient-to-r from-primary to-primary-hover h-24 rounded-lg mb-3 flex items-center justify-center">
                    <p className="text-white font-bold">Banner 728x90</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Código
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="bg-gradient-to-r from-primary to-primary-hover h-32 w-32 rounded-lg mb-3 flex items-center justify-center mx-auto">
                    <p className="text-white font-bold text-center">Banner<br/>300x250</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Código
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Textos Promocionais</CardTitle>
                <CardDescription>
                  Textos prontos para suas redes sociais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Post Instagram/Facebook</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    "🚀 Revolucione seu SEO com backlinks de qualidade! A plataforma que está transformando..."
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Texto
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Email Marketing</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    "Olá! Descobri uma plataforma incrível para criar backlinks de qualidade..."
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Texto
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Affiliate;