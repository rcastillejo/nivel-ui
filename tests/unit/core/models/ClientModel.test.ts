import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientModel } from '@/core/models/ClientModel';
import { ClientNotFoundError } from '@/core/types/errors';
import { Client } from '@/core/types';

const client1: Client = {
  id: 'client1',
  name: 'María González',
  email: 'maria@email.com',
  phone: '+34 611 000 001',
  status: 'active',
  createdAt: new Date(2025, 0, 1),
};

const mockDataService = {
  clients: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByEmail: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  },
  trainers: {} as never,
  bookings: {} as never,
  programs: {} as never,
  initialize: vi.fn(),
  clear: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ClientModel.getAll()', () => {
  it('devuelve todos los clientes del repositorio', async () => {
    mockDataService.clients.getAll.mockResolvedValue([client1]);
    const model = new ClientModel(mockDataService as never);

    const result = await model.getAll();

    expect(result).toEqual([client1]);
  });
});

describe('ClientModel.getById()', () => {
  it('devuelve el cliente cuando existe', async () => {
    mockDataService.clients.getById.mockResolvedValue(client1);
    const model = new ClientModel(mockDataService as never);

    const result = await model.getById('client1');

    expect(result).toEqual(client1);
  });

  it('lanza ClientNotFoundError cuando el cliente no existe', async () => {
    mockDataService.clients.getById.mockResolvedValue(null);
    const model = new ClientModel(mockDataService as never);

    await expect(model.getById('unknown')).rejects.toThrow(ClientNotFoundError);
    await expect(model.getById('unknown')).rejects.toThrow('unknown');
  });
});

describe('ClientModel.validateClientExists()', () => {
  it('resuelve sin error cuando el cliente existe', async () => {
    mockDataService.clients.getById.mockResolvedValue(client1);
    const model = new ClientModel(mockDataService as never);

    await expect(model.validateClientExists('client1')).resolves.toBeUndefined();
  });

  it('lanza ClientNotFoundError cuando el cliente no existe', async () => {
    mockDataService.clients.getById.mockResolvedValue(null);
    const model = new ClientModel(mockDataService as never);

    await expect(model.validateClientExists('ghost')).rejects.toThrow(ClientNotFoundError);
  });
});
