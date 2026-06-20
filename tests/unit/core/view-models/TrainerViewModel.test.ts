import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrainerViewModel } from '@/core/view-models/TrainerViewModel';
import { BookingModel } from '@/core/models/BookingModel';
import { TrainerModel } from '@/core/models/TrainerModel';
import { Booking, Trainer, TrainerSchedule, ZoneType } from '@/core/types';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const makeTrainer = (overrides: Partial<Trainer> = {}): Trainer => ({
  id: 'trainer1',
  name: 'Diego Lamas',
  availableSlots: ['09:00', '10:00', '11:00'],
  ...overrides,
});

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  clientId: 'client1',
  trainerId: 'trainer1',
  trainerName: 'Diego Lamas',
  date: new Date(),
  time: '09:00',
  duration: 60,
  zone: 'gym' as ZoneType,
  status: 'confirmed',
  ...overrides,
});

const makeSchedule = (overrides: Partial<TrainerSchedule> = {}): TrainerSchedule => ({
  trainerId: 'trainer1',
  trainerName: 'Diego Lamas',
  weeklySchedule: [
    { day: 'Lunes', slots: [{ time: '09:00', available: true }] },
    { day: 'Martes', slots: [{ time: '10:00', available: true }] },
    { day: 'Miércoles', slots: [{ time: '11:00', available: false }] },
    { day: 'Jueves', slots: [{ time: '09:00', available: true }] },
    { day: 'Viernes', slots: [{ time: '08:00', available: true }] },
    { day: 'Sábado', slots: [{ time: '10:00', available: true }] },
  ],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makeMockBookingModel(): BookingModel {
  return {
    getTrainers: vi.fn(),
    getBookingsByDate: vi.fn(),
    getAllBookings: vi.fn(),
    getZoneOccupancy: vi.fn(),
    getAllZonesOccupancy: vi.fn(),
  } as unknown as BookingModel;
}

function makeMockTrainerModel(): TrainerModel {
  return {
    getSchedule: vi.fn(),
    saveSchedule: vi.fn(),
    cancelBooking: vi.fn(),
    generateDefaultSchedule: vi.fn(),
    isTimeSlotValid: vi.fn(),
  } as unknown as TrainerModel;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TrainerViewModel', () => {
  let bookingModel: BookingModel;
  let trainerModel: TrainerModel;
  let vm: TrainerViewModel;

  beforeEach(() => {
    bookingModel = makeMockBookingModel();
    trainerModel = makeMockTrainerModel();
    vm = new TrainerViewModel(bookingModel, trainerModel);
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with no trainers', () => {
      expect(vm.trainers).toEqual([]);
    });

    it('starts with no bookings', () => {
      expect(vm.bookings).toEqual([]);
    });

    it('starts with no schedule', () => {
      expect(vm.currentSchedule).toBeNull();
    });

    it('starts not loading', () => {
      expect(vm.isLoading).toBe(false);
    });

    it('starts with no error', () => {
      expect(vm.error).toBeNull();
    });

    it('starts with no selected trainer', () => {
      expect(vm.selectedTrainerId).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // loadTrainers()
  // ---------------------------------------------------------------------------

  describe('loadTrainers()', () => {
    it('populates trainers on success', async () => {
      const trainers = [makeTrainer(), makeTrainer({ id: 'trainer2', name: 'Jeanpierre' })];
      vi.mocked(bookingModel.getTrainers).mockResolvedValue(trainers);

      await vm.loadTrainers();

      expect(vm.trainers).toEqual(trainers);
      expect(vm.error).toBeNull();
    });

    it('sets error when model throws', async () => {
      vi.mocked(bookingModel.getTrainers).mockRejectedValue(new Error('Sin red'));

      await vm.loadTrainers();

      expect(vm.error).toBe('Sin red');
      expect(vm.trainers).toEqual([]);
    });

    it('uses fallback error for non-Error rejections', async () => {
      vi.mocked(bookingModel.getTrainers).mockRejectedValue('boom');

      await vm.loadTrainers();

      expect(vm.error).toBe('Error cargando entrenadores');
    });

    it('sets isLoading to false after success', async () => {
      vi.mocked(bookingModel.getTrainers).mockResolvedValue([]);
      await vm.loadTrainers();
      expect(vm.isLoading).toBe(false);
    });

    it('sets isLoading to false after failure', async () => {
      vi.mocked(bookingModel.getTrainers).mockRejectedValue(new Error('fail'));
      await vm.loadTrainers();
      expect(vm.isLoading).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // loadBookings()
  // ---------------------------------------------------------------------------

  describe('loadBookings()', () => {
    it('populates bookings for the given date', async () => {
      const bookings = [makeBooking()];
      vi.mocked(bookingModel.getBookingsByDate).mockResolvedValue(bookings);

      await vm.loadBookings(new Date());

      expect(vm.bookings).toEqual(bookings);
      expect(vm.error).toBeNull();
    });

    it('sets error when model throws', async () => {
      vi.mocked(bookingModel.getBookingsByDate).mockRejectedValue(new Error('Fallo'));

      await vm.loadBookings(new Date());

      expect(vm.error).toBe('Fallo');
    });

    it('passes the date to the model', async () => {
      const date = new Date(2026, 5, 15);
      vi.mocked(bookingModel.getBookingsByDate).mockResolvedValue([]);

      await vm.loadBookings(date);

      expect(bookingModel.getBookingsByDate).toHaveBeenCalledWith(date);
    });
  });

  // ---------------------------------------------------------------------------
  // loadAllBookings()
  // ---------------------------------------------------------------------------

  describe('loadAllBookings()', () => {
    it('populates bookings from getAllBookings', async () => {
      const bookings = [makeBooking(), makeBooking({ id: 'b2' })];
      vi.mocked(bookingModel.getAllBookings).mockResolvedValue(bookings);

      await vm.loadAllBookings();

      expect(vm.bookings).toEqual(bookings);
    });

    it('sets error when model throws', async () => {
      vi.mocked(bookingModel.getAllBookings).mockRejectedValue(new Error('red'));

      await vm.loadAllBookings();

      expect(vm.error).toBe('red');
    });
  });

  // ---------------------------------------------------------------------------
  // loadSchedule()
  // ---------------------------------------------------------------------------

  describe('loadSchedule()', () => {
    it('sets currentSchedule on success', async () => {
      const schedule = makeSchedule();
      vi.mocked(trainerModel.getSchedule).mockResolvedValue(schedule);

      await vm.loadSchedule('trainer1');

      expect(vm.currentSchedule).toEqual(schedule);
      expect(vm.error).toBeNull();
    });

    it('sets currentSchedule to null when none found', async () => {
      vi.mocked(trainerModel.getSchedule).mockResolvedValue(null);

      await vm.loadSchedule('trainer1');

      expect(vm.currentSchedule).toBeNull();
    });

    it('sets error when model throws', async () => {
      vi.mocked(trainerModel.getSchedule).mockRejectedValue(new Error('Error horario'));

      await vm.loadSchedule('trainer1');

      expect(vm.error).toBe('Error horario');
    });
  });

  // ---------------------------------------------------------------------------
  // saveSchedule()
  // ---------------------------------------------------------------------------

  describe('saveSchedule()', () => {
    it('returns true and updates currentSchedule on success', async () => {
      const schedule = makeSchedule();
      vi.mocked(trainerModel.saveSchedule).mockResolvedValue();

      const result = await vm.saveSchedule(schedule);

      expect(result).toBe(true);
      expect(vm.currentSchedule).toEqual(schedule);
      expect(vm.error).toBeNull();
    });

    it('returns false and sets error on failure', async () => {
      vi.mocked(trainerModel.saveSchedule).mockRejectedValue(new Error('Validación fallida'));

      const result = await vm.saveSchedule(makeSchedule());

      expect(result).toBe(false);
      expect(vm.error).toBe('Validación fallida');
    });

    it('calls trainerModel.saveSchedule with correct args', async () => {
      const schedule = makeSchedule({ trainerId: 'trainer1' });
      vi.mocked(trainerModel.saveSchedule).mockResolvedValue();

      await vm.saveSchedule(schedule);

      expect(trainerModel.saveSchedule).toHaveBeenCalledWith('trainer1', schedule);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteBooking()
  // ---------------------------------------------------------------------------

  describe('deleteBooking()', () => {
    it('returns true and removes the booking from local state', async () => {
      vi.mocked(trainerModel.cancelBooking).mockResolvedValue();
      vm['bookings'] = [makeBooking({ id: 'b1' }), makeBooking({ id: 'b2' })];

      const result = await vm.deleteBooking('b1');

      expect(result).toBe(true);
      expect(vm.bookings.map(b => b.id)).toEqual(['b2']);
    });

    it('returns false and sets error on failure', async () => {
      vi.mocked(trainerModel.cancelBooking).mockRejectedValue(new Error('No existe'));

      const result = await vm.deleteBooking('ghost');

      expect(result).toBe(false);
      expect(vm.error).toBe('No existe');
    });
  });

  // ---------------------------------------------------------------------------
  // Computed: selectedTrainer
  // ---------------------------------------------------------------------------

  describe('selectedTrainer (computed)', () => {
    it('returns undefined when no trainer is selected', () => {
      expect(vm.selectedTrainer).toBeUndefined();
    });

    it('returns the matching trainer after setSelectedTrainer', async () => {
      const trainer = makeTrainer({ id: 'trainer1' });
      vi.mocked(bookingModel.getTrainers).mockResolvedValue([trainer]);
      vi.mocked(trainerModel.getSchedule).mockResolvedValue(null);

      await vm.loadTrainers();
      vm.setSelectedTrainer('trainer1');
      await vi.waitFor(() => !vm.isLoading);

      expect(vm.selectedTrainer).toEqual(trainer);
    });
  });

  // ---------------------------------------------------------------------------
  // Computed: trainerBookings
  // ---------------------------------------------------------------------------

  describe('trainerBookings (computed)', () => {
    it('returns empty array when no trainer is selected', () => {
      vm['bookings'] = [makeBooking()];
      expect(vm.trainerBookings).toEqual([]);
    });

    it('returns only confirmed bookings for the selected trainer', async () => {
      vi.mocked(bookingModel.getTrainers).mockResolvedValue([makeTrainer()]);
      vi.mocked(trainerModel.getSchedule).mockResolvedValue(null);
      await vm.loadTrainers();
      vm.setSelectedTrainer('trainer1');
      await vi.waitFor(() => !vm.isLoading);

      vm['bookings'] = [
        makeBooking({ id: 'b1', trainerId: 'trainer1', status: 'confirmed' }),
        makeBooking({ id: 'b2', trainerId: 'trainer1', status: 'cancelled' }),
        makeBooking({ id: 'b3', trainerId: 'trainer2', status: 'confirmed' }),
      ];

      expect(vm.trainerBookings.map(b => b.id)).toEqual(['b1']);
    });
  });

  // ---------------------------------------------------------------------------
  // setSelectedDate()
  // ---------------------------------------------------------------------------

  describe('setSelectedDate()', () => {
    it('updates selectedDate', async () => {
      vi.mocked(bookingModel.getBookingsByDate).mockResolvedValue([]);
      const date = new Date(2026, 5, 15); // Monday

      vm.setSelectedDate(date);

      expect(vm.selectedDate).toEqual(date);
    });

    it('maps Monday (getDay()=1) to dayIndex 0', async () => {
      vi.mocked(bookingModel.getBookingsByDate).mockResolvedValue([]);
      const monday = new Date(2026, 5, 15); // June 15 2026 = Monday
      expect(monday.getDay()).toBe(1);

      vm.setSelectedDate(monday);

      expect(vm.selectedDayIndex).toBe(0);
    });

    it('maps Sunday (getDay()=0) to dayIndex -1 (no schedule)', async () => {
      vi.mocked(bookingModel.getBookingsByDate).mockResolvedValue([]);
      const sunday = new Date(2026, 5, 14); // June 14 2026 = Sunday
      expect(sunday.getDay()).toBe(0);

      vm.setSelectedDate(sunday);

      expect(vm.selectedDayIndex).toBe(-1);
    });

    it('triggers loadBookings for the new date', async () => {
      vi.mocked(bookingModel.getBookingsByDate).mockResolvedValue([]);
      const date = new Date(2026, 5, 15);

      vm.setSelectedDate(date);
      await vi.waitFor(() => !vm.isLoading);

      expect(bookingModel.getBookingsByDate).toHaveBeenCalledWith(date);
    });
  });

  // ---------------------------------------------------------------------------
  // hasBookingsAtTime()
  // ---------------------------------------------------------------------------

  describe('hasBookingsAtTime()', () => {
    beforeEach(async () => {
      const trainer = makeTrainer();
      vi.mocked(bookingModel.getTrainers).mockResolvedValue([trainer]);
      vi.mocked(trainerModel.getSchedule).mockResolvedValue(null);
      await vm.loadTrainers();
      vm.setSelectedTrainer('trainer1');
      await vi.waitFor(() => !vm.isLoading);

      vi.mocked(bookingModel.getBookingsByDate).mockResolvedValue([]);
      vm['bookings'] = [makeBooking({ time: '09:00', status: 'confirmed' })];
    });

    it('returns true when a confirmed booking exists at that time', () => {
      expect(vm.hasBookingsAtTime('09:00')).toBe(true);
    });

    it('returns false when no booking exists at that time', () => {
      expect(vm.hasBookingsAtTime('10:00')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // clearError()
  // ---------------------------------------------------------------------------

  describe('clearError()', () => {
    it('resets error to null', async () => {
      vi.mocked(bookingModel.getTrainers).mockRejectedValue(new Error('oops'));
      await vm.loadTrainers();

      vm.clearError();

      expect(vm.error).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // isTimeSlotValid() delegation
  // ---------------------------------------------------------------------------

  describe('isTimeSlotValid()', () => {
    it('delegates to TrainerModel', () => {
      vi.mocked(trainerModel.isTimeSlotValid).mockReturnValue(true);

      const result = vm.isTimeSlotValid('09:00');

      expect(trainerModel.isTimeSlotValid).toHaveBeenCalledWith('09:00');
      expect(result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // generateDefaultSchedule() delegation
  // ---------------------------------------------------------------------------

  describe('generateDefaultSchedule()', () => {
    it('delegates to TrainerModel with selected trainer id and name', async () => {
      const trainer = makeTrainer({ id: 'trainer1', name: 'Diego Lamas' });
      vi.mocked(bookingModel.getTrainers).mockResolvedValue([trainer]);
      vi.mocked(trainerModel.getSchedule).mockResolvedValue(null);
      await vm.loadTrainers();
      vm.setSelectedTrainer('trainer1');
      await vi.waitFor(() => !vm.isLoading);

      vi.mocked(trainerModel.generateDefaultSchedule).mockReturnValue(makeSchedule());

      vm.generateDefaultSchedule();

      expect(trainerModel.generateDefaultSchedule).toHaveBeenCalledWith('trainer1', 'Diego Lamas');
    });
  });
});
