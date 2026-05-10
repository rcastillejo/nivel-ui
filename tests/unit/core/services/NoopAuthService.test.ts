import { describe, it, expect, vi } from 'vitest';
import { NoopAuthService } from '@/core/services/NoopAuthService';

describe('NoopAuthService', () => {
  describe('signIn()', () => {
    it('always resolves to an AuthUser regardless of credentials', async () => {
      const service = new NoopAuthService();
      const result = await service.signIn('anyone@email.com', 'anypassword');

      expect(result).toMatchObject({ id: expect.any(String), email: expect.any(String) });
    });

    it('returns an AuthUser with a valid role', async () => {
      const service = new NoopAuthService();
      const result = await service.signIn('x@x.com', 'x');

      expect(['client', 'trainer']).toContain(result.role);
    });

    it('never rejects', async () => {
      const service = new NoopAuthService();
      await expect(service.signIn('', '')).resolves.toBeDefined();
    });
  });

  describe('signOut()', () => {
    it('resolves without error', async () => {
      const service = new NoopAuthService();
      await expect(service.signOut()).resolves.toBeUndefined();
    });
  });

  describe('getCurrentUser()', () => {
    it('returns null so the login page is shown on first load', async () => {
      const service = new NoopAuthService();
      expect(await service.getCurrentUser()).toBeNull();
    });
  });

  describe('onAuthStateChange()', () => {
    it('returns a function (unsubscribe)', () => {
      const service = new NoopAuthService();
      const unsubscribe = service.onAuthStateChange(vi.fn());
      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribe does not throw', () => {
      const service = new NoopAuthService();
      const unsubscribe = service.onAuthStateChange(vi.fn());
      expect(() => unsubscribe()).not.toThrow();
    });

    it('never calls the callback (no auth events in noop mode)', () => {
      const service = new NoopAuthService();
      const callback = vi.fn();
      service.onAuthStateChange(callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
