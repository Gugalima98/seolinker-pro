import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  CreditCard,
  Save,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState({
    name: user?.user_metadata.name || '',
    email: user?.email || '',
    avatar: user?.user_metadata.avatar_url || ''
  });

  const [password, setPassword] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [subscription, setSubscription] = useState<any>(null);
  const [loadingBilling, setLoadingBilling] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      try {
        setLoadingBilling(true);
        const { data, error } = await supabase.functions.invoke('get-user-subscription', {
          body: { userId: user.id },
        });

        if (error) {
          // It's okay if it's a 404, means no subscription
          if (error.context?.status !== 404) {
              throw error;
          }
        }
        setSubscription(data?.subscription || null);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar assinatura",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoadingBilling(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { dismiss } = toast({ title: "Enviando imagem...", description: "Aguarde um momento." });

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      dismiss();
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    const { error: updateUserError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl }
    });

    dismiss();

    if (updateUserError) {
      toast({ title: "Erro ao atualizar perfil", description: updateUserError.message, variant: "destructive" });
    } else {
      setProfile({ ...profile, avatar: publicUrl });
      toast({ title: "Foto de perfil atualizada!" });
      refreshUser(); // Refresh user context
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    try {
      const { dismiss } = toast({ title: "Redirecionando...", description: "Aguarde um momento." });
      
      const { data, error } = await supabase.functions.invoke('create-customer-portal', {
        body: { userId: user.id },
      });

      if (error) throw error;

      window.location.href = data.url;
      
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível redirecionar para o portal de faturamento. Tente novamente mais tarde.",
        variant: "destructive",
      });
      console.error("Error creating customer portal session:", error);
    }
  };

  const handleSaveAll = async () => {
    const updates: { password?: string; data?: { [key: string]: any }; email?: string } = {};
    let toastTitle = "";

    // --- Check for password change ---
    if (password.newPassword) {
      if (password.newPassword !== password.confirmPassword) {
        toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
        return;
      }
      if (password.newPassword.length < 6) {
        toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
        return;
      }
      updates.password = password.newPassword;
      toastTitle = "Perfil e Senha Atualizados";
    }

    // --- Check for profile data change ---
    if (profile.name !== (user?.user_metadata.name || '')) {
      updates.data = { ...updates.data, name: profile.name };
    }
    if (profile.email !== user?.email) {
        updates.email = profile.email;
    }

    if (updates.data || updates.email) {
        if (!toastTitle) toastTitle = "Perfil Atualizado";
    }

    // --- Exit if no changes ---
    if (Object.keys(updates).length === 0 && !password.newPassword) {
      toast({ title: "Nenhuma alteração detectada." });
      return;
    }

    // --- Call Supabase ---
    const { error } = await supabase.auth.updateUser(updates);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: toastTitle || "Configurações salvas!" });
      setPassword({ newPassword: '', confirmPassword: '' });
      refreshUser(); // Refresh user context
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais e senha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="bg-primary text-white text-2xl">
                    {profile.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Alterar Foto
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={password.newPassword}
                    onChange={(e) => setPassword({...password, newPassword: e.target.value})}
                    placeholder="Deixe em branco para não alterar"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={password.confirmPassword}
                    onChange={(e) => setPassword({...password, confirmPassword: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveAll} className="bg-gradient-to-r from-primary to-primary-hover">
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plano e Faturamento</CardTitle>
              <CardDescription>
                Gerencie sua assinatura e veja seu histórico de pagamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingBilling ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-10 w-48" />
                </div>
              ) : subscription ? (
                <div>
                  <div className="p-6 bg-gradient-to-r from-primary/10 to-primary-hover/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">Plano {subscription.items.data[0].price.nickname || 'Atual'}</h3>
                      <Badge className="bg-primary text-white capitalize">{subscription.status}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {/* Description could come from product metadata */}
                      Acesso completo à plataforma.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {subscription.status === 'trialing' ? 'Seu trial termina em' : 'Próximo pagamento em'}
                        </p>
                        <p className="font-medium">
                          {new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor</p>
                        <p className="font-medium">
                          {(subscription.items.data[0].price.unit_amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          {' / '}
                          {subscription.items.data[0].price.recurring.interval === 'month' ? 'mês' : 'ano'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6">
                    <Button onClick={handleManageSubscription}>
                      Gerenciar Assinatura
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 border-dashed border-2 rounded-lg">
                  <h3 className="text-lg font-medium">Você não tem uma assinatura ativa.</h3>
                  <p className="text-muted-foreground my-2">
                    Escolha um plano para aproveitar todos os benefícios da plataforma.
                  </p>
                  <Button onClick={() => window.location.href = '/pricing'}>Ver Planos</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;