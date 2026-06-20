import { AuthUser } from '../types';

export interface IAuthService {
  signIn(email: string, password: string): Promise<AuthUser>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}
