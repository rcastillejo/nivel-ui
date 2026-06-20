'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { observer } from 'mobx-react-lite';
import { useAuthViewModel } from '@/core/providers/AuthProvider';
import { UserRole } from '@/core/types';

interface AuthGuardProps {
  children: ReactNode;
  /** When provided, also enforces that the authenticated user has this role. */
  allowedRole?: UserRole;
}

export const AuthGuard = observer(({ children, allowedRole }: AuthGuardProps) => {
  const authVM = useAuthViewModel();
  const router = useRouter();

  const roleRedirect = authVM.isTrainer ? '/trainer' : '/client';

  useEffect(() => {
    if (authVM.isLoading) return;

    if (!authVM.isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (allowedRole && authVM.currentUser?.role !== allowedRole) {
      router.replace(roleRedirect);
    }
  }, [authVM.isLoading, authVM.isAuthenticated, authVM.currentUser?.role, allowedRole, router, roleRedirect]);

  if (authVM.isLoading) {
    return (
      <div data-testid="auth-guard-loading" className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400 text-sm">Cargando…</div>
      </div>
    );
  }

  // Return loading while router.replace('/login') from useEffect is in flight
  if (!authVM.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400 text-sm">Cargando…</div>
      </div>
    );
  }
  if (allowedRole && authVM.currentUser?.role !== allowedRole) return null;

  return <>{children}</>;
});
