'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { observer } from 'mobx-react-lite';
import { useAuthViewModel } from '@/core/providers/AuthProvider';

const SignUpPage = observer(() => {
  const authVM = useAuthViewModel();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await authVM.signUp(email, password);
    if (success) {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Revisa tu correo</h1>
          <p className="text-sm text-gray-500">
            Te enviamos un enlace de confirmación a <strong>{email}</strong>. Una vez confirmado, podrás iniciar sesión.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-gray-700 underline underline-offset-2"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nivel Gym</h1>
          <p className="mt-1 text-sm text-gray-500">Crea tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="signup-email"
              data-testid="signup-email"
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

          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="signup-password"
              data-testid="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                         disabled:opacity-50"
              placeholder="Mínimo 6 caracteres"
              disabled={authVM.isLoading}
            />
          </div>

          {authVM.error && (
            <p data-testid="signup-error" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {authVM.error}
            </p>
          )}

          <button
            data-testid="signup-submit"
            type="submit"
            disabled={authVM.isLoading}
            className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg
                       hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2
                       focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {authVM.isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-gray-900 font-medium underline underline-offset-2">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
});

export default SignUpPage;
