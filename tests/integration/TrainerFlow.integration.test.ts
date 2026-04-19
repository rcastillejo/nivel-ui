/**
 * Integration tests: TrainerModel ↔ LocalStorageDataService
 *
 * These tests exercise the full stack from Model down to the real
 * LocalStorageDataService (backed by jsdom's localStorage), with no mocks of
 * the persistence layer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageDataService } from '@/core/repositories/localStorage';
import { TrainerModel } from '@/core/models/TrainerModel';
import { TrainerSchedule, AVAILABLE_TIME_SLOTS } from '@/core/types';
import { TrainerValidationError } from '@/core/types/errors';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

async function makeModel(): Promise<{ model: TrainerModel; service: LocalStorageDataService }> {
  const service = new LocalStorageDataService();
  await service.initialize();
  const model = new TrainerModel(service);
  return { model, service };
}

function validSchedule(overrides: Partial<TrainerSchedule> = {}): TrainerSchedule {
  return {
    trainerId: 'trainer1',
    trainerName: 'Diego Lamas',
    weeklySchedule: [
      {
        day: 'Lunes',
        slots: [
          { time: '09:00', available: true },
          { time: '10:00', available: false }
        ]
      }
    ],
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TrainerModel (integration)', () => {
  describe('saveSchedule + getSchedule', () => {
    it('persiste el horario y lo recupera correctamente', async () => {
      const { model } = await makeModel();
      const schedule = validSchedule();

      await model.saveSchedule('trainer1', schedule);
      const retrieved = await model.getSchedule('trainer1');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.trainerId).toBe('trainer1');
      expect(retrieved!.weeklySchedule[0].day).toBe('Lunes');
      expect(retrieved!.weeklySchedule[0].slots).toHaveLength(2);
    });

    it('sobrescribe el horario anterior al guardar de nuevo', async () => {
      const { model } = await makeModel();

      await model.saveSchedule('trainer1', validSchedule());

      const updated: TrainerSchedule = {
        trainerId: 'trainer1',
        trainerName: 'Diego Lamas',
        weeklySchedule: [
          { day: 'Lunes', slots: [{ time: '08:00', available: true }] },
          { day: 'Martes', slots: [{ time: '09:00', available: true }] }
        ]
      };
      await model.saveSchedule('trainer1', updated);

      const retrieved = await model.getSchedule('trainer1');
      expect(retrieved!.weeklySchedule).toHaveLength(2);
      expect(retrieved!.weeklySchedule[0].slots[0].time).toBe('08:00');
    });

    it('retorna null si el entrenador no tiene horario guardado', async () => {
      const { model } = await makeModel();

      const result = await model.getSchedule('trainer_no_schedule');

      expect(result).toBeNull();
    });

    it('horarios de dos entrenadores se guardan independientemente', async () => {
      const { model } = await makeModel();

      const schedule1 = validSchedule({ trainerId: 'trainer1' });
      const schedule2: TrainerSchedule = {
        trainerId: 'trainer2',
        trainerName: 'Jeanpierre Casas',
        weeklySchedule: [
          { day: 'Martes', slots: [{ time: '15:00', available: true }] }
        ]
      };

      await model.saveSchedule('trainer1', schedule1);
      await model.saveSchedule('trainer2', schedule2);

      const r1 = await model.getSchedule('trainer1');
      const r2 = await model.getSchedule('trainer2');

      expect(r1!.trainerId).toBe('trainer1');
      expect(r2!.trainerId).toBe('trainer2');
      expect(r2!.weeklySchedule[0].day).toBe('Martes');
    });
  });

  describe('generateDefaultSchedule', () => {
    it('genera horario con datos correctos y persiste correctamente', async () => {
      const { model } = await makeModel();

      const schedule = model.generateDefaultSchedule('trainer1', 'Diego Lamas');
      await model.saveSchedule('trainer1', schedule);

      const retrieved = await model.getSchedule('trainer1');
      expect(retrieved!.weeklySchedule).toHaveLength(6);
      expect(retrieved!.weeklySchedule[0].slots).toHaveLength(AVAILABLE_TIME_SLOTS.length);
    });
  });

  describe('cancelBooking', () => {
    it('cambia el estado de la reserva a cancelled', async () => {
      const { model, service } = await makeModel();

      const bookings = await service.bookings.getAll();
      const confirmed = bookings.find(b => b.status === 'confirmed');
      expect(confirmed).toBeDefined();

      await model.cancelBooking(confirmed!.id);

      const updated = await service.bookings.getById(confirmed!.id);
      expect(updated!.status).toBe('cancelled');
    });

    it('lanza TrainerValidationError para una reserva inexistente', async () => {
      const { model } = await makeModel();

      await expect(model.cancelBooking('booking_nonexistent'))
        .rejects.toThrow(TrainerValidationError);
    });

    it('no afecta otras reservas al cancelar una', async () => {
      const { model, service } = await makeModel();

      const allBefore = await service.bookings.getAll();
      const confirmedBefore = allBefore.filter(b => b.status === 'confirmed');
      expect(confirmedBefore.length).toBeGreaterThan(1);

      await model.cancelBooking(confirmedBefore[0].id);

      const allAfter = await service.bookings.getAll();
      const cancelledAfter = allAfter.filter(b => b.status === 'cancelled');

      // Only one more cancellation
      const cancelledBefore = allBefore.filter(b => b.status === 'cancelled');
      expect(cancelledAfter.length).toBe(cancelledBefore.length + 1);
    });
  });

  describe('saveSchedule validations', () => {
    it('rechaza schedule con trainerId vacío', async () => {
      const { model } = await makeModel();

      await expect(
        model.saveSchedule('', validSchedule({ trainerId: '' }))
      ).rejects.toThrow(TrainerValidationError);
    });

    it('rechaza schedule con weeklySchedule vacío', async () => {
      const { model } = await makeModel();

      await expect(
        model.saveSchedule('trainer1', validSchedule({ weeklySchedule: [] }))
      ).rejects.toThrow(TrainerValidationError);
    });
  });
});
