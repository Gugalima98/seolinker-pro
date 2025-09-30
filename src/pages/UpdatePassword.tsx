import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const { loading, updateUserPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // This page should only be accessible when the user is in a recovery session.
  // We can check for the user object which is populated on PASSWORD_RECOVERY event.
  useEffect(() => {
    if (!user) {
      // Optional: Redirect if not in a recovery session, though Supabase protects the update.
      // navigate('/login');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        toast({ title: "Erro", description: "A senha precisa ter no mínimo 6 caracteres.", variant: "destructive" });
        return;
    }

    const { error } = await updateUserPassword(password);
    
    if (error) {
      toast({ title: "Erro ao atualizar senha", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Senha atualizada com sucesso!",
        description: "Você já pode fazer o login com sua nova senha.",
      });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-elegant border-0 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Crie sua Nova Senha</CardTitle>
            <CardDescription>
              Digite uma nova senha para sua conta.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Nova Senha'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default UpdatePassword;
