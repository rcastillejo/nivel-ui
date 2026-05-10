'use client';

import { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';
import { AuthViewModel } from '../view-models/AuthViewModel';
import { SupabaseAuthService } from '../services/SupabaseAuthService';
import { NoopAuthService } from '../services/NoopAuthService';
import { getSupabaseBrowserClient } from '@/lib/supabase';

const AuthContext = createContext<AuthViewModel | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authVM = useMemo(() => {
    const supabase = getSupabaseBrowserClient();
    const service = supabase
      ? new SupabaseAuthService(supabase)
      : new NoopAuthService();
    return new AuthViewModel(service);
  }, []);

  useEffect(() => {
    authVM.initialize();
    return () => authVM.dispose();
  }, [authVM]);

  return <AuthContext.Provider value={authVM}>{children}</AuthContext.Provider>;
}

export function useAuthViewModel(): AuthViewModel {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthViewModel must be used within AuthProvider');
  return ctx;
}
