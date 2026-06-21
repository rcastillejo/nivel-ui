'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { observer } from 'mobx-react-lite';
import { useAuthViewModel } from '@/core/providers/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase';

const LoginPage = observer(() => {
  const authVM = useAuthViewModel();
  const router = useRouter();
  const isSupabaseConfigured = getSupabaseBrowserClient() !== null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (!authVM.isLoading && authVM.isAuthenticated) {
      router.replace(authVM.isTrainer ? '/trainer' : '/client');
    }
  }, [authVM.isAuthenticated, authVM.isLoading, authVM.isTrainer, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await authVM.signIn(email, password);
    if (success) {
      router.replace(authVM.isTrainer ? '/trainer' : '/client');
    }
  };

  if (authVM.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400 text-sm">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Logo / title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nivel Gym</h1>
          <p className="mt-1 text-sm text-gray-500">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              data-testid="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                         disabled:opacity-50"
              placeholder="tu@email.com"
              disabled={authVM.isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              data-testid="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                         disabled:opacity-50"
              placeholder="••••••••"
              disabled={authVM.isLoading}
            />
          </div>

          {/* Error */}
          {authVM.error && (
            <p data-testid="login-error" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {authVM.error}
            </p>
          )}

          {/* Submit */}
          <button
            data-testid="login-submit"
            type="submit"
            disabled={authVM.isLoading}
            className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg
                       hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2
                       focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {authVM.isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        {isSupabaseConfigured && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">o continúa con</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              data-testid="login-google"
              type="button"
              disabled={authVM.isLoading}
              onClick={() => authVM.signInWithGoogle()}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white
                         border border-gray-300 rounded-lg text-sm font-medium text-gray-700
                         hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2
                         focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default LoginPage;
