import { AuthUser } from '../types';
import { AuthenticationError, SignUpError } from '../types/errors';
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

  async signUp(email: string, password: string): Promise<void> {
    if (!email.trim()) {
      throw new SignUpError('El correo electrónico es requerido');
    }
    if (!password || password.length < 6) {
      throw new SignUpError('La contraseña debe tener al menos 6 caracteres');
    }

    try {
      await this.authService.signUp(email, password);
    } catch (err) {
      if (err instanceof SignUpError) throw err;
      throw new SignUpError(
        err instanceof Error ? err.message : 'Error al crear la cuenta',
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
