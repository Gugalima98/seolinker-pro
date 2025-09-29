import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CreditCard } from 'lucide-react';

export const PaymentWall = () => {
  const { isCardRequired, isVerifying } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSetupCard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-setup-session');
      if (error) throw error;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({ title: "Erro ao iniciar configuração do cartão", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  // Renderiza o popup de bloqueio apenas se o cartão for obrigatório
  if (!isCardRequired) {
    return null;
  }

  return (
    <Dialog open={true}>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()} // Impede de fechar ao clicar fora
      >
        {isVerifying ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">Finalizando configuração...</h2>
            <p className="text-muted-foreground text-center">Aguarde um momento, estamos verificando seu método de pagamento.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Bem-vindo à nova 8links!</DialogTitle>
              <DialogDescription className="text-center pt-2">
                Para continuar e aproveitar ao máximo a plataforma, precisamos que você cadastre um método de pagamento.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Fique tranquilo, nada será cobrado agora. A cobrança ocorrerá apenas no dia do vencimento do seu plano.
              </p>
            </div>
            <div className="flex justify-center">
              <Button 
                onClick={handleSetupCard} 
                disabled={loading} 
                size="lg"
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Adicionar Cartão de Crédito
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
