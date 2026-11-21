import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAuthenticator } from '@/server/supabaseAuthenticator';

function makeAdmin(options: {
  user?: { id: string } | null;
  authError?: boolean;
  profile?: { role: string } | null;
  profileError?: boolean;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.profile ?? null,
    error: options.profileError ? { message: 'db down' } : null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: options.user ?? null },
    error: options.authError ? { message: 'invalid jwt' } : null,
  });
  return { admin: { auth: { getUser }, from } as unknown as SupabaseClient, getUser, from, select, eq };
}

describe('createSupabaseAuthenticator', () => {
  it('returns the user id and role for a valid token', async () => {
    const { admin, getUser, from, select, eq } = makeAdmin({ user: { id: 'u1' }, profile: { role: 'client' } });

    const user = await createSupabaseAuthenticator(admin)('token-1');

    expect(user).toEqual({ id: 'u1', role: 'client' });
    expect(getUser).toHaveBeenCalledWith('token-1');
    expect(from).toHaveBeenCalledWith('user_profiles');
    expect(select).toHaveBeenCalledWith('role');
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('maps the trainer role', async () => {
    const { admin } = makeAdmin({ user: { id: 'u2' }, profile: { role: 'trainer' } });

    expect(await createSupabaseAuthenticator(admin)('t')).toEqual({ id: 'u2', role: 'trainer' });
  });

  it('returns null when the token is rejected', async () => {
    const { admin } = makeAdmin({ authError: true });

    expect(await createSupabaseAuthenticator(admin)('bad')).toBeNull();
  });

  it('returns null when the token has no user', async () => {
    const { admin } = makeAdmin({ user: null });

    expect(await createSupabaseAuthenticator(admin)('t')).toBeNull();
  });

  it('returns null when the user has no profile', async () => {
    const { admin } = makeAdmin({ user: { id: 'u3' }, profile: null });

    expect(await createSupabaseAuthenticator(admin)('t')).toBeNull();
  });

  it('throws when the profile lookup fails so the request ends in a 500, not a false 401', async () => {
    const { admin } = makeAdmin({ user: { id: 'u4' }, profileError: true });

    await expect(createSupabaseAuthenticator(admin)('t')).rejects.toThrow('db down');
  });

  it('treats unknown roles as no access', async () => {
    const { admin } = makeAdmin({ user: { id: 'u5' }, profile: { role: 'admin' } });

    expect(await createSupabaseAuthenticator(admin)('t')).toBeNull();
  });
});
