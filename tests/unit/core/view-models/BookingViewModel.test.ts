import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingViewModel } from '@/core/view-models/BookingViewModel';
import { BookingModel } from '@/core/models/BookingModel';
import { ProgramModel } from '@/core/models/ProgramModel';
import { Booking, Trainer, ZoneType } from '@/core/types';

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
  consumeSessionForClient: vi.fn()
};

const mockTrainer: Trainer = {
  id: 'trainer1',
  userId: 'user1',
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
    mockBookingModel.getBookingsByDate.mockResolvedValue([]);
  });

  describe('createBooking', () => {
    const setupForBooking = async () => {
      mockBookingModel.getTrainers.mockResolvedValue([mockTrainer]);
      await vm.loadTrainers();

      await vm.setDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
      vm.setTrainer('trainer1');

      mockBookingModel.getAvailableSlots.mockResolvedValue(['09:00', '10:00']);
      mockBookingModel.getAllZonesOccupancy.mockResolvedValue({ gym: 0, gabinete: 0 });
      await vm.loadAvailableSlots('trainer1', vm.selectedDate!);

      vm.setTime('09:00');
      vm.setZone('gym');
      vm.setClientId('client1');
    };

    it('delegates session consumption to ProgramModel after a successful booking', async () => {
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
      mockProgramModel.consumeSessionForClient.mockResolvedValue(undefined);

      const success = await vm.createBooking();

      expect(success).toBe(true);
      expect(mockProgramModel.consumeSessionForClient).toHaveBeenCalledWith('client1');
    });

    it('succeeds when client has no active program', async () => {
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

      const success = await vm.createBooking();

      expect(success).toBe(true);
      expect(mockProgramModel.consumeSessionForClient).toHaveBeenCalledWith('client1');
    });

    it('does not call consumeSessionForClient when booking fails', async () => {
      await setupForBooking();

      mockBookingModel.createBooking.mockRejectedValue(new Error('Slot not available'));

      const success = await vm.createBooking();

      expect(success).toBe(false);
      expect(mockProgramModel.consumeSessionForClient).not.toHaveBeenCalled();
    });

    it('returns false and sets error when clientId is not set', async () => {
      await setupForBooking();
      vm.setClientId(''); // simulate unauthenticated or missing UUID

      const success = await vm.createBooking();

      expect(success).toBe(false);
      expect(vm.error).toBeTruthy();
      expect(mockBookingModel.createBooking).not.toHaveBeenCalled();
    });

    it('delegates capacity check entirely to BookingModel — does not short-circuit based on local bookings cache', async () => {
      await setupForBooking();

      // Fill local cache with 10 gym bookings for the same slot
      // With the old duplicated logic, this would make validateCapacity() return false
      // and createBooking() would return false without ever calling BookingModel
      vm.setBookings(
        Array.from({ length: 10 }, (_, i): Booking => ({
          id: `b${i}`,
          clientId: `c${i}`,
          trainerId: 'trainer1',
          trainerName: 'Entrenador John',
          date: vm.selectedDate!,
          time: '09:00',
          duration: 60,
          zone: 'gym' as ZoneType,
          status: 'confirmed',
        }))
      );

      const createdBooking: Booking = {
        id: 'booking-new',
        clientId: 'client1',
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date: vm.selectedDate!,
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed',
      };

      mockBookingModel.createBooking.mockResolvedValue(createdBooking);
      mockProgramModel.consumeSessionForClient.mockResolvedValue(null);

      // BookingModel says ok — ViewModel must trust Model, not its own stale cache
      const success = await vm.createBooking();

      expect(success).toBe(true);
      expect(mockBookingModel.createBooking).toHaveBeenCalledOnce();
    });
  });

  describe('setDate — aforo actualizado para el cliente (issue #176)', () => {
    it('carga las reservas reales de la fecha, sin esperar a que el cliente cree la suya', async () => {
      mockBookingModel.getTrainers.mockResolvedValue([mockTrainer]);
      await vm.loadTrainers();
      mockBookingModel.getAvailableSlots.mockResolvedValue(['09:00']);

      const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const existingBooking: Booking = {
        id: 'other-client-booking',
        clientId: 'other-client',
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date,
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed'
      };
      mockBookingModel.getBookingsByDate.mockResolvedValue([existingBooking]);

      expect(vm.bookings).toEqual([]);

      await vm.setDate(date);

      expect(mockBookingModel.getBookingsByDate).toHaveBeenCalledWith(date);
      expect(vm.bookings).toEqual([existingBooking]);
    });

    it('descarta una respuesta de reservas desactualizada si la fecha cambió mientras se cargaba', async () => {
      const staleDate = new Date(2026, 0, 10);
      const freshDate = new Date(2026, 0, 11);
      const staleBooking: Booking = {
        id: 'stale',
        clientId: 'c1',
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date: staleDate,
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed'
      };
      const freshBooking: Booking = { ...staleBooking, id: 'fresh', date: freshDate };

      mockBookingModel.getAvailableSlots.mockResolvedValue([]);

      let resolveStale!: (bookings: Booking[]) => void;
      mockBookingModel.getBookingsByDate.mockImplementationOnce(
        () => new Promise<Booking[]>((resolve) => { resolveStale = resolve; })
      );

      const stalePromise = vm.setDate(staleDate);

      // El cliente cambia de fecha antes de que responda la primera consulta
      mockBookingModel.getBookingsByDate.mockResolvedValue([freshBooking]);
      await vm.setDate(freshDate);

      // Ahora sí responde la consulta vieja, ya obsoleta
      resolveStale([staleBooking]);
      await stalePromise;

      expect(vm.bookings).toEqual([freshBooking]);
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
