import { Client } from '../types';
import { ClientNotFoundError } from '../types/errors';
import { IDataService } from '../repositories';

export class ClientModel {
  constructor(private dataService: IDataService) {}

  async getAll(): Promise<Client[]> {
    return this.dataService.clients.getAll();
  }

  async getById(id: string): Promise<Client> {
    const client = await this.dataService.clients.getById(id);
    if (!client) throw new ClientNotFoundError(id);
    return client;
  }

  async validateClientExists(id: string): Promise<void> {
    const client = await this.dataService.clients.getById(id);
    if (!client) throw new ClientNotFoundError(id);
  }
}
