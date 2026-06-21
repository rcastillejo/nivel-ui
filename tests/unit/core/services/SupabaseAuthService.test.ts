import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAuthService } from '@/core/services/SupabaseAuthService';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

function makeQueryBuilder(data: object | null = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
}

function makeAuthClient(overrides: {
  signInResult?: object;
  signOutResult?: object;
  getUserResult?: object;
  onAuthStateChangeResult?: object;
  /** Role returned by user_profiles lookup. null = no profile row found. */
  profileRole?: string | null;
  /** Email returned by trainers lookup. null = not a trainer. */
  trainerEmail?: string | null;
} = {}) {
  // null means "no row found"; undefined means "use default 'client' row"
  const profileData = 'profileRole' in overrides
    ? (overrides.profileRole !== null ? { role: overrides.profileRole } : null)
    : { role: 'client' };
  const profileBuilder = makeQueryBuilder(profileData);

  // null means "not a trainer"; undefined means "no trainer row" (default)
  const trainerData = overrides.trainerEmail != null ? { id: 'trainer-row' } : null;
  const trainerBuilder = makeQueryBuilder(trainerData);
  const unsubscribeFn = vi.fn();

  const client = {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue(
        overrides.signInResult ?? {
          data: { user: { id: 'u1', email: 'test@nivel.gym' } },
          error: null,
        },
      ),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(overrides.signOutResult ?? { error: null }),
      getUser: vi.fn().mockResolvedValue(
        overrides.getUserResult ?? { data: { user: { id: 'u1', email: 'test@nivel.gym' } } },
      ),
      onAuthStateChange: vi.fn().mockReturnValue(
        overrides.onAuthStateChangeResult ?? {
          data: { subscription: { unsubscribe: unsubscribeFn } },
        },
      ),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'trainers') return trainerBuilder;
      return profileBuilder;
    }),
    _unsubscribe: unsubscribeFn,
    _profileBuilder: profileBuilder,
    _trainerBuilder: trainerBuilder,
  };

  return client as unknown as SupabaseClient & {
    _unsubscribe: ReturnType<typeof vi.fn>;
    _profileBuilder: ReturnType<typeof makeQueryBuilder>;
    _trainerBuilder: ReturnType<typeof makeQueryBuilder>;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SupabaseAuthService', () => {
  let client: ReturnType<typeof makeAuthClient>;
  let service: SupabaseAuthService;

  beforeEach(() => {
    client = makeAuthClient();
    service = new SupabaseAuthService(client);
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // signIn()
  // -------------------------------------------------------------------------

  describe('signIn()', () => {
    it('calls signInWithPassword with the given credentials', async () => {
      client = makeAuthClient({ profileRole: 'client' });
      service = new SupabaseAuthService(client);

      await service.signIn('test@nivel.gym', 'secret');

      expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@nivel.gym',
        password: 'secret',
      });
    });

    it('returns an AuthUser with id, email and role on success', async () => {
      client = makeAuthClient({ profileRole: 'trainer' });
      service = new SupabaseAuthService(client);

      const result = await service.signIn('test@nivel.gym', 'secret');

      expect(result).toEqual({ id: 'u1', email: 'test@nivel.gym', role: 'trainer' });
    });

    it('fetches role from user_profiles using the authenticated user id', async () => {
      client = makeAuthClient({ profileRole: 'client' });
      service = new SupabaseAuthService(client);

      await service.signIn('test@nivel.gym', 'secret');

      expect(client.from).toHaveBeenCalledWith('user_profiles');
      expect(client._profileBuilder.eq).toHaveBeenCalledWith('id', 'u1');
    });

    it('defaults role to client when user_profiles has no row and email is not a trainer', async () => {
      client = makeAuthClient({ profileRole: null, trainerEmail: null });
      service = new SupabaseAuthService(client);

      const result = await service.signIn('test@nivel.gym', 'secret');

      expect(result.role).toBe('client');
    });

    it('assigns trainer role when user_profiles has no row but email matches a trainer', async () => {
      client = makeAuthClient({ profileRole: null, trainerEmail: 'test@nivel.gym' });
      service = new SupabaseAuthService(client);

      const result = await service.signIn('test@nivel.gym', 'secret');

      expect(result.role).toBe('trainer');
    });

    it('throws when Supabase auth returns an error', async () => {
      client = makeAuthClient({
        signInResult: { data: { user: null }, error: { message: 'Invalid credentials' } },
      });
      service = new SupabaseAuthService(client);

      await expect(service.signIn('bad@email.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  // -------------------------------------------------------------------------
  // signInWithGoogle()
  // -------------------------------------------------------------------------

  describe('signInWithGoogle()', () => {
    it('calls signInWithOAuth with provider google', async () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      });

      await service.signInWithGoogle();

      expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'http://localhost:3000/auth/callback' },
      });
    });

    it('throws when Supabase returns an error', async () => {
      client = makeAuthClient();
      vi.mocked(client.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: null },
        error: { message: 'OAuth error', name: 'AuthError', status: 400 } as never,
      });
      service = new SupabaseAuthService(client);

      await expect(service.signInWithGoogle()).rejects.toThrow('OAuth error');
    });
  });

  // -------------------------------------------------------------------------
  // signOut()
  // -------------------------------------------------------------------------

  describe('signOut()', () => {
    it('calls client.auth.signOut', async () => {
      await service.signOut();
      expect(client.auth.signOut).toHaveBeenCalledOnce();
    });

    it('throws when Supabase returns an error', async () => {
      client = makeAuthClient({ signOutResult: { error: { message: 'Session expired' } } });
      service = new SupabaseAuthService(client);

      await expect(service.signOut()).rejects.toThrow('Session expired');
    });
  });

  // -------------------------------------------------------------------------
  // getCurrentUser()
  // -------------------------------------------------------------------------

  describe('getCurrentUser()', () => {
    it('returns null when no user session exists', async () => {
      client = makeAuthClient({ getUserResult: { data: { user: null } } });
      service = new SupabaseAuthService(client);

      expect(await service.getCurrentUser()).toBeNull();
    });

    it('returns an AuthUser with role when a session exists', async () => {
      client = makeAuthClient({ profileRole: 'trainer' });
      service = new SupabaseAuthService(client);

      const result = await service.getCurrentUser();

      expect(result).toEqual({ id: 'u1', email: 'test@nivel.gym', role: 'trainer' });
    });

    it('defaults role to client when user_profiles has no row and email is not a trainer', async () => {
      client = makeAuthClient({ profileRole: null, trainerEmail: null });
      service = new SupabaseAuthService(client);

      const result = await service.getCurrentUser();

      expect(result?.role).toBe('client');
    });

    it('assigns trainer role when profile is absent but email matches an active trainer', async () => {
      client = makeAuthClient({
        profileRole: null,
        trainerEmail: 'test@nivel.gym',
        getUserResult: { data: { user: { id: 'u1', email: 'test@nivel.gym' } } },
      });
      service = new SupabaseAuthService(client);

      const result = await service.getCurrentUser();

      expect(result?.role).toBe('trainer');
    });
  });

  // -------------------------------------------------------------------------
  // fetchRole — email-based role resolution (via trainers table)
  // -------------------------------------------------------------------------

  describe('fetchRole — email-based resolution', () => {
    it('queries trainers table by email when user_profiles has no row', async () => {
      client = makeAuthClient({ profileRole: null, trainerEmail: null });
      service = new SupabaseAuthService(client);

      await service.signIn('test@nivel.gym', 'secret');

      expect(client.from).toHaveBeenCalledWith('trainers');
      expect(client._trainerBuilder.eq).toHaveBeenCalledWith('email', 'test@nivel.gym');
      expect(client._trainerBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('inserts a new profile with trainer role when email matches an active trainer', async () => {
      client = makeAuthClient({ profileRole: null, trainerEmail: 'test@nivel.gym' });
      service = new SupabaseAuthService(client);

      await service.signIn('test@nivel.gym', 'secret');

      expect(client._profileBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'trainer' }),
      );
    });

    it('inserts a new profile with client role when email does not match any trainer', async () => {
      client = makeAuthClient({ profileRole: null, trainerEmail: null });
      service = new SupabaseAuthService(client);

      await service.signIn('newuser@email.com', 'secret');

      expect(client._profileBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'client' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // onAuthStateChange()
  // -------------------------------------------------------------------------

  describe('onAuthStateChange()', () => {
    it('subscribes to client.auth.onAuthStateChange', () => {
      service.onAuthStateChange(vi.fn());
      expect(client.auth.onAuthStateChange).toHaveBeenCalledOnce();
    });

    it('returns the Supabase unsubscribe function', () => {
      const unsubscribe = vi.fn();
      client = makeAuthClient({
        onAuthStateChangeResult: {
          data: { subscription: { unsubscribe } },
        },
      });
      service = new SupabaseAuthService(client);

      const returned = service.onAuthStateChange(vi.fn());
      returned();

      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it('calls callback with null when session is absent', async () => {
      const callback = vi.fn();
      let capturedHandler: ((event: string, session: null) => Promise<void>) | null = null;

      client = makeAuthClient({
        onAuthStateChangeResult: {
          data: { subscription: { unsubscribe: vi.fn() } },
        },
      });
      (client.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockImplementation(
        (handler: (event: string, session: null) => Promise<void>) => {
          capturedHandler = handler;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      );
      service = new SupabaseAuthService(client);

      service.onAuthStateChange(callback);
      await capturedHandler!('SIGNED_OUT', null);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('calls callback with AuthUser when session is present', async () => {
      const callback = vi.fn();
      let capturedHandler: ((event: string, session: object) => Promise<void>) | null = null;

      const profileBuilder = makeQueryBuilder({ role: 'trainer' });
      const trainerBuilder = makeQueryBuilder(null);
      client = {
        auth: {
          onAuthStateChange: vi.fn().mockImplementation(
            (handler: (event: string, session: object) => Promise<void>) => {
              capturedHandler = handler;
              return { data: { subscription: { unsubscribe: vi.fn() } } };
            },
          ),
          signInWithPassword: vi.fn(),
          signOut: vi.fn(),
          getUser: vi.fn(),
          signInWithOAuth: vi.fn(),
        },
        from: vi.fn().mockImplementation((table: string) =>
          table === 'trainers' ? trainerBuilder : profileBuilder,
        ),
        _unsubscribe: vi.fn(),
        _profileBuilder: profileBuilder,
        _trainerBuilder: trainerBuilder,
      } as unknown as ReturnType<typeof makeAuthClient>;
      service = new SupabaseAuthService(client);

      service.onAuthStateChange(callback);
      await capturedHandler!('SIGNED_IN', {
        user: { id: 'u1', email: 'test@nivel.gym' },
      });

      expect(callback).toHaveBeenCalledWith({
        id: 'u1',
        email: 'test@nivel.gym',
        role: 'trainer',
      });
    });
  });
});
