'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { observer } from 'mobx-react-lite';
import { useAuthViewModel } from '@/core/providers/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase';

const AuthCallbackPage = observer(() => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const authVM = useAuthViewModel();

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      router.replace('/login');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.replace('/login');
      return;
    }

    supabase.auth.exchangeCodeForSession(code).catch(() => {
      router.replace('/login');
    });
  }, [searchParams, router]);

  useEffect(() => {
    if (!authVM.isLoading && authVM.isAuthenticated) {
      router.replace(authVM.isTrainer ? '/trainer' : '/client');
    }
  }, [authVM.isAuthenticated, authVM.isLoading, authVM.isTrainer, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse text-gray-400 text-sm">Autenticando…</div>
    </div>
  );
});

export default AuthCallbackPage;
