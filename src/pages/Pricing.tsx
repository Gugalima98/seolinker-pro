import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { plans } from '@/data/plans';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, X, Terminal } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from '@/hooks/use-toast';

const Pricing = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const isSubscriptionInactive = 
    user && 
    user.subscription_status && 
    !['active', 'trialing'].includes(user.subscription_status);

  const displayedPlans = useMemo(() => {
    const isLegacyUserWithInactivePlan = isSubscriptionInactive && user?.plan_id === 'legacy';

    if (isLegacyUserWithInactivePlan) {
      return plans; // Mostra todos os planos, incluindo o Legacy
    }
    // Para todos os outros usuários, esconde o plano Legacy
    return plans.filter(plan => plan.id !== 'legacy');
  }, [user, isSubscriptionInactive]);

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planId },
      });

      console.log("Resposta recebida da função 'create-checkout-session':", data);

      if (error) {
        console.error('Error creating checkout session:', error);
        const description = error.message || "Ocorreu um erro desconhecido. Verifique os logs da função no painel do Supabase.";
        toast({ title: "Erro ao criar sessão de pagamento", description: description, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!data || !data.sessionId) {
        throw new Error("A resposta do servidor não incluiu um ID de sessão do Stripe.");
      }

      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        toast({
          title: "Erro de Configuração do Frontend",
          description: "A chave VITE_STRIPE_PUBLISHABLE_KEY não foi encontrada. Verifique seu arquivo .env.",
          variant: "destructive",
        });
        return;
      }

      const stripe = await loadStripe(publishableKey);
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      }

    } catch (e: any) {
      console.error('Unexpected error:', e);
      let description = "Ocorreu um erro ao tentar redirecionar para o Stripe.";
      if (e && e.message) {
        description = e.message;
      } else if (String(e).includes('ERR_NAME_NOT_RESOLVED')) {
        description = "Não foi possível conectar ao Stripe. Verifique sua conexão com a internet, DNS ou desative bloqueadores de anúncio e tente novamente.";
      }
      toast({ title: "Ocorreu um erro inesperado", description: description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-8 animate-fade-in">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">Escolha o Plano Ideal para Você</h1>
        <p className="text-lg text-muted-foreground">
          Encontre a solução perfeita para suas necessidades de backlinks.
        </p>
        
        {isSubscriptionInactive && (
          <Alert variant="destructive" className="mt-6 text-left">
            <AlertTitle>Plano Expirado ou Inativo</AlertTitle>
            <AlertDescription>
              Seu plano atual não está ativo. Por favor, escolha um novo plano para reativar seu acesso completo à plataforma.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`flex flex-col ${plan.isPopular ? 'border-primary shadow-lg' : ''}`}
          >
            <CardHeader className="text-center pb-4">
              {plan.isPopular && (
                <Badge variant="default" className="mb-2 w-fit mx-auto bg-gradient-to-r from-primary to-primary-hover">
                  Mais Popular
                </Badge>
              )}
              <CardTitle className="text-3xl font-bold">{plan.name}</CardTitle>
              <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="text-center mb-6">
                <span className="text-5xl font-extrabold">
                  R${plan.monthlyPrice}
                </span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow"
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading}
              >
                {loading ? 'Processando...' : plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Pricing;