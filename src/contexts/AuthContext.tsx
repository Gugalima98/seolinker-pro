import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/logger';
import { User } from '@supabase/supabase-js';

// AppUser now includes the role from the profiles table
interface AppUser extends User {
  role?: 'client' | 'admin';
  plan_id?: string;
  subscription_status?: string;
}

interface AuthContextType {
  user: AppUser | null;
  isCardRequired: boolean;
  isVerifying: boolean; // Novo estado para feedback de verificação
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Função auxiliar para ler um cookie pelo nome
function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i=0;i < ca.length;i++) {
    let c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCardRequired, setIsCardRequired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // A nova função busca todos os dados do usuário e o status do cartão do backend
  const fetchUserSession = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    let cardIsRequired = false;

    if (session) {
      try {
        const { data, error } = await supabase.functions.invoke('get-user-status');
        if (error) throw error;

        const appUser: AppUser = {
          ...session.user,
          role: data.profile?.role as 'client' | 'admin',
          plan_id: data.profile?.plan_id,
          subscription_status: data.profile?.subscription_status,
        };
        setUser(appUser);

        // A lógica do popup agora depende apenas de hasCard
        cardIsRequired = !data.hasCard;
        setIsCardRequired(!data.hasCard);

      } catch (error: any) {
        console.error("Erro ao buscar status do usuário:", error.message);
        setUser(null); // Desloga em caso de erro
        setIsCardRequired(false);
      }
    } else {
      setUser(null);
      setIsCardRequired(false);
    }
    setLoading(false);
    return cardIsRequired; // Retorna se o cartão ainda é necessário
  };

  useEffect(() => {
    const handleAuth = async () => {
      await fetchUserSession();

      const params = new URLSearchParams(window.location.search);
      if (params.get('setup_success')) {
        setIsVerifying(true);
        let attempts = 0;
        const maxAttempts = 10; // Tenta por 20 segundos

        const intervalId = setInterval(async () => {
          console.log(`Verificando status do cartão... Tentativa ${attempts + 1}`);
          const stillRequired = await fetchUserSession();
          attempts++;

          if (!stillRequired || attempts >= maxAttempts) {
            clearInterval(intervalId);
            setIsVerifying(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }, 2000);
      }
    }

    handleAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        handleAuth();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logEvent('error', `Failed login attempt for ${email}.`, { error: error.message });
      return false;
    }
    
    await fetchUserSession(); // Ensure user state is updated immediately after successful login
    logEvent('success', `User ${email} logged in successfully.`);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const signInWithGoogle = async () => {
    // Pega o código de afiliado do cookie
    const affiliateCode = getCookie('affiliate_code');
    
    const options: { redirectTo: string; data?: any } = {
      redirectTo: window.location.origin + '/auth/callback',
    };

    if (affiliateCode) {
      console.log(`Código de afiliado "${affiliateCode}" encontrado no cookie. Enviando para o Supabase.`);
      options.data = {
        affiliate_code: affiliateCode
      };
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: options,
    });
  };

  const refreshUser = async () => {
    await fetchUserSession();
  };

  const value = { user, loading, isCardRequired, isVerifying, login, logout, signInWithGoogle, refreshUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};