import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingViewModel } from '@/core/view-models/BookingViewModel';
import { BookingModel } from '@/core/models/BookingModel';
import { IBookingCommands } from '@/core/repositories';
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

// Mock del gateway de comandos (la reserva se ejecuta en el backend)
const mockCommands = {
  create: vi.fn(),
  cancel: vi.fn()
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
      mockCommands as IBookingCommands,
      () => 'America/Lima'
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

    const confirmedBooking = (): Booking => ({
      id: 'booking1',
      clientId: 'client1',
      trainerId: 'trainer1',
      trainerName: 'Entrenador John',
      date: vm.selectedDate!,
      time: '09:00',
      duration: 60,
      zone: 'gym',
      status: 'confirmed'
    });

    it('sends the selection and the browser time zone to the commands gateway', async () => {
      await setupForBooking();
      mockCommands.create.mockResolvedValue(confirmedBooking());

      const success = await vm.createBooking();

      expect(success).toBe(true);
      expect(mockCommands.create).toHaveBeenCalledWith({
        trainerId: 'trainer1',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        time: '09:00',
        zone: 'gym',
        timeZone: 'America/Lima'
      });
    });

    it('opens the success modal with the booking returned by the backend', async () => {
      await setupForBooking();
      const booking = confirmedBooking();
      mockCommands.create.mockResolvedValue(booking);

      await vm.createBooking();

      expect(vm.showSuccessModal).toBe(true);
      expect(vm.confirmedBooking).toEqual(booking);
      expect(vm.error).toBeNull();
    });

    it('does not touch the booking or program models directly (the backend consumes the session)', async () => {
      await setupForBooking();
      mockCommands.create.mockResolvedValue(confirmedBooking());

      await vm.createBooking();

      expect(mockBookingModel.createBooking).not.toHaveBeenCalled();
    });

    it('ignores repeated calls while a booking is in flight (no duplicate bookings)', async () => {
      await setupForBooking();
      let resolveCreate!: (b: Booking) => void;
      mockCommands.create.mockReturnValue(
        new Promise<Booking>((resolve) => { resolveCreate = resolve; })
      );

      const first = vm.createBooking();
      const second = vm.createBooking();
      const third = vm.createBooking();

      expect(vm.isSubmitting).toBe(true);
      expect(await second).toBe(false);
      expect(await third).toBe(false);

      resolveCreate(confirmedBooking());
      expect(await first).toBe(true);

      expect(mockCommands.create).toHaveBeenCalledTimes(1);
      expect(vm.isSubmitting).toBe(false);
    });

    it('allows booking again after a failed attempt', async () => {
      await setupForBooking();
      mockCommands.create.mockRejectedValueOnce(new Error('fallo'));
      mockCommands.create.mockResolvedValueOnce(confirmedBooking());

      expect(await vm.createBooking()).toBe(false);
      expect(vm.isSubmitting).toBe(false);
      expect(await vm.createBooking()).toBe(true);
    });

    it('shows the backend message and no success modal when booking fails', async () => {
      await setupForBooking();
      mockCommands.create.mockRejectedValue(new Error('El horario seleccionado no está disponible'));

      const success = await vm.createBooking();

      expect(success).toBe(false);
      expect(vm.error).toBe('El horario seleccionado no está disponible');
      expect(vm.showSuccessModal).toBe(false);
    });

    it('returns false and sets error when clientId is not set', async () => {
      await setupForBooking();
      vm.setClientId(''); // simulate unauthenticated or missing UUID

      const success = await vm.createBooking();

      expect(success).toBe(false);
      expect(vm.error).toBeTruthy();
      expect(mockCommands.create).not.toHaveBeenCalled();
    });

    it('delegates the capacity check to the backend — does not short-circuit based on local bookings cache', async () => {
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

      mockCommands.create.mockResolvedValue(createdBooking);

      // The backend decides capacity — ViewModel must not short-circuit on its own stale cache
      const success = await vm.createBooking();

      expect(success).toBe(true);
      expect(mockCommands.create).toHaveBeenCalledOnce();
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
