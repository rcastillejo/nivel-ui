import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientViewModel } from '@/core/view-models/ClientViewModel';
import { ClientModel } from '@/core/models/ClientModel';
import { Client } from '@/core/types';

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'client1',
  name: 'María González',
  email: 'maria@email.com',
  phone: '+34 611 000 001',
  status: 'active',
  createdAt: new Date(2025, 0, 1),
  ...overrides,
});

function makeMockClientModel(): ClientModel {
  return {
    getAll: vi.fn(),
    getById: vi.fn(),
    validateClientExists: vi.fn(),
  } as unknown as ClientModel;
}

describe('ClientViewModel', () => {
  let model: ClientModel;
  let vm: ClientViewModel;

  beforeEach(() => {
    model = makeMockClientModel();
    vm = new ClientViewModel(model);
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with an empty clients array', () => {
      expect(vm.clients).toEqual([]);
    });

    it('starts not loading', () => {
      expect(vm.isLoading).toBe(false);
    });

    it('starts with no error', () => {
      expect(vm.error).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // loadClients()
  // ---------------------------------------------------------------------------

  describe('loadClients()', () => {
    it('populates clients on success', async () => {
      const clients = [makeClient(), makeClient({ id: 'client2', name: 'Juan Pérez' })];
      vi.mocked(model.getAll).mockResolvedValue(clients);

      await vm.loadClients();

      expect(vm.clients).toEqual(clients);
    });

    it('clears error on success', async () => {
      vi.mocked(model.getAll).mockRejectedValueOnce(new Error('prev error'));
      await vm.loadClients().catch(() => {});

      vi.mocked(model.getAll).mockResolvedValue([]);
      await vm.loadClients();

      expect(vm.error).toBeNull();
    });

    it('sets error message when model throws', async () => {
      vi.mocked(model.getAll).mockRejectedValue(new Error('Red caída'));

      await vm.loadClients();

      expect(vm.error).toBe('Red caída');
      expect(vm.clients).toEqual([]);
    });

    it('uses fallback error message for non-Error rejections', async () => {
      vi.mocked(model.getAll).mockRejectedValue('unknown');

      await vm.loadClients();

      expect(vm.error).toBe('Error cargando clientes');
    });

    it('sets isLoading to false after successful load', async () => {
      vi.mocked(model.getAll).mockResolvedValue([]);

      await vm.loadClients();

      expect(vm.isLoading).toBe(false);
    });

    it('sets isLoading to false after failed load', async () => {
      vi.mocked(model.getAll).mockRejectedValue(new Error('fail'));

      await vm.loadClients();

      expect(vm.isLoading).toBe(false);
    });

    it('delegates to ClientModel.getAll()', async () => {
      vi.mocked(model.getAll).mockResolvedValue([]);

      await vm.loadClients();

      expect(model.getAll).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------------
  // getClientName()
  // ---------------------------------------------------------------------------

  describe('getClientName()', () => {
    beforeEach(async () => {
      vi.mocked(model.getAll).mockResolvedValue([
        makeClient({ id: 'c1', name: 'Ana Ruiz' }),
        makeClient({ id: 'c2', name: 'Pedro Sanz' }),
      ]);
      await vm.loadClients();
    });

    it('returns the client name when found', () => {
      expect(vm.getClientName('c1')).toBe('Ana Ruiz');
      expect(vm.getClientName('c2')).toBe('Pedro Sanz');
    });

    it('returns the id as fallback when client is not found', () => {
      expect(vm.getClientName('unknown-id')).toBe('unknown-id');
    });
  });

  // ---------------------------------------------------------------------------
  // getClientNames()
  // ---------------------------------------------------------------------------

  describe('getClientNames()', () => {
    beforeEach(async () => {
      vi.mocked(model.getAll).mockResolvedValue([
        makeClient({ id: 'c1', name: 'Ana Ruiz' }),
        makeClient({ id: 'c2', name: 'Pedro Sanz' }),
      ]);
      await vm.loadClients();
    });

    it('returns comma-separated names for a list of known ids', () => {
      expect(vm.getClientNames(['c1', 'c2'])).toBe('Ana Ruiz, Pedro Sanz');
    });

    it('returns an empty string for an empty id array', () => {
      expect(vm.getClientNames([])).toBe('');
    });

    it('falls back to id for unknown clients in a mixed list', () => {
      expect(vm.getClientNames(['c1', 'ghost'])).toBe('Ana Ruiz, ghost');
    });

    it('returns a single name when array has one element', () => {
      expect(vm.getClientNames(['c2'])).toBe('Pedro Sanz');
    });
  });
});
