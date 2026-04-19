import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleModel } from '@/core/models/ScheduleModel';
import { IDataService } from '@/core/repositories';
import { Trainer, TrainerSchedule } from '@/core/types';

const mockTrainerRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  save: vi.fn(),
  saveSchedule: vi.fn(),
  getSchedule: vi.fn()
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

const mockTrainer: Trainer = {
  id: 'trainer1',
  name: 'Diego Lamas',
  availableSlots: ['09:00', '10:00', '11:00']
};

const makeWeeklySchedule = (mondaySlots: { time: string; available: boolean }[]): TrainerSchedule => ({
  trainerId: 'trainer1',
  trainerName: 'Diego Lamas',
  weeklySchedule: [
    { day: 'Lunes', slots: mondaySlots },
    { day: 'Martes', slots: [] },
    { day: 'Miércoles', slots: [] },
    { day: 'Jueves', slots: [] },
    { day: 'Viernes', slots: [] },
    { day: 'Sábado', slots: [] }
  ]
});

describe('ScheduleModel', () => {
  let scheduleModel: ScheduleModel;

  beforeEach(() => {
    scheduleModel = new ScheduleModel(mockDataService);
    vi.clearAllMocks();
  });

  describe('getTrainerSchedule', () => {
    it('retorna el horario del trainer del repositorio', async () => {
      const mockSchedule: TrainerSchedule = {
        trainerId: 'trainer1',
        trainerName: 'Diego Lamas',
        weeklySchedule: []
      };
      mockTrainerRepository.getSchedule.mockResolvedValue(mockSchedule);

      const result = await scheduleModel.getTrainerSchedule('trainer1');

      expect(result).toEqual(mockSchedule);
      expect(mockTrainerRepository.getSchedule).toHaveBeenCalledWith('trainer1');
    });

    it('retorna null si no hay horario configurado', async () => {
      mockTrainerRepository.getSchedule.mockResolvedValue(null);

      const result = await scheduleModel.getTrainerSchedule('trainer1');

      expect(result).toBeNull();
    });
  });

  describe('getAvailableSlots', () => {
    it('retorna slots del horario del entrenador para el día correcto', async () => {
      const monday = new Date('2024-01-15'); // lunes
      const mockSchedule = makeWeeklySchedule([
        { time: '09:00', available: true },
        { time: '10:00', available: true },
        { time: '11:00', available: false }
      ]);
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer);
      mockTrainerRepository.getSchedule.mockResolvedValue(mockSchedule);

      const result = await scheduleModel.getAvailableSlots('trainer1', monday);

      expect(result).toEqual(['09:00', '10:00']);
    });

    it('excluye slots marcados como no disponibles', async () => {
      const monday = new Date('2024-01-15');
      const mockSchedule = makeWeeklySchedule([
        { time: '09:00', available: false },
        { time: '10:00', available: false },
        { time: '11:00', available: true }
      ]);
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer);
      mockTrainerRepository.getSchedule.mockResolvedValue(mockSchedule);

      const result = await scheduleModel.getAvailableSlots('trainer1', monday);

      expect(result).toEqual(['11:00']);
    });

    it('retorna trainer.availableSlots si no hay horario configurado', async () => {
      const date = new Date('2024-01-15');
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer);
      mockTrainerRepository.getSchedule.mockResolvedValue(null);

      const result = await scheduleModel.getAvailableSlots('trainer1', date);

      expect(result).toEqual(['09:00', '10:00', '11:00']);
    });

    it('retorna array vacío si el entrenador no existe', async () => {
      mockTrainerRepository.getById.mockResolvedValue(null);

      const result = await scheduleModel.getAvailableSlots('nonexistent', new Date());

      expect(result).toEqual([]);
    });

    it('retorna array vacío para domingo (día no laboral)', async () => {
      const sunday = new Date('2024-01-14'); // domingo
      const mockSchedule = makeWeeklySchedule([
        { time: '09:00', available: true }
      ]);
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer);
      mockTrainerRepository.getSchedule.mockResolvedValue(mockSchedule);

      const result = await scheduleModel.getAvailableSlots('trainer1', sunday);

      expect(result).toEqual([]);
    });

    it('no mezcla slots de otros días de la semana', async () => {
      const tuesday = new Date('2024-01-16'); // martes
      const schedule: TrainerSchedule = {
        trainerId: 'trainer1',
        trainerName: 'Diego Lamas',
        weeklySchedule: [
          { day: 'Lunes', slots: [{ time: '09:00', available: true }] },
          { day: 'Martes', slots: [{ time: '14:00', available: true }] },
          { day: 'Miércoles', slots: [] },
          { day: 'Jueves', slots: [] },
          { day: 'Viernes', slots: [] },
          { day: 'Sábado', slots: [] }
        ]
      };
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer);
      mockTrainerRepository.getSchedule.mockResolvedValue(schedule);

      const result = await scheduleModel.getAvailableSlots('trainer1', tuesday);

      expect(result).toEqual(['14:00']);
    });
  });

  describe('isSlotAvailable', () => {
    it('retorna true si el slot está disponible', async () => {
      const monday = new Date('2024-01-15');
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer);
      mockTrainerRepository.getSchedule.mockResolvedValue(null);

      const result = await scheduleModel.isSlotAvailable('trainer1', monday, '09:00');

      expect(result).toBe(true);
    });

    it('retorna false si el slot no está en los slots disponibles', async () => {
      const monday = new Date('2024-01-15');
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer);
      mockTrainerRepository.getSchedule.mockResolvedValue(null);

      const result = await scheduleModel.isSlotAvailable('trainer1', monday, '15:00');

      expect(result).toBe(false);
    });

    it('retorna false si no hay horario configurado para el entrenador', async () => {
      mockTrainerRepository.getById.mockResolvedValue(null);

      const result = await scheduleModel.isSlotAvailable('nonexistent', new Date(), '09:00');

      expect(result).toBe(false);
    });

    it('retorna false para slot marcado como no disponible en el horario', async () => {
      const monday = new Date('2024-01-15');
      const mockSchedule = makeWeeklySchedule([
        { time: '09:00', available: false },
        { time: '10:00', available: true }
      ]);
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer);
      mockTrainerRepository.getSchedule.mockResolvedValue(mockSchedule);

      const result = await scheduleModel.isSlotAvailable('trainer1', monday, '09:00');

      expect(result).toBe(false);
    });
  });
});
