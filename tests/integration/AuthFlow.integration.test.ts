/**
 * Integration tests: AuthModel ↔ NoopAuthService (in-memory)
 *
 * Exercises the full authentication flow — sign-in and sign-out — through the
 * real AuthModel and AuthViewModel with the NoopAuthService (no network, no
 * Supabase). This validates that the state transitions driving the AuthGuard
 * redirect logic work correctly end-to-end.
 *
 * Checklist (CLAUDE.md §6):
 * - [x] Flujo completo ViewModel → Model → Service
 * - [x] Estado limpiado entre tests (NoopAuthService es stateful in-memory)
 * - [x] Cubre el bug #133: tras signOut, currentUser es null e isAuthenticated false
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthModel } from '@/core/models/AuthModel';
import { AuthViewModel } from '@/core/view-models/AuthViewModel';
import { NoopAuthService } from '@/core/services/NoopAuthService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeStack() {
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
// Tests
// ---------------------------------------------------------------------------

describe('Auth flow integration (AuthViewModel → AuthModel → NoopAuthService)', () => {
  // -------------------------------------------------------------------------
  // Sign-in
  // -------------------------------------------------------------------------

  describe('signIn()', () => {
    it('authenticates a trainer and exposes the user in the ViewModel', async () => {
      const { vm } = await makeStack();

      const ok = await vm.signIn('trainer@nivel.gym', 'any-password');

      expect(ok).toBe(true);
      expect(vm.currentUser).not.toBeNull();
      expect(vm.currentUser?.email).toBe('trainer@nivel.gym');
      expect(vm.isAuthenticated).toBe(true);
    });

    it('authenticates a client and exposes the user in the ViewModel', async () => {
      const { vm } = await makeStack();

      const ok = await vm.signIn('client@nivel.gym', 'any-password');

      expect(ok).toBe(true);
      expect(vm.isAuthenticated).toBe(true);
    });

    it('clears isLoading after successful sign-in', async () => {
      const { vm } = await makeStack();
      await vm.signIn('trainer@nivel.gym', 'pw');
      expect(vm.isLoading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Sign-out — the scenario described in issue #133
  // -------------------------------------------------------------------------

  describe('signOut() — issue #133', () => {
    let vm: AuthViewModel;

    beforeEach(async () => {
      ({ vm } = await makeStack());
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

});
