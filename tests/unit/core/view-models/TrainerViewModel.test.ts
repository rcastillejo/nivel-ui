import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrainerViewModel } from '@/core/view-models/TrainerViewModel';
import { BookingModel } from '@/core/models/BookingModel';
import { TrainerModel } from '@/core/models/TrainerModel';
import { Trainer, TrainerSchedule } from '@/core/types';

const mockTrainer: Trainer = {
  id: 'trainer1',
  userId: 'auth-user-1',
  name: 'Diego Lamas',
  availableSlots: ['09:00', '10:00']
};

const mockSchedule: TrainerSchedule = {
  trainerId: 'trainer1',
  trainerName: 'Diego Lamas',
  weeklySchedule: []
};

function makeMockBookingModel(): BookingModel {
  return {
    getTrainers: vi.fn(),
    getTrainerById: vi.fn(),
    getBookingsByDate: vi.fn(),
    getAllBookings: vi.fn(),
    getZoneOccupancy: vi.fn(),
    getAllZonesOccupancy: vi.fn(),
  } as unknown as BookingModel;
}

function makeMockTrainerModel(): TrainerModel {
  return {
    getTrainerByAuthUser: vi.fn(),
    getSchedule: vi.fn(),
    saveSchedule: vi.fn(),
    cancelBooking: vi.fn(),
    generateDefaultSchedule: vi.fn(),
    isTimeSlotValid: vi.fn(),
  } as unknown as TrainerModel;
}

describe('TrainerViewModel', () => {
  let bookingModel: BookingModel;
  let trainerModel: TrainerModel;
  let vm: TrainerViewModel;

  beforeEach(() => {
    bookingModel = makeMockBookingModel();
    trainerModel = makeMockTrainerModel();
    vm = new TrainerViewModel(bookingModel, trainerModel);
  });

  describe('loadCurrentTrainer', () => {
    it('carga el entrenador vinculado al usuario autenticado', async () => {
      vi.mocked(trainerModel.getTrainerByAuthUser).mockResolvedValue(mockTrainer);
      vi.mocked(trainerModel.getSchedule).mockResolvedValue(mockSchedule);

      await vm.loadCurrentTrainer('auth-user-1');

      expect(trainerModel.getTrainerByAuthUser).toHaveBeenCalledWith('auth-user-1');
      expect(vm.selectedTrainerId).toBe('trainer1');
      expect(vm.selectedTrainer).toEqual(mockTrainer);
      expect(vm.error).toBeNull();
    });

    it('carga el horario del entrenador encontrado', async () => {
      vi.mocked(trainerModel.getTrainerByAuthUser).mockResolvedValue(mockTrainer);
      vi.mocked(trainerModel.getSchedule).mockResolvedValue(mockSchedule);

      await vm.loadCurrentTrainer('auth-user-1');

      expect(trainerModel.getSchedule).toHaveBeenCalledWith('trainer1');
      expect(vm.currentSchedule).toEqual(mockSchedule);
    });

    it('setea un error y no selecciona entrenador si no existe uno vinculado', async () => {
      vi.mocked(trainerModel.getTrainerByAuthUser).mockResolvedValue(null);

      await vm.loadCurrentTrainer('unknown-user');

      expect(vm.selectedTrainerId).toBeNull();
      expect(vm.error).not.toBeNull();
      expect(trainerModel.getSchedule).not.toHaveBeenCalled();
    });

    it('setea error si getTrainerByAuthUser lanza una excepción', async () => {
      vi.mocked(trainerModel.getTrainerByAuthUser).mockRejectedValue(new Error('Error de red'));

      await vm.loadCurrentTrainer('auth-user-1');

      expect(vm.error).toBe('Error de red');
    });

    it('no queda en isLoading tras completar', async () => {
      vi.mocked(trainerModel.getTrainerByAuthUser).mockResolvedValue(mockTrainer);
      vi.mocked(trainerModel.getSchedule).mockResolvedValue(mockSchedule);

      await vm.loadCurrentTrainer('auth-user-1');

      expect(vm.isLoading).toBe(false);
    });
  });
});
