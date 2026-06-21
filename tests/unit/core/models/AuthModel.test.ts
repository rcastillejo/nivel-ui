import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthModel } from '@/core/models/AuthModel';
import { IAuthService } from '@/core/repositories/auth';
import { AuthenticationError } from '@/core/types/errors';
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

describe('AuthModel', () => {
  let authService: IAuthService;
  let model: AuthModel;

  beforeEach(() => {
    authService = makeMockAuthService();
    model = new AuthModel(authService);
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // signIn() — input validation
  // ---------------------------------------------------------------------------

  describe('signIn() — input validation', () => {
    it('throws AuthenticationError when email is empty', async () => {
      await expect(model.signIn('', 'secret'))
        .rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError when email is only whitespace', async () => {
      await expect(model.signIn('   ', 'secret'))
        .rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError when password is empty', async () => {
      await expect(model.signIn('test@nivel.gym', ''))
        .rejects.toThrow(AuthenticationError);
    });

    it('does not call authService when validation fails', async () => {
      await model.signIn('', 'x').catch(() => {});
      expect(authService.signIn).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // signIn() — service delegation
  // ---------------------------------------------------------------------------

  describe('signIn() — service delegation', () => {
    it('delegates to authService.signIn with the given credentials', async () => {
      vi.mocked(authService.signIn).mockResolvedValue(makeUser());

      await model.signIn('test@nivel.gym', 'secret');

      expect(authService.signIn).toHaveBeenCalledWith('test@nivel.gym', 'secret');
    });

    it('returns the AuthUser from the service on success', async () => {
      const user = makeUser({ role: 'trainer' });
      vi.mocked(authService.signIn).mockResolvedValue(user);

      const result = await model.signIn('test@nivel.gym', 'secret');

      expect(result).toEqual(user);
    });

    it('wraps service errors as AuthenticationError', async () => {
      vi.mocked(authService.signIn).mockRejectedValue(new Error('Invalid credentials'));

      await expect(model.signIn('test@nivel.gym', 'secret'))
        .rejects.toThrow(AuthenticationError);
    });

    it('preserves the original error message in the AuthenticationError', async () => {
      vi.mocked(authService.signIn).mockRejectedValue(new Error('Email not confirmed'));

      await expect(model.signIn('test@nivel.gym', 'secret'))
        .rejects.toThrow('Email not confirmed');
    });

    it('does not double-wrap an AuthenticationError thrown by the service', async () => {
      const original = new AuthenticationError('Credenciales incorrectas');
      vi.mocked(authService.signIn).mockRejectedValue(original);

      await expect(model.signIn('test@nivel.gym', 'secret'))
        .rejects.toThrow('Credenciales incorrectas');
    });
  });

  // ---------------------------------------------------------------------------
  // signOut()
  // ---------------------------------------------------------------------------

  describe('signOut()', () => {
    it('delegates to authService.signOut', async () => {
      vi.mocked(authService.signOut).mockResolvedValue();

      await model.signOut();

      expect(authService.signOut).toHaveBeenCalledOnce();
    });

    it('propagates errors from authService.signOut', async () => {
      vi.mocked(authService.signOut).mockRejectedValue(new Error('Network error'));

      await expect(model.signOut()).rejects.toThrow('Network error');
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrentUser()
  // ---------------------------------------------------------------------------

  describe('getCurrentUser()', () => {
    it('returns null when no session exists', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      expect(await model.getCurrentUser()).toBeNull();
    });

    it('returns the current AuthUser when a session exists', async () => {
      const user = makeUser();
      vi.mocked(authService.getCurrentUser).mockResolvedValue(user);

      expect(await model.getCurrentUser()).toEqual(user);
    });
  });

  // ---------------------------------------------------------------------------
  // onAuthStateChange()
  // ---------------------------------------------------------------------------

  describe('onAuthStateChange()', () => {
    it('delegates to authService and returns the unsubscribe function', () => {
      const unsubscribe = vi.fn();
      vi.mocked(authService.onAuthStateChange).mockReturnValue(unsubscribe);

      const returned = model.onAuthStateChange(vi.fn());

      expect(authService.onAuthStateChange).toHaveBeenCalledOnce();
      expect(returned).toBe(unsubscribe);
    });

    it('passes the callback through to authService', () => {
      const callback = vi.fn();
      model.onAuthStateChange(callback);

      expect(authService.onAuthStateChange).toHaveBeenCalledWith(callback);
    });
  });
});
