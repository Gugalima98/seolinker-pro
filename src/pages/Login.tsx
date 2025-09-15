import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get the intended destination from location state
  const from = location.state?.from || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(email, password);
    
    if (success) {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta à plataforma.",
      });
      navigate(from, { replace: true });
    } else {
      toast({
        title: "Erro no login",
        description: "Email ou senha inválidos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-hover rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-glow">
            <ArrowRight className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">SEO Backlinks</h1>
          <p className="text-muted-foreground mt-2">Gerencie seus backlinks com inteligência</p>
        </div>

        <Card className="shadow-elegant border-0 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar a plataforma
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
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

            <CardFooter className="space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Conta de teste:</p>
                <p><strong>Cliente:</strong> cliente@email.com / 123</p>
                <p><strong>Admin:</strong> admin@email.com / admin</p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;