import { makeAutoObservable, runInAction } from 'mobx';
import { AuthUser } from '../types';
import { AuthModel } from '../models/AuthModel';

export class AuthViewModel {
  currentUser: AuthUser | null = null;
  isLoading = true; // true until first auth check resolves
  error: string | null = null;

  private unsubscribe: (() => void) | null = null;

  constructor(private readonly authModel: AuthModel) {
    makeAutoObservable(this);
  }

  initialize(): void {
    this.unsubscribe = this.authModel.onAuthStateChange((user) => {
      runInAction(() => {
        this.currentUser = user;
        this.isLoading = false;
      });
    });

    this.authModel.getCurrentUser().then((user) => {
      runInAction(() => {
        this.currentUser = user;
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

  async signUp(email: string, password: string): Promise<boolean> {
    this.setLoading(true);
    this.clearError();
    try {
      await this.authModel.signUp(email, password);
      return true;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error al crear la cuenta';
      });
      return false;
    } finally {
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
