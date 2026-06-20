import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthGuard } from '@/components/AuthGuard';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/core/providers/AuthProvider', () => ({
  useAuthViewModel: vi.fn(),
}));

import { useAuthViewModel } from '@/core/providers/AuthProvider';

function mockAuth(state: {
  isLoading?: boolean;
  isAuthenticated?: boolean;
  role?: 'client' | 'trainer' | null;
}) {
  vi.mocked(useAuthViewModel).mockReturnValue({
    isLoading: state.isLoading ?? false,
    isAuthenticated: state.isAuthenticated ?? false,
    currentUser: state.role ? { id: 'u1', email: 'test@nivel.gym', role: state.role } : null,
    isTrainer: state.role === 'trainer',
    isClient: state.role === 'client',
  } as ReturnType<typeof useAuthViewModel>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe('while auth is loading', () => {
    it('renders a loading indicator', () => {
      mockAuth({ isLoading: true });
      render(<AuthGuard><p>protected</p></AuthGuard>);
      expect(screen.getByTestId('auth-guard-loading')).toBeInTheDocument();
    });

    it('does not render children while loading', () => {
      mockAuth({ isLoading: true });
      render(<AuthGuard><p>protected</p></AuthGuard>);
      expect(screen.queryByText('protected')).not.toBeInTheDocument();
    });

    it('does not redirect while loading', () => {
      mockAuth({ isLoading: true });
      render(<AuthGuard><p>protected</p></AuthGuard>);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Unauthenticated (e.g. after logout, before router.replace('/login') fires)
  // -------------------------------------------------------------------------

  describe('when user is not authenticated', () => {
    it('redirects to /login', () => {
      mockAuth({ isLoading: false, isAuthenticated: false });
      render(<AuthGuard><p>protected</p></AuthGuard>);
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });

    it('does not render children', () => {
      mockAuth({ isLoading: false, isAuthenticated: false });
      render(<AuthGuard><p>protected</p></AuthGuard>);
      expect(screen.queryByText('protected')).not.toBeInTheDocument();
    });

    it('shows a loading indicator instead of a blank page while the redirect is in flight', () => {
      mockAuth({ isLoading: false, isAuthenticated: false });
      render(<AuthGuard><p>protected</p></AuthGuard>);
      // The guard must not produce an empty DOM — it must render something
      // visible so the user never sees a blank white screen between logout
      // and the /login navigation completing.
      expect(document.body.firstChild).not.toBeNull();
      expect(document.body.innerHTML).not.toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated — no role restriction
  // -------------------------------------------------------------------------

  describe('when user is authenticated and no allowedRole is specified', () => {
    it('renders children', () => {
      mockAuth({ isLoading: false, isAuthenticated: true, role: 'client' });
      render(<AuthGuard><p>protected</p></AuthGuard>);
      expect(screen.getByText('protected')).toBeInTheDocument();
    });

    it('does not redirect', () => {
      mockAuth({ isLoading: false, isAuthenticated: true, role: 'trainer' });
      render(<AuthGuard><p>protected</p></AuthGuard>);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated — role matches
  // -------------------------------------------------------------------------

  describe('when role matches allowedRole', () => {
    it('renders children for a client accessing client route', () => {
      mockAuth({ isLoading: false, isAuthenticated: true, role: 'client' });
      render(<AuthGuard allowedRole="client"><p>client area</p></AuthGuard>);
      expect(screen.getByText('client area')).toBeInTheDocument();
    });

    it('renders children for a trainer accessing trainer route', () => {
      mockAuth({ isLoading: false, isAuthenticated: true, role: 'trainer' });
      render(<AuthGuard allowedRole="trainer"><p>trainer area</p></AuthGuard>);
      expect(screen.getByText('trainer area')).toBeInTheDocument();
    });

    it('does not redirect when role matches', () => {
      mockAuth({ isLoading: false, isAuthenticated: true, role: 'client' });
      render(<AuthGuard allowedRole="client"><p>client area</p></AuthGuard>);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated — role mismatch
  // -------------------------------------------------------------------------

  describe('when role does not match allowedRole', () => {
    it('redirects a trainer who visits /client to /trainer', () => {
      mockAuth({ isLoading: false, isAuthenticated: true, role: 'trainer' });
      render(<AuthGuard allowedRole="client"><p>client area</p></AuthGuard>);
      expect(mockReplace).toHaveBeenCalledWith('/trainer');
    });

    it('redirects a client who visits /trainer to /client', () => {
      mockAuth({ isLoading: false, isAuthenticated: true, role: 'client' });
      render(<AuthGuard allowedRole="trainer"><p>trainer area</p></AuthGuard>);
      expect(mockReplace).toHaveBeenCalledWith('/client');
    });

    it('does not render children when role mismatches', () => {
      mockAuth({ isLoading: false, isAuthenticated: true, role: 'trainer' });
      render(<AuthGuard allowedRole="client"><p>client area</p></AuthGuard>);
      expect(screen.queryByText('client area')).not.toBeInTheDocument();
    });
  });
});
