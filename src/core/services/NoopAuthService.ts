import { AuthUser } from '../types';
import { IAuthService } from '../repositories/auth';

// Used when NEXT_PUBLIC_SUPABASE_URL is not configured (localStorage dev mode).
// Emails in TRAINER_EMAILS get role='trainer'; any other email gets role='client'.
const TRAINER_EMAILS = new Set(['trainer@nivel.gym']);

export class NoopAuthService implements IAuthService {
  private currentUser: AuthUser | null = null;

  async signIn(email: string, _password: string): Promise<AuthUser> {
    const isTrainer = TRAINER_EMAILS.has(email.toLowerCase().trim());
    this.currentUser = isTrainer
      ? { id: 'trainer1', email, role: 'trainer' }
      : { id: 'client1', email, role: 'client' };
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return null; // start unauthenticated so the login page is shown
  }

  onAuthStateChange(_callback: (user: AuthUser | null) => void): () => void {
    return () => {};
  }
}
