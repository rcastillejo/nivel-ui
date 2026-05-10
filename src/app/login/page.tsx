'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { observer } from 'mobx-react-lite';
import { useAuthViewModel } from '@/core/providers/AuthProvider';

const LoginPage = observer(() => {
  const authVM = useAuthViewModel();
  const router = useRouter();

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
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {authVM.error}
            </p>
          )}

          {/* Submit */}
          <button
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
      </div>
    </div>
  );
});

export default LoginPage;
