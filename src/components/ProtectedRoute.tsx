import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'client' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('ProtectedRoute rendering. User:', user, 'Loading:', loading, 'Required Role:', requiredRole, 'Current Path:', location.pathname); // NOVO LOG

  // Função auxiliar para verificar se o usuário tem permissão
  const hasPermission = (userRole: string | undefined, required: 'client' | 'admin' | undefined) => {
    if (!required) return true; // Se não há role requerida, sempre tem permissão
    if (!userRole) return false; // Se não tem role e é requerida, não tem permissão

    if (required === 'client') {
      return userRole === 'client' || userRole === 'admin'; // Cliente ou Admin podem acessar rotas de cliente
    }
    if (required === 'admin') {
      return userRole === 'admin'; // Apenas Admin pode acessar rotas de admin
    }
    return false; // Caso padrão, não deveria acontecer
  };

  useEffect(() => {
    if (!loading) { // Só age depois que o AuthContext terminou de carregar
      if (!user) {
        // Se não há usuário, redireciona para o login
        navigate('/login', { state: { from: location.pathname }, replace: true });
      } else {
        const hasRolePermission = hasPermission(user.role, requiredRole);

        if (!hasRolePermission) {
          // Se o usuário não tem a role necessária, redireciona para o dashboard apropriado
          if (user.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          return; // Encerra a verificação
        }

        // Se for uma rota de cliente e o usuário for um cliente, verifica a assinatura
        if (requiredRole === 'client' && user.role === 'client') {
          const isSubscriptionActive = user.subscription_status === 'active' || user.subscription_status === 'trialing';
          if (!isSubscriptionActive) {
            // Se a assinatura não estiver ativa ou em trial, redireciona para a página de preços
            navigate('/pricing', { replace: true });
          }
        }
      }
    }
  }, [user, loading, navigate, location.pathname, requiredRole]);

  // Sempre mostra carregando enquanto o AuthContext está processando
  if (loading) {
    console.log('ProtectedRoute: Returning "Carregando autenticação..."'); // NOVO LOG
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não está carregando, mas não há usuário, ou não tem permissão,
  // significa que o useEffect já iniciou o redirecionamento.
  // Exibe uma mensagem de redirecionamento para evitar tela em branco.
  if (!user || !hasPermission(user.role, requiredRole)) {
    console.log('ProtectedRoute: Returning "Redirecionando..." (User:', user, 'Has Permission:', hasPermission(user?.role, requiredRole), ')'); // NOVO LOG
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // Se tudo estiver ok (não está carregando, há usuário e tem permissão), renderiza os filhos
  console.log('ProtectedRoute: Rendering children.'); // NOVO LOG
  return <>{children}</>;
};

export default ProtectedRoute;