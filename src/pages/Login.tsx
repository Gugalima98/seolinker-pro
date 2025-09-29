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
  const { login, loading, signInWithGoogle } = useAuth();
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

            <CardFooter className="space-y-4 flex flex-col">
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
              
              <Button 
                variant="outline" 
                className="w-full flex items-center gap-2"
                onClick={signInWithGoogle}
                disabled={loading}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.44 12.22c0-.79-.07-1.54-.19-2.28H12v4.51h6.17c-.25 1.26-1.04 2.32-2.23 3.02v3.69h4.73c2.76-2.53 4.35-6.27 4.35-10.02z" fill="#4285F4"/>
                  <path d="M12 23c3.24 0 5.95-1.08 7.93-2.94l-4.73-3.69c-1.31.88-3 1.4-4.2 1.4-3.24 0-5.95-2.18-6.95-5.1H1.34v3.76C3.32 20.75 7.39 23 12 23z" fill="#34A853"/>
                  <path d="M5.05 13.99c-.2-.59-.31-1.23-.31-1.99s.11-1.4.31-1.99V6.24H.32C-.27 7.49-.5 9.1-.5 11s.23 3.51.82 4.76L5.05 13.99z" fill="#FBBC05"/>
                  <path d="M12 4.75c1.77 0 3.35.61 4.6 1.79l4.1-4.1C17.95 1.08 15.24 0 12 0 7.39 0 3.32 2.25 1.34 6.24L5.05 9.99c1-2.92 3.71-5.1 6.95-5.1z" fill="#EA4335"/>
                </svg>
                Entrar com Google
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;