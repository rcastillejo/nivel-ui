import { Client } from '../types';
import { ClientNotFoundError } from '../types/errors';
import { IDataService } from '../repositories';

export class ClientModel {
  constructor(private dataService: IDataService) {}

  async getClientById(id: string): Promise<Client> {
    const client = await this.dataService.clients.getById(id);
    if (!client) {
      throw new ClientNotFoundError(id);
    }
    return client;
  }

  async validateClientExists(id: string): Promise<void> {
    await this.getClientById(id);
  }

  async createClient(data: Omit<Client, 'id'>): Promise<Client> {
    const existing = await this.dataService.clients.getByEmail(data.email);
    if (existing) {
      throw new Error(`Ya existe un cliente con el email: ${data.email}`);
    }

    const newClient: Client = {
      ...data,
      id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    await this.dataService.clients.save(newClient);
    return newClient;
  }

  async deactivateClient(id: string): Promise<void> {
    const client = await this.getClientById(id);
    await this.dataService.clients.save({ ...client, status: 'inactive' });
  }
}
