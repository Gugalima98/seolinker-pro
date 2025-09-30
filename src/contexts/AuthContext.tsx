import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/logger';
import { User } from '@supabase/supabase-js';

// AppUser now includes more details from the user's profile
interface AppUser extends User {
  role?: 'client' | 'admin';
  plan_id?: string;
  subscription_status?: string;
  subscription_period_end?: string;
}

interface AuthContextType {
  user: AppUser | null;
  siteCount: number;
  isCardRequired: boolean;
  isVerifying: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateUserPassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to read a cookie by name
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
  const [siteCount, setSiteCount] = useState(0);
  const [isCardRequired, setIsCardRequired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchUserSession = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    let cardIsRequired = false;

    if (session) {
      try {
        // Fetch user profile and subscription status
        const { data, error } = await supabase.functions.invoke('get-user-status');
        if (error) throw error;

        // Fetch user's site count
        const { count, error: countError } = await supabase
          .from('client_sites')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id);

        if (countError) throw countError;
        setSiteCount(count ?? 0);

        const appUser: AppUser = {
          ...session.user,
          role: data.profile?.role as 'client' | 'admin',
          plan_id: data.profile?.plan_id,
          subscription_status: data.profile?.subscription_status,
          subscription_period_end: data.profile?.subscription_period_end,
        };
        setUser(appUser);

        cardIsRequired = !data.hasCard;
        setIsCardRequired(!data.hasCard);

      } catch (error: any) {
        console.error("Erro ao buscar dados da sessão do usuário:", error.message);
        setUser(null);
        setSiteCount(0);
        setIsCardRequired(false);
      }
    } else {
      setUser(null);
      setSiteCount(0);
      setIsCardRequired(false);
    }
    setLoading(false);
    return cardIsRequired;
  };

  useEffect(() => {
    const handleAuth = async () => {
      await fetchUserSession();

      const params = new URLSearchParams(window.location.search);
      if (params.get('setup_success')) {
        setIsVerifying(true);
        let attempts = 0;
        const maxAttempts = 10;

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
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
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
    await fetchUserSession();
    logEvent('success', `User ${email} logged in successfully.`);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const signInWithGoogle = async () => {
    const affiliateCode = getCookie('affiliate_code');
    const options: { redirectTo: string; data?: any } = {
      redirectTo: window.location.origin + '/auth/callback',
    };
    if (affiliateCode) {
      options.data = { affiliate_code: affiliateCode };
    }
    await supabase.auth.signInWithOAuth({ provider: 'google', options: options });
  };

  const refreshUser = async () => {
    await fetchUserSession();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    });
    return { error };
  };

  const updateUserPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const value = { user, siteCount, loading, isCardRequired, isVerifying, login, logout, signInWithGoogle, refreshUser, resetPassword, updateUserPassword };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};