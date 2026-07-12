import { makeAutoObservable, runInAction } from 'mobx';
import { AuthUser } from '../types';
import { AuthModel } from '../models/AuthModel';
import { withTimeout } from '../utils/withTimeout';

// Bounds how long we wait for the initial session check before giving up,
// so a hung network request can't leave the app stuck loading.
const GET_CURRENT_USER_TIMEOUT_MS = 10_000;

export class AuthViewModel {
  currentUser: AuthUser | null = null;
  isLoading = true; // true until first auth check resolves
  error: string | null = null;

  private unsubscribe: (() => void) | null = null;

  constructor(private readonly authModel: AuthModel) {
    makeAutoObservable(this);
  }

  initialize(): void {
    console.log('[AuthViewModel] initialize() called');
    this.unsubscribe = this.authModel.onAuthStateChange((user) => {
      console.log(`[AuthViewModel] onAuthStateChange fired, user=${user ? user.id : 'null'}`);
      runInAction(() => {
        this.currentUser = user;
        this.isLoading = false;
      });
    });

    withTimeout(
      this.authModel.getCurrentUser(),
      GET_CURRENT_USER_TIMEOUT_MS,
      'Timed out checking session',
    )
      .then((user) => {
        console.log(`[AuthViewModel] getCurrentUser resolved, user=${user ? user.id : 'null'}`);
        runInAction(() => {
          this.currentUser = user;
          this.isLoading = false;
        });
      })
      .catch((err) => {
        console.error('[AuthViewModel] getCurrentUser timed out or errored:', err);
        runInAction(() => {
          this.error = err instanceof Error ? err.message : 'Error al verificar la sesión';
          this.isLoading = false;
        });
      });
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async signIn(email: string, password: string): Promise<boolean> {
    this.setLoading(true);
    this.clearError();
    try {
      const user = await this.authModel.signIn(email, password);
      runInAction(() => {
        this.currentUser = user;
      });
      return true;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error al iniciar sesión';
      });
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.setLoading(true);
    this.clearError();
    try {
      await this.authModel.signInWithGoogle();
      // On success the browser redirects to /auth/callback — no cleanup needed.
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error al iniciar sesión con Google';
      });
      this.setLoading(false);
    }
  }

  async signOut(): Promise<void> {
    this.setLoading(true);
    this.clearError();
    try {
      await this.authModel.signOut();
      runInAction(() => {
        this.currentUser = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error al cerrar sesión';
      });
    } finally {
      this.setLoading(false);
    }
  }

  clearError(): void {
    this.error = null;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  get isTrainer(): boolean {
    return this.currentUser?.role === 'trainer';
  }

  get isClient(): boolean {
    return this.currentUser?.role === 'client';
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
  }
}
