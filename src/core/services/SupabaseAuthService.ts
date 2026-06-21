import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthUser, UserRole } from '../types';
import { IAuthService } from '../repositories/auth';

export class SupabaseAuthService implements IAuthService {
  constructor(private readonly client: SupabaseClient) {}

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const role = await this.fetchRole(data.user.id);
    return { id: data.user.id, email: data.user.email!, role };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await this.client.auth.getUser();
    if (!user) return null;

    const role = await this.fetchRole(user.id);
    return { id: user.id, email: user.email!, role };
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data: { subscription } } = this.client.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          callback(null);
          return;
        }
        const role = await this.fetchRole(session.user.id);
        callback({ id: session.user.id, email: session.user.email!, role });
      },
    );
    return () => subscription.unsubscribe();
  }

  private async fetchRole(userId: string): Promise<UserRole> {
    const { data } = await this.client
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();
    return (data as { role: UserRole } | null)?.role ?? 'client';
  }
}
