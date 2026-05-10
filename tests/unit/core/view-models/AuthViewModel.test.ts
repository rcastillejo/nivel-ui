import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthViewModel } from '@/core/view-models/AuthViewModel';
import { IAuthService } from '@/core/repositories';
import { AuthUser } from '@/core/types';

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-1',
  email: 'test@nivel.gym',
  role: 'client',
  ...overrides,
});

const makeMockAuthService = (): IAuthService => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn().mockReturnValue(() => {}),
});

describe('AuthViewModel', () => {
  let authService: IAuthService;
  let vm: AuthViewModel;

  beforeEach(() => {
    authService = makeMockAuthService();
    vm = new AuthViewModel(authService);
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with no authenticated user', () => {
      expect(vm.currentUser).toBeNull();
    });

    it('starts in loading state', () => {
      expect(vm.isLoading).toBe(true);
    });

    it('starts with no error', () => {
      expect(vm.error).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // initialize()
  // ---------------------------------------------------------------------------

  describe('initialize()', () => {
    it('subscribes to auth state changes', () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);
      vm.initialize();
      expect(authService.onAuthStateChange).toHaveBeenCalledOnce();
    });

    it('resolves currentUser from getCurrentUser() on mount', async () => {
      const user = makeUser();
      vi.mocked(authService.getCurrentUser).mockResolvedValue(user);
      vi.mocked(authService.onAuthStateChange).mockReturnValue(() => {});

      vm.initialize();
      await vi.waitFor(() => expect(vm.isLoading).toBe(false));

      expect(vm.currentUser).toEqual(user);
    });

    it('sets isLoading to false even when getCurrentUser returns null', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      vm.initialize();
      await vi.waitFor(() => expect(vm.isLoading).toBe(false));

      expect(vm.currentUser).toBeNull();
    });

    it('updates currentUser when onAuthStateChange fires', async () => {
      const user = makeUser();
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      let stateChangeCallback: ((u: AuthUser | null) => void) | null = null;
      vi.mocked(authService.onAuthStateChange).mockImplementation((cb) => {
        stateChangeCallback = cb;
        return () => {};
      });

      vm.initialize();
      stateChangeCallback!(user);

      expect(vm.currentUser).toEqual(user);
      expect(vm.isLoading).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // dispose()
  // ---------------------------------------------------------------------------

  describe('dispose()', () => {
    it('calls the unsubscribe function returned by onAuthStateChange', () => {
      const unsubscribe = vi.fn();
      vi.mocked(authService.onAuthStateChange).mockReturnValue(unsubscribe);
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      vm.initialize();
      vm.dispose();

      expect(unsubscribe).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------------
  // signIn()
  // ---------------------------------------------------------------------------

  describe('signIn()', () => {
    it('returns true and sets currentUser on success', async () => {
      const user = makeUser();
      vi.mocked(authService.signIn).mockResolvedValue(user);

      const result = await vm.signIn('test@nivel.gym', 'secret');

      expect(result).toBe(true);
      expect(vm.currentUser).toEqual(user);
      expect(vm.error).toBeNull();
    });

    it('returns false and sets error on failure', async () => {
      vi.mocked(authService.signIn).mockRejectedValue(new Error('Invalid credentials'));

      const result = await vm.signIn('bad@email.com', 'wrong');

      expect(result).toBe(false);
      expect(vm.currentUser).toBeNull();
      expect(vm.error).toBe('Invalid credentials');
    });

    it('clears a previous error before attempting sign-in', async () => {
      vi.mocked(authService.signIn).mockRejectedValue(new Error('First error'));
      await vm.signIn('a@b.com', 'x');
      expect(vm.error).toBe('First error');

      vi.mocked(authService.signIn).mockResolvedValue(makeUser());
      await vm.signIn('a@b.com', 'x');
      expect(vm.error).toBeNull();
    });

    it('sets isLoading to false after sign-in resolves', async () => {
      vi.mocked(authService.signIn).mockResolvedValue(makeUser());
      await vm.signIn('a@b.com', 'x');
      expect(vm.isLoading).toBe(false);
    });

    it('sets isLoading to false after sign-in rejects', async () => {
      vi.mocked(authService.signIn).mockRejectedValue(new Error('fail'));
      await vm.signIn('a@b.com', 'x');
      expect(vm.isLoading).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // signOut()
  // ---------------------------------------------------------------------------

  describe('signOut()', () => {
    it('clears currentUser on success', async () => {
      vi.mocked(authService.signIn).mockResolvedValue(makeUser());
      await vm.signIn('a@b.com', 'x');

      vi.mocked(authService.signOut).mockResolvedValue();
      await vm.signOut();

      expect(vm.currentUser).toBeNull();
    });

    it('sets error when signOut throws', async () => {
      vi.mocked(authService.signOut).mockRejectedValue(new Error('Network error'));
      await vm.signOut();
      expect(vm.error).toBe('Network error');
    });

    it('sets isLoading to false after signOut', async () => {
      vi.mocked(authService.signOut).mockResolvedValue();
      await vm.signOut();
      expect(vm.isLoading).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Computed: isAuthenticated, isTrainer, isClient
  // ---------------------------------------------------------------------------

  describe('isAuthenticated (computed)', () => {
    it('is false when currentUser is null', () => {
      expect(vm.isAuthenticated).toBe(false);
    });

    it('is true after a successful signIn', async () => {
      vi.mocked(authService.signIn).mockResolvedValue(makeUser());
      await vm.signIn('a@b.com', 'x');
      expect(vm.isAuthenticated).toBe(true);
    });
  });

  describe('isTrainer (computed)', () => {
    it('is false when no user is authenticated', () => {
      expect(vm.isTrainer).toBe(false);
    });

    it('is true when currentUser has role trainer', async () => {
      vi.mocked(authService.signIn).mockResolvedValue(makeUser({ role: 'trainer' }));
      await vm.signIn('a@b.com', 'x');
      expect(vm.isTrainer).toBe(true);
    });

    it('is false when currentUser has role client', async () => {
      vi.mocked(authService.signIn).mockResolvedValue(makeUser({ role: 'client' }));
      await vm.signIn('a@b.com', 'x');
      expect(vm.isTrainer).toBe(false);
    });
  });

  describe('isClient (computed)', () => {
    it('is false when no user is authenticated', () => {
      expect(vm.isClient).toBe(false);
    });

    it('is true when currentUser has role client', async () => {
      vi.mocked(authService.signIn).mockResolvedValue(makeUser({ role: 'client' }));
      await vm.signIn('a@b.com', 'x');
      expect(vm.isClient).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // clearError()
  // ---------------------------------------------------------------------------

  describe('clearError()', () => {
    it('resets error to null', async () => {
      vi.mocked(authService.signIn).mockRejectedValue(new Error('oops'));
      await vm.signIn('a@b.com', 'x');

      vm.clearError();
      expect(vm.error).toBeNull();
    });
  });
});
