import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthUser, UserRole } from '../types';
import { IAuthService } from '../repositories/auth';

export class SupabaseAuthService implements IAuthService {
  constructor(private readonly client: SupabaseClient) {}

async signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await this.client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const role = await this.fetchRole(data.user.id, data.user.email ?? undefined);
  return { id: data.user.id, email: data.user.email!, role };
}

async signInWithGoogle(): Promise<void> {
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await this.client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
}

async signOut(): Promise<void> {
  const { error } = await this.client.auth.signOut();
  if (error) throw new Error(error.message);
}

async getCurrentUser(): Promise<AuthUser | null> {
  const start = Date.now();
  console.log('[Auth] getCurrentUser: start');
  try {
    const { data: { user } } = await this.client.auth.getUser();
    console.log(`[Auth] getUser() resolved in ${Date.now() - start}ms, user=${user ? user.id : 'null'}`);
    if (!user) {
      console.log(`[Auth] getCurrentUser: done (${Date.now() - start}ms total), no user`);
      return null;
    }

  const role = await this.fetchRole(user.id, user.email ?? undefined);
    console.log(`[Auth] getCurrentUser: done (${Date.now() - start}ms total), role=${role}`);
    return { id: user.id, email: user.email!, role };
  } catch (err) {
    console.error(`[Auth] getCurrentUser: FAILED after ${Date.now() - start}ms`, err);
    throw err;
  }
}

onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  const { data: { subscription } } = this.client.auth.onAuthStateChange(
    (_event, session) => {
      console.log(`[Auth] onAuthStateChange event: ${_event}, hasSession=${!!session}`);
      if (!session?.user) {
        callback(null);
        return;
      }
      const { id, email } = session.user;
      // Defer the role lookup instead of awaiting it here: calling any other
      // Supabase method synchronously inside this callback deadlocks the
      // client's internal auth lock (see supabase/auth-js#762) - the fetch
      // itself completes, but its promise never settles because it's
      // waiting on a lock still held by this very callback.
      setTimeout(() => {
        this.fetchRole(id, email ?? undefined)
          .then((role) => callback({ id, email: email!, role }))
          .catch((err) => {
            console.error('[Auth] onAuthStateChange: fetchRole failed', err);
            callback(null);
          });
      }, 0);
    },
    );
  return () => subscription.unsubscribe();
}

// Looks up the user's role. When no profile exists (first-time OAuth sign-in),
// checks the trainers table by email so trainers are recognised correctly.
private async fetchRole(userId: string, email?: string): Promise<UserRole> {
  const start = Date.now();
  console.log(`[Auth] fetchRole: start for user ${userId}`);
  const { data } = await this.client
  .from('user_profiles')
  .select('role')
  .eq('id', userId)
  .single();

  if (data) {
    console.log(`[Auth] fetchRole: found profile in ${Date.now() - start}ms, role=${(data as { role: UserRole }).role}`);
    return (data as { role: UserRole }).role;
  }

  // No profile yet — the DB trigger may not have fired or this is a new OAuth identity.
  // Determine role by checking whether this email belongs to an active trainer.
  console.log(`[Auth] fetchRole: no profile found after ${Date.now() - start}ms, checking trainers table`);
  const role = await this.resolveRoleByEmail(email);
  await this.client.from('user_profiles').insert({ id: userId, role, email: email ?? null });
  console.log(`[Auth] fetchRole: resolved role=${role} in ${Date.now() - start}ms total`);
  return role;
}

private async resolveRoleByEmail(email?: string): Promise<UserRole> {
  if (!email) return 'client';
  const { data } = await this.client
  .from('trainers')
  .select('id')
  .eq('email', email)
  .eq('is_active', true)
  .maybeSingle();
  return data ? 'trainer' : 'client';
}
}
