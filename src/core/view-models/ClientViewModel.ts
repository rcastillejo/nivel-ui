import { makeAutoObservable, runInAction } from 'mobx';
import { Client } from '../types';
import { ClientModel } from '../models/ClientModel';

export class ClientViewModel {
  clients: Client[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private model: ClientModel) {
    makeAutoObservable(this);
  }

  async loadClients(): Promise<void> {
    this.isLoading = true;
    try {
      const clients = await this.model.getAll();
      runInAction(() => {
        this.clients = clients;
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Error cargando clientes';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  getClientName(id: string): string {
    return this.clients.find(c => c.id === id)?.name ?? id;
  }

  getClientNames(ids: string[]): string {
    return ids.map(id => this.getClientName(id)).join(', ');
  }
}
