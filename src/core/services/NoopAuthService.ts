import { AuthUser } from '../types';
import { IAuthService } from '../repositories';

// Used when NEXT_PUBLIC_SUPABASE_URL is not configured (localStorage dev mode).
// signIn always succeeds so the UI is usable without a real Supabase project.
export class NoopAuthService implements IAuthService {
  private user: AuthUser = { id: 'local-user', email: 'dev@nivel.gym', role: 'client' };

  async signIn(_email: string, _password: string): Promise<AuthUser> {
    return this.user;
  }

  async signOut(): Promise<void> {
    // no-op
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return null; // start unauthenticated so the login page is shown
  }

  onAuthStateChange(_callback: (user: AuthUser | null) => void): () => void {
    return () => {};
  }
}
