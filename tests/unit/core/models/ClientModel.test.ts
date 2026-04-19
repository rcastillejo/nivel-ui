import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientModel } from '@/core/models/ClientModel';
import { IDataService } from '@/core/repositories';
import { Client } from '@/core/types';
import { ClientNotFoundError } from '@/core/types/errors';

const mockClientRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  getByEmail: vi.fn(),
  save: vi.fn(),
  delete: vi.fn()
};

const mockDataService: IDataService = {
  clients: mockClientRepository,
  trainers: {
    getAll: vi.fn(),
    getById: vi.fn(),
    save: vi.fn(),
    saveSchedule: vi.fn(),
    getSchedule: vi.fn()
  },
  bookings: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByDate: vi.fn(),
    getByTrainer: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  programs: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByTrainer: vi.fn(),
    getByClient: vi.fn(),
    save: vi.fn(),
    delete: vi.fn()
  },
  initialize: vi.fn(),
  clear: vi.fn()
};

const mockClient: Client = {
  id: 'client1',
  name: 'Ana García',
  email: 'ana@example.com',
  phone: '555-0001',
  status: 'active',
  createdAt: new Date('2025-01-01')
};

describe('ClientModel', () => {
  let clientModel: ClientModel;

  beforeEach(() => {
    clientModel = new ClientModel(mockDataService);
    vi.clearAllMocks();
  });

  describe('getClientById', () => {
    it('retorna el cliente cuando existe', async () => {
      mockClientRepository.getById.mockResolvedValue(mockClient);

      const result = await clientModel.getClientById('client1');

      expect(result).toEqual(mockClient);
      expect(mockClientRepository.getById).toHaveBeenCalledWith('client1');
    });

    it('lanza ClientNotFoundError para un ID inexistente', async () => {
      mockClientRepository.getById.mockResolvedValue(null);

      await expect(clientModel.getClientById('nonexistent')).rejects.toThrow(ClientNotFoundError);
      await expect(clientModel.getClientById('nonexistent')).rejects.toThrow('Cliente no encontrado: nonexistent');
    });
  });

  describe('validateClientExists', () => {
    it('resuelve sin error cuando el cliente existe', async () => {
      mockClientRepository.getById.mockResolvedValue(mockClient);

      await expect(clientModel.validateClientExists('client1')).resolves.toBeUndefined();
    });

    it('lanza ClientNotFoundError cuando el cliente no existe', async () => {
      mockClientRepository.getById.mockResolvedValue(null);

      await expect(clientModel.validateClientExists('nonexistent')).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('createClient', () => {
    const newClientData: Omit<Client, 'id'> = {
      name: 'Carlos López',
      email: 'carlos@example.com',
      phone: '555-0002',
      status: 'active',
      createdAt: new Date('2026-01-01')
    };

    it('crea y persiste un nuevo cliente cuando el email no existe', async () => {
      mockClientRepository.getByEmail.mockResolvedValue(null);
      mockClientRepository.save.mockResolvedValue(undefined);

      const result = await clientModel.createClient(newClientData);

      expect(result).toMatchObject(newClientData);
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^client_\d+_[a-z0-9]+$/);
      expect(mockClientRepository.save).toHaveBeenCalledWith(result);
    });

    it('lanza error cuando ya existe un cliente con el mismo email', async () => {
      mockClientRepository.getByEmail.mockResolvedValue(mockClient);

      await expect(clientModel.createClient(newClientData)).rejects.toThrow(
        'Ya existe un cliente con el email: carlos@example.com'
      );
      expect(mockClientRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deactivateClient', () => {
    it('desactiva un cliente activo', async () => {
      mockClientRepository.getById.mockResolvedValue(mockClient);
      mockClientRepository.save.mockResolvedValue(undefined);

      await clientModel.deactivateClient('client1');

      expect(mockClientRepository.save).toHaveBeenCalledWith({
        ...mockClient,
        status: 'inactive'
      });
    });

    it('lanza ClientNotFoundError si el cliente no existe', async () => {
      mockClientRepository.getById.mockResolvedValue(null);

      await expect(clientModel.deactivateClient('nonexistent')).rejects.toThrow(ClientNotFoundError);
      expect(mockClientRepository.save).not.toHaveBeenCalled();
    });
  });
});
