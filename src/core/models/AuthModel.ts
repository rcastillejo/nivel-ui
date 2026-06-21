import { AuthUser } from '../types';
import { AuthenticationError } from '../types/errors';
import { IAuthService } from '../repositories/auth';

export class AuthModel {
  constructor(private readonly authService: IAuthService) {}

  async signIn(email: string, password: string): Promise<AuthUser> {
    if (!email.trim()) {
      throw new AuthenticationError('El correo electrónico es requerido');
    }
    if (!password) {
      throw new AuthenticationError('La contraseña es requerida');
    }

    try {
      return await this.authService.signIn(email, password);
    } catch (err) {
      if (err instanceof AuthenticationError) throw err;
      throw new AuthenticationError(
        err instanceof Error ? err.message : 'Credenciales incorrectas',
      );
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
    } catch (err) {
      throw new AuthenticationError(
        err instanceof Error ? err.message : 'Error al iniciar sesión con Google',
      );
    }
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.authService.getCurrentUser();
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return this.authService.onAuthStateChange(callback);
  }
}
