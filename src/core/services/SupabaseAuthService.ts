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
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return null;

    const role = await this.fetchRole(user.id, user.email ?? undefined);
    return { id: user.id, email: user.email!, role };
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data: { subscription } } = this.client.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          callback(null);
          return;
        }
        const { id, email } = session.user;
        const role = await this.fetchRole(id, email ?? undefined);
        callback({ id, email: email!, role });
      },
    );
    return () => subscription.unsubscribe();
  }

  // Looks up the user's role. When no profile exists (first-time OAuth sign-in),
  // checks the trainers table by email so trainers are recognised correctly.
  private async fetchRole(userId: string, email?: string): Promise<UserRole> {
    const { data } = await this.client
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (data) return (data as { role: UserRole }).role;

    // No profile yet — the DB trigger may not have fired or this is a new OAuth identity.
    // Determine role by checking whether this email belongs to an active trainer.
    const role = await this.resolveRoleByEmail(email);
    await this.client.from('user_profiles').insert({ id: userId, role, email: email ?? null });
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
