import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
  MousePointer,
  Award,
  Calendar,
  BarChart3,
  Banknote, // Ícone para pagamentos
  Loader2 // Ícone de carregamento
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Affiliate = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [affiliate, setAffiliate] = useState<any>(null);
  const [stats, setStats] = useState({ // Manteremos stats para dados futuros
    totalClicks: 0,
    conversions: 0,
    earnings: 0,
    pendingEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;

    const initializeAffiliate = async () => {
      setLoading(true);
      try {
        // Garante que o usuário se torne um afiliado e/ou busca os dados
        const { data: affiliateData, error: affiliateError } = await supabase.functions.invoke('become-affiliate');
        if (affiliateError) throw affiliateError;
        setAffiliate(affiliateData);

        // Busca as estatísticas reais do afiliado
        const { data: statsData, error: statsError } = await supabase.functions.invoke('get-affiliate-stats');
        if (statsError) throw statsError;
        
        setStats(statsData);

      } catch (error: any) {
        console.error("Erro ao carregar dados do afiliado:", error);
        toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    initializeAffiliate();
  }, [user, toast]);

  const affiliateLink = affiliate ? `${window.location.origin}/ref/${affiliate.affiliate_code}` : '';
  const conversionRate = stats.totalClicks > 0 ? ((stats.conversions / stats.totalClicks) * 100).toFixed(2) : '0.00';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência.",
    });
  };

  const handleOnboarding = async () => {
    setIsOnboarding(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account');
      if (error) throw error;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Erro durante o onboarding no Stripe:", error);
      toast({ title: "Erro ao iniciar cadastro de pagamentos", description: error.message, variant: "destructive" });
    } finally {
      setIsOnboarding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Não foi possível carregar seus dados de afiliado.</p>
        <p className="text-muted-foreground">Por favor, recarregue a página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">Programa de Afiliados</h1>
        <p className="text-muted-foreground text-lg">
          Ganhe {affiliate.commission_rate * 100}% de comissão por cada cliente que você trouxer
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Os cards de estatísticas serão preenchidos com dados reais na Fase 3 */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cliques</CardTitle>
            <MousePointer className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.conversions}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.earnings.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Pendentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">R$ {stats.pendingEarnings.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Onboarding Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center"><Banknote className="mr-2"/> Receba seus Pagamentos</CardTitle>
          <CardDescription>
            {affiliate.stripe_connect_account_id 
              ? "Sua conta de pagamentos está configurada. Você pode atualizar seus dados a qualquer momento."
              : "Para receber suas comissões, você precisa configurar uma conta de pagamentos com nosso parceiro Stripe."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleOnboarding} disabled={isOnboarding}>
            {isOnboarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {affiliate.stripe_connect_account_id ? "Atualizar Dados de Pagamento" : "Configurar Pagamentos"}
          </Button>
        </CardContent>
      </Card>

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
              <h4 className="font-semibold">{affiliate.commission_rate * 100}% Comissão</h4>
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
          <p className="text-center text-muted-foreground">Mais estatísticas detalhadas serão adicionadas em breve.</p>
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
                {stats.recentReferrals && stats.recentReferrals.length > 0 ? (
                  stats.recentReferrals.map((referral: any) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{referral.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Indicado em {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge 
                          variant={referral.status === 'converted' ? 'default' : 'secondary'}
                          className={referral.status === 'converted' ? 'bg-success text-success-foreground' : ''}
                        >
                          {referral.status}
                        </Badge>
                        <p className="text-sm font-bold">R$ {referral.commission_amount || 0}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center">Nenhuma indicação recente.</p>
                )}
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