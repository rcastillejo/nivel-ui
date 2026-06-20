/**
 * Integration tests: Auth flow
 *
 * Suite A — AuthViewModel → AuthModel → NoopAuthService
 *   Validates the state transitions driving AuthGuard redirect logic.
 *   Covers issue #133: tras signOut, currentUser es null e isAuthenticated false.
 *
 * Suite B — AuthModel → NoopAuthService (model-level)
 *   Validates signIn/signOut/signUp validation, role assignment, and
 *   getCurrentUser behaviour at the model boundary.
 *
 * Checklist (CLAUDE.md §6):
 * - [x] Flujo completo ViewModel → Model → Service
 * - [x] Flujo completo Model → Service con datos reales
 * - [x] Estado limpiado entre tests (NoopAuthService es stateful in-memory)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthModel } from '@/core/models/AuthModel';
import { AuthViewModel } from '@/core/view-models/AuthViewModel';
import { NoopAuthService } from '@/core/services/NoopAuthService';
import { AuthenticationError, SignUpError } from '@/core/types/errors';

// ---------------------------------------------------------------------------
// Suite A helpers
// ---------------------------------------------------------------------------

async function makeVMStack() {
  const service = new NoopAuthService();
  const model = new AuthModel(service);
  const vm = new AuthViewModel(model);
  vm.initialize();
  // Wait for the initial getCurrentUser() promise to settle so its null result
  // doesn't race with signIn() and overwrite currentUser afterwards.
  await vi.waitFor(() => expect(vm.isLoading).toBe(false));
  return { vm };
}

// ---------------------------------------------------------------------------
// Suite B helpers
// ---------------------------------------------------------------------------

function makeModelStack() {
  const service = new NoopAuthService();
  const model = new AuthModel(service);
  return { service, model };
}

// ===========================================================================
// Suite A — ViewModel level
// ===========================================================================

describe('Auth flow integration (AuthViewModel → AuthModel → NoopAuthService)', () => {
  describe('signIn()', () => {
    it('authenticates a trainer and exposes the user in the ViewModel', async () => {
      const { vm } = await makeVMStack();

      const ok = await vm.signIn('trainer@nivel.gym', 'any-password');

      expect(ok).toBe(true);
      expect(vm.currentUser).not.toBeNull();
      expect(vm.currentUser?.email).toBe('trainer@nivel.gym');
      expect(vm.isAuthenticated).toBe(true);
    });

    it('authenticates a client and exposes the user in the ViewModel', async () => {
      const { vm } = await makeVMStack();

      const ok = await vm.signIn('client@nivel.gym', 'any-password');

      expect(ok).toBe(true);
      expect(vm.isAuthenticated).toBe(true);
    });

    it('clears isLoading after successful sign-in', async () => {
      const { vm } = await makeVMStack();
      await vm.signIn('trainer@nivel.gym', 'pw');
      expect(vm.isLoading).toBe(false);
    });
  });

  describe('signOut() — issue #133', () => {
    let vm: AuthViewModel;

    beforeEach(async () => {
      ({ vm } = await makeVMStack());
      await vm.signIn('trainer@nivel.gym', 'any-password');
    });

    it('clears currentUser after signOut', async () => {
      await vm.signOut();
      expect(vm.currentUser).toBeNull();
    });

    it('sets isAuthenticated to false after signOut', async () => {
      await vm.signOut();
      expect(vm.isAuthenticated).toBe(false);
    });

    it('sets isLoading to false after signOut completes', async () => {
      await vm.signOut();
      expect(vm.isLoading).toBe(false);
    });

    it('sets no error after a successful signOut', async () => {
      await vm.signOut();
      expect(vm.error).toBeNull();
    });

    it('isTrainer is false after signOut', async () => {
      await vm.signOut();
      expect(vm.isTrainer).toBe(false);
    });

    it('can sign in again after signing out', async () => {
      await vm.signOut();
      const ok = await vm.signIn('trainer@nivel.gym', 'pw');
      expect(ok).toBe(true);
      expect(vm.isAuthenticated).toBe(true);
    });
  });

  describe('signUp() — ViewModel level', () => {
    it('returns true for valid credentials', async () => {
      const { vm } = await makeVMStack();

      const ok = await vm.signUp('new@nivel.gym', 'pass123');

      expect(ok).toBe(true);
      expect(vm.error).toBeNull();
    });

    it('returns false and sets error for short password', async () => {
      const { vm } = await makeVMStack();

      const ok = await vm.signUp('new@nivel.gym', 'abc');

      expect(ok).toBe(false);
      expect(vm.error).not.toBeNull();
    });

    it('does not set currentUser after signup (email confirmation required)', async () => {
      const { vm } = await makeVMStack();
      await vm.signUp('new@nivel.gym', 'pass123');
      expect(vm.currentUser).toBeNull();
    });
  });
});

// ===========================================================================
// Suite B — Model level
// ===========================================================================

describe('AuthModel + NoopAuthService (integration)', () => {
  describe('signIn()', () => {
    it('returns an AuthUser with role=client for a regular email', async () => {
      const { model } = makeModelStack();

      const user = await model.signIn('cliente@nivel.gym', 'pass');

      expect(user.email).toBe('cliente@nivel.gym');
      expect(user.role).toBe('client');
    });

    it('returns an AuthUser with role=trainer for the trainer email', async () => {
      const { model } = makeModelStack();

      const user = await model.signIn('trainer@nivel.gym', 'pass');

      expect(user.role).toBe('trainer');
    });

    it('throws AuthenticationError for an empty email', async () => {
      const { model } = makeModelStack();

      await expect(model.signIn('', 'pass')).rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError for a whitespace-only email', async () => {
      const { model } = makeModelStack();

      await expect(model.signIn('   ', 'pass')).rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError for an empty password', async () => {
      const { model } = makeModelStack();

      await expect(model.signIn('user@email.com', '')).rejects.toThrow(AuthenticationError);
    });
  });

  describe('signOut()', () => {
    it('completes without error', async () => {
      const { model } = makeModelStack();

      await expect(model.signOut()).resolves.toBeUndefined();
    });

    it('can be called without a prior signIn', async () => {
      const { model } = makeModelStack();

      await expect(model.signOut()).resolves.toBeUndefined();
    });
  });

  describe('getCurrentUser()', () => {
    it('returns null on a fresh instance (unauthenticated state)', async () => {
      const { model } = makeModelStack();

      const user = await model.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('signUp()', () => {
    it('resolves without error for valid credentials', async () => {
      const { model } = makeModelStack();

      await expect(model.signUp('new@nivel.gym', 'pass123')).resolves.toBeUndefined();
    });

    it('throws SignUpError for an empty email', async () => {
      const { model } = makeModelStack();

      await expect(model.signUp('', 'pass123')).rejects.toThrow(SignUpError);
    });

    it('throws SignUpError for a whitespace-only email', async () => {
      const { model } = makeModelStack();

      await expect(model.signUp('   ', 'pass123')).rejects.toThrow(SignUpError);
    });

    it('throws SignUpError for a password shorter than 6 characters', async () => {
      const { model } = makeModelStack();

      await expect(model.signUp('new@nivel.gym', 'abc')).rejects.toThrow(SignUpError);
    });

    it('throws SignUpError for an empty password', async () => {
      const { model } = makeModelStack();

      await expect(model.signUp('new@nivel.gym', '')).rejects.toThrow(SignUpError);
    });

    it('accepts a password of exactly 6 characters', async () => {
      const { model } = makeModelStack();

      await expect(model.signUp('new@nivel.gym', 'abc123')).resolves.toBeUndefined();
    });
  });

  describe('onAuthStateChange()', () => {
    it('returns an unsubscribe function', () => {
      const { model } = makeModelStack();

      const unsubscribe = model.onAuthStateChange(() => {});

      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribe can be called without throwing', () => {
      const { model } = makeModelStack();

      const unsubscribe = model.onAuthStateChange(() => {});

      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
