import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrainerModel } from '@/core/models/TrainerModel';
import { IDataService } from '@/core/repositories';
import { TrainerSchedule, AVAILABLE_TIME_SLOTS } from '@/core/types';
import { TrainerValidationError } from '@/core/types/errors';

const mockTrainerRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  save: vi.fn(),
  saveSchedule: vi.fn(),
  getSchedule: vi.fn()
};

const mockBookingRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  getByDate: vi.fn(),
  getByTrainer: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
};

const mockDataService: IDataService = {
  clients: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByEmail: vi.fn(),
    save: vi.fn(),
    delete: vi.fn()
  },
  trainers: mockTrainerRepository,
  bookings: mockBookingRepository,
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

describe('TrainerModel', () => {
  let trainerModel: TrainerModel;

  beforeEach(() => {
    trainerModel = new TrainerModel(mockDataService);
    vi.clearAllMocks();
  });

  describe('generateDefaultSchedule', () => {
    it('retorna horario con 6 días laborables', () => {
      const schedule = trainerModel.generateDefaultSchedule('trainer1', 'Diego Lamas');

      expect(schedule.weeklySchedule).toHaveLength(6);
    });

    it('los días son lunes a sábado en orden correcto', () => {
      const schedule = trainerModel.generateDefaultSchedule('trainer1', 'Diego Lamas');
      const days = schedule.weeklySchedule.map(d => d.day);

      expect(days).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']);
    });

    it('todos los slots están disponibles por defecto', () => {
      const schedule = trainerModel.generateDefaultSchedule('trainer1', 'Diego Lamas');

      for (const day of schedule.weeklySchedule) {
        expect(day.slots.every(s => s.available)).toBe(true);
      }
    });

    it('cada día tiene todos los AVAILABLE_TIME_SLOTS', () => {
      const schedule = trainerModel.generateDefaultSchedule('trainer1', 'Diego Lamas');

      for (const day of schedule.weeklySchedule) {
        expect(day.slots).toHaveLength(AVAILABLE_TIME_SLOTS.length);
        expect(day.slots.map(s => s.time)).toEqual([...AVAILABLE_TIME_SLOTS]);
      }
    });

    it('asigna trainerId y trainerName correctamente', () => {
      const schedule = trainerModel.generateDefaultSchedule('trainer1', 'Diego Lamas');

      expect(schedule.trainerId).toBe('trainer1');
      expect(schedule.trainerName).toBe('Diego Lamas');
    });
  });

  describe('isTimeSlotValid', () => {
    it('retorna true para un slot válido', () => {
      expect(trainerModel.isTimeSlotValid('09:00')).toBe(true);
      expect(trainerModel.isTimeSlotValid('06:00')).toBe(true);
      expect(trainerModel.isTimeSlotValid('21:30')).toBe(true);
    });

    it('retorna false para un slot inválido', () => {
      expect(trainerModel.isTimeSlotValid('09:15')).toBe(false);
      expect(trainerModel.isTimeSlotValid('25:00')).toBe(false);
      expect(trainerModel.isTimeSlotValid('')).toBe(false);
      expect(trainerModel.isTimeSlotValid('22:00')).toBe(false);
    });

    it('valida todos los slots de AVAILABLE_TIME_SLOTS', () => {
      for (const slot of AVAILABLE_TIME_SLOTS) {
        expect(trainerModel.isTimeSlotValid(slot)).toBe(true);
      }
    });
  });

  describe('saveSchedule', () => {
    const validSchedule: TrainerSchedule = {
      trainerId: 'trainer1',
      trainerName: 'Diego Lamas',
      weeklySchedule: [
        {
          day: 'Lunes',
          slots: [{ time: '09:00', available: true }]
        }
      ]
    };

    it('persiste el horario en el repositorio', async () => {
      mockTrainerRepository.saveSchedule.mockResolvedValue(undefined);

      await trainerModel.saveSchedule('trainer1', validSchedule);

      expect(mockTrainerRepository.saveSchedule).toHaveBeenCalledOnce();
      expect(mockTrainerRepository.saveSchedule).toHaveBeenCalledWith(validSchedule);
    });

    it('lanza TrainerValidationError si trainerId está vacío', async () => {
      const invalid = { ...validSchedule, trainerId: '' };

      await expect(trainerModel.saveSchedule('', invalid))
        .rejects.toThrow(TrainerValidationError);
      expect(mockTrainerRepository.saveSchedule).not.toHaveBeenCalled();
    });

    it('lanza TrainerValidationError si trainerName está vacío', async () => {
      const invalid = { ...validSchedule, trainerName: '   ' };

      await expect(trainerModel.saveSchedule('trainer1', invalid))
        .rejects.toThrow(TrainerValidationError);
      expect(mockTrainerRepository.saveSchedule).not.toHaveBeenCalled();
    });

    it('lanza TrainerValidationError si weeklySchedule está vacío', async () => {
      const invalid = { ...validSchedule, weeklySchedule: [] };

      await expect(trainerModel.saveSchedule('trainer1', invalid))
        .rejects.toThrow(TrainerValidationError);
      expect(mockTrainerRepository.saveSchedule).not.toHaveBeenCalled();
    });

    it('lanza TrainerValidationError si un slot tiene tiempo inválido', async () => {
      const invalid: TrainerSchedule = {
        ...validSchedule,
        weeklySchedule: [
          { day: 'Lunes', slots: [{ time: '09:15', available: true }] }
        ]
      };

      await expect(trainerModel.saveSchedule('trainer1', invalid))
        .rejects.toThrow(TrainerValidationError);
      expect(mockTrainerRepository.saveSchedule).not.toHaveBeenCalled();
    });
  });

  describe('getSchedule', () => {
    it('retorna el horario del repositorio', async () => {
      const mockSchedule: TrainerSchedule = {
        trainerId: 'trainer1',
        trainerName: 'Diego Lamas',
        weeklySchedule: []
      };
      mockTrainerRepository.getSchedule.mockResolvedValue(mockSchedule);

      const result = await trainerModel.getSchedule('trainer1');

      expect(result).toEqual(mockSchedule);
      expect(mockTrainerRepository.getSchedule).toHaveBeenCalledWith('trainer1');
    });

    it('retorna null si no hay horario guardado', async () => {
      mockTrainerRepository.getSchedule.mockResolvedValue(null);

      const result = await trainerModel.getSchedule('trainer1');

      expect(result).toBeNull();
    });
  });

  describe('cancelBooking', () => {
    it('actualiza el estado del booking a cancelled', async () => {
      const mockBooking = {
        id: 'booking1',
        clientId: 'client1',
        trainerId: 'trainer1',
        trainerName: 'Diego Lamas',
        date: new Date(),
        time: '09:00',
        duration: 60,
        zone: 'gym' as const,
        status: 'confirmed' as const
      };
      mockBookingRepository.getById.mockResolvedValue(mockBooking);
      mockBookingRepository.update.mockResolvedValue(undefined);

      await trainerModel.cancelBooking('booking1');

      expect(mockBookingRepository.update).toHaveBeenCalledWith('booking1', { status: 'cancelled' });
    });

    it('lanza TrainerValidationError si la reserva no existe', async () => {
      mockBookingRepository.getById.mockResolvedValue(null);

      await expect(trainerModel.cancelBooking('nonexistent'))
        .rejects.toThrow(TrainerValidationError);
      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });
  });
});
