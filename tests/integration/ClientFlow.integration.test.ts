/**
 * Integration tests: ClientModel ↔ LocalStorageDataService
 *
 * Exercises the client management flow from Model down to the real
 * LocalStorageDataService (backed by jsdom's localStorage), with no mocking
 * of the persistence layer.
 *
 * Checklist (CLAUDE.md §6):
 * - [x] Flujo completo ClientModel → LocalStorageDataService con datos reales
 * - [x] getAll, getById, validateClientExists
 * - [x] Estado de localStorage limpiado entre tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageDataService } from '@/core/repositories/localStorage';
import { ClientModel } from '@/core/models/ClientModel';
import { ClientNotFoundError } from '@/core/types/errors';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

async function makeModel() {
  const service = new LocalStorageDataService();
  await service.initialize();
  const model = new ClientModel(service);
  return { service, model };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClientModel + LocalStorageDataService (integration)', () => {
  // ---------------------------------------------------------------------------
  // getAll()
  // ---------------------------------------------------------------------------

  describe('getAll()', () => {
    it('returns the seeded clients after initialization', async () => {
      const { model } = await makeModel();

      const clients = await model.getAll();

      expect(clients.length).toBeGreaterThan(0);
    });

    it('returns an array with the expected client shape', async () => {
      const { model } = await makeModel();

      const clients = await model.getAll();

      for (const client of clients) {
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('name');
        expect(client).toHaveProperty('email');
        expect(client).toHaveProperty('status');
      }
    });

    it('returns the same clients on subsequent calls', async () => {
      const { model } = await makeModel();

      const first = await model.getAll();
      const second = await model.getAll();

      expect(first).toEqual(second);
    });
  });

  // ---------------------------------------------------------------------------
  // getById()
  // ---------------------------------------------------------------------------

  describe('getById()', () => {
    it('returns the correct client for a known id', async () => {
      const { model } = await makeModel();

      const all = await model.getAll();
      const target = all[0];

      const result = await model.getById(target.id);

      expect(result.id).toBe(target.id);
      expect(result.name).toBe(target.name);
    });

    it('throws ClientNotFoundError for a non-existent id', async () => {
      const { model } = await makeModel();

      await expect(model.getById('nonexistent-id')).rejects.toThrow(ClientNotFoundError);
    });

    it('ClientNotFoundError message contains the requested id', async () => {
      const { model } = await makeModel();

      await expect(model.getById('ghost-id')).rejects.toThrow('ghost-id');
    });
  });

  // ---------------------------------------------------------------------------
  // validateClientExists()
  // ---------------------------------------------------------------------------

  describe('validateClientExists()', () => {
    it('resolves without error for a known client id', async () => {
      const { model } = await makeModel();

      const all = await model.getAll();

      await expect(model.validateClientExists(all[0].id)).resolves.toBeUndefined();
    });

    it('throws ClientNotFoundError for a non-existent id', async () => {
      const { model } = await makeModel();

      await expect(model.validateClientExists('nobody')).rejects.toThrow(ClientNotFoundError);
    });

    it('each seeded client passes validation', async () => {
      const { model } = await makeModel();
      const clients = await model.getAll();

      for (const client of clients) {
        await expect(model.validateClientExists(client.id)).resolves.toBeUndefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple instances share the same localStorage
  // ---------------------------------------------------------------------------

  describe('cross-instance persistence', () => {
    it('clients written via service are readable via a second model instance', async () => {
      const { model: model1 } = await makeModel();
      const clients1 = await model1.getAll();

      const { model: model2 } = await makeModel();
      const clients2 = await model2.getAll();

      expect(clients2).toEqual(clients1);
    });
  });
});
