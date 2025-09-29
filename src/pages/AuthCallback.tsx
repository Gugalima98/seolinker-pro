import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          // Usuário autenticado, redirecionar para o dashboard
          navigate('/dashboard', { replace: true });
        } else if (event === 'SIGNED_OUT') {
          // Usuário deslogado, redirecionar para o login
          navigate('/login', { replace: true });
        }
      }
    );

    // Tentar obter a sessão imediatamente ao carregar o componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      } else {
        // Se não houver sessão inicial, e não for um evento de SIGNED_OUT, redirecionar para login
        // Isso cobre casos onde o callback é acessado diretamente sem um fluxo de login completo
        navigate('/login', { replace: true });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-muted">
      <div className="flex flex-col items-center space-y-4 text-primary">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="text-lg font-medium">Redirecionando...</p>
      </div>
    </div>
  );
};

export default AuthCallback;