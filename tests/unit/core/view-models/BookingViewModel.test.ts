import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingViewModel } from '@/core/view-models/BookingViewModel';
import { BookingModel } from '@/core/models/BookingModel';
import { ProgramModel } from '@/core/models/ProgramModel';
import { Booking, Program, Trainer } from '@/core/types';

// Mock de BookingModel
const mockBookingModel = {
  createBooking: vi.fn(),
  getTrainers: vi.fn(),
  getTrainerById: vi.fn(),
  getBookingsByDate: vi.fn(),
  getAvailableSlots: vi.fn(),
  getZoneOccupancy: vi.fn(),
  getAllZonesOccupancy: vi.fn()
};

// Mock de ProgramModel
const mockProgramModel = {
  createProgram: vi.fn(),
  getActiveProgram: vi.fn(),
  renewProgram: vi.fn(),
  expireProgram: vi.fn(),
  updateUsedSessions: vi.fn(),
  consumeSession: vi.fn(),
  consumeSessionForClient: vi.fn(),
  getProgramsByTrainer: vi.fn(),
  getProgramsByClient: vi.fn(),
  getPendingSessions: vi.fn()
};

const makeActiveProgram = (overrides: Partial<Program> = {}): Program => ({
  id: 'program1',
  name: 'Programa Fuerza',
  description: 'Programa de fuerza',
  trainerId: 'trainer1',
  clientIds: ['client1'],
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  totalSessions: 20,
  usedSessions: 5,
  status: 'active',
  ...overrides
});

const mockTrainer: Trainer = {
  id: 'trainer1',
  name: 'John',
  availableSlots: ['09:00', '10:00']
};

describe('BookingViewModel', () => {
  let vm: BookingViewModel;

  beforeEach(() => {
    vm = new BookingViewModel(
      mockBookingModel as unknown as BookingModel,
      mockProgramModel as unknown as ProgramModel
    );
    vi.clearAllMocks();
  });

  describe('loadActiveProgram', () => {
    it('sets activeProgram when client has an active program', async () => {
      const program = makeActiveProgram();
      mockProgramModel.getActiveProgram.mockResolvedValue(program);

      await vm.loadActiveProgram('client1');

      expect(vm.activeProgram).toEqual(program);
      expect(mockProgramModel.getActiveProgram).toHaveBeenCalledWith('client1');
    });

    it('sets activeProgram to null when client has no active program', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(null);

      await vm.loadActiveProgram('client1');

      expect(vm.activeProgram).toBeNull();
    });

    it('silently handles errors without setting vm.error', async () => {
      mockProgramModel.getActiveProgram.mockRejectedValue(new Error('Network error'));

      await vm.loadActiveProgram('client1');

      expect(vm.error).toBeNull();
      expect(vm.activeProgram).toBeNull();
    });
  });

  describe('pendingSessions (computed)', () => {
    it('returns null when there is no active program', () => {
      expect(vm.pendingSessions).toBeNull();
    });

    it('returns correct pending sessions count', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(makeActiveProgram({ usedSessions: 5, totalSessions: 20 }));
      await vm.loadActiveProgram('client1');

      expect(vm.pendingSessions).toBe(15);
    });

    it('returns 0 when all sessions are used', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(makeActiveProgram({ usedSessions: 20, totalSessions: 20 }));
      await vm.loadActiveProgram('client1');

      expect(vm.pendingSessions).toBe(0);
    });
  });

  describe('activeProgramProgress (computed)', () => {
    it('returns null when there is no active program', () => {
      expect(vm.activeProgramProgress).toBeNull();
    });

    it('returns correct progress percentage', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(makeActiveProgram({ usedSessions: 10, totalSessions: 20 }));
      await vm.loadActiveProgram('client1');

      expect(vm.activeProgramProgress).toBe(50);
    });

    it('returns 100 when all sessions are used', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(makeActiveProgram({ usedSessions: 20, totalSessions: 20 }));
      await vm.loadActiveProgram('client1');

      expect(vm.activeProgramProgress).toBe(100);
    });
  });

  describe('hasLowSessions (computed)', () => {
    it('returns false when there is no active program', () => {
      expect(vm.hasLowSessions).toBe(false);
    });

    it('returns true when fewer than 3 sessions remain', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(makeActiveProgram({ usedSessions: 18, totalSessions: 20 }));
      await vm.loadActiveProgram('client1');

      expect(vm.hasLowSessions).toBe(true);
    });

    it('returns false when exactly 3 sessions remain', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(makeActiveProgram({ usedSessions: 17, totalSessions: 20 }));
      await vm.loadActiveProgram('client1');

      expect(vm.hasLowSessions).toBe(false);
    });

    it('returns false when 0 sessions remain (completed)', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(makeActiveProgram({ usedSessions: 20, totalSessions: 20 }));
      await vm.loadActiveProgram('client1');

      expect(vm.hasLowSessions).toBe(false);
    });
  });

  describe('hasActiveProgram (computed)', () => {
    it('returns false when no program loaded', () => {
      expect(vm.hasActiveProgram).toBe(false);
    });

    it('returns true when active program is loaded', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(makeActiveProgram());
      await vm.loadActiveProgram('client1');

      expect(vm.hasActiveProgram).toBe(true);
    });

    it('returns false for an expired program', async () => {
      mockProgramModel.getActiveProgram.mockResolvedValue(makeActiveProgram({ status: 'expired' }));
      await vm.loadActiveProgram('client1');

      expect(vm.hasActiveProgram).toBe(false);
    });
  });

  describe('createBooking', () => {
    const setupForBooking = async () => {
      mockBookingModel.getTrainers.mockResolvedValue([mockTrainer]);
      await vm.loadTrainers();

      vm.setClientId('client1');
      vm.setDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
      vm.setTrainer('trainer1');

      mockBookingModel.getAvailableSlots.mockResolvedValue(['09:00', '10:00']);
      mockBookingModel.getAllZonesOccupancy.mockResolvedValue({ gym: 0, gabinete: 0 });
      await vm.loadAvailableSlots('trainer1', vm.selectedDate!);

      vm.setTime('09:00');
      vm.setZone('gym');
    };

    it('delegates session consumption to ProgramModel and reloads program after a successful booking', async () => {
      await setupForBooking();

      const createdBooking: Booking = {
        id: 'booking1',
        clientId: 'client1',
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date: vm.selectedDate!,
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed'
      };

      const programAfter = makeActiveProgram({ usedSessions: 6 });

      mockBookingModel.createBooking.mockResolvedValue(createdBooking);
      mockProgramModel.consumeSessionForClient.mockResolvedValue(programAfter);
      mockProgramModel.getActiveProgram.mockResolvedValue(programAfter);

      const success = await vm.createBooking();

      expect(success).toBe(true);
      expect(mockProgramModel.consumeSessionForClient).toHaveBeenCalledWith('client1');
      expect(vm.activeProgram?.usedSessions).toBe(6);
    });

    it('succeeds and reloads program even when client has no active program', async () => {
      await setupForBooking();

      const createdBooking: Booking = {
        id: 'booking1',
        clientId: 'client1',
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date: vm.selectedDate!,
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed'
      };

      mockBookingModel.createBooking.mockResolvedValue(createdBooking);
      mockProgramModel.consumeSessionForClient.mockResolvedValue(null);
      mockProgramModel.getActiveProgram.mockResolvedValue(null);

      const success = await vm.createBooking();

      expect(success).toBe(true);
      expect(mockProgramModel.consumeSessionForClient).toHaveBeenCalledWith('client1');
      expect(vm.activeProgram).toBeNull();
    });

    it('does not call consumeSessionForClient when booking fails', async () => {
      await setupForBooking();

      mockBookingModel.createBooking.mockRejectedValue(new Error('Slot not available'));

      const success = await vm.createBooking();

      expect(success).toBe(false);
      expect(mockProgramModel.consumeSessionForClient).not.toHaveBeenCalled();
    });
  });

  describe('loadTrainers', () => {
    it('loads trainers and clears errors', async () => {
      mockBookingModel.getTrainers.mockResolvedValue([mockTrainer]);

      await vm.loadTrainers();

      expect(vm.trainers).toEqual([mockTrainer]);
      expect(vm.error).toBeNull();
    });

    it('sets error on failure', async () => {
      mockBookingModel.getTrainers.mockRejectedValue(new Error('API error'));

      await vm.loadTrainers();

      expect(vm.error).toBe('API error');
    });
  });
});
