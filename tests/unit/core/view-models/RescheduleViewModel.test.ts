import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RescheduleViewModel } from '@/core/view-models/RescheduleViewModel';
import { BookingModel } from '@/core/models/BookingModel';
import { IBookingCommands } from '@/core/repositories';
import { Booking, Trainer } from '@/core/types';

const mockModel = {
  getTrainers: vi.fn(),
  getAvailableSlots: vi.fn(),
  getBookingsByDate: vi.fn(),
};

const mockCommands = {
  create: vi.fn(),
  cancel: vi.fn(),
  reschedule: vi.fn(),
};

const fixedNow = new Date(2026, 10, 10, 6, 0);
const john: Trainer = { id: 'trainer1', userId: 'u1', name: 'John', availableSlots: ['09:00'] };
const ana: Trainer = { id: 'trainer2', userId: 'u2', name: 'Ana', availableSlots: ['11:00'] };

const original: Booking = {
  id: 'b1',
  clientId: 'client1',
  trainerId: 'trainer1',
  trainerName: 'Entrenador John',
  date: new Date(2026, 10, 12),
  time: '09:00',
  duration: 60,
  zone: 'gym',
  status: 'confirmed',
};

const otherBooking: Booking = { ...original, id: 'other', clientId: 'client2', time: '10:00' };
const newDate = new Date(2026, 10, 14);

describe('RescheduleViewModel', () => {
  let vm: RescheduleViewModel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockModel.getTrainers.mockResolvedValue([john, ana]);
    mockModel.getAvailableSlots.mockImplementation(async (trainerId: string) =>
      trainerId === 'trainer1' ? ['09:00', '10:00'] : ['11:00']
    );
    mockModel.getBookingsByDate.mockResolvedValue([original, otherBooking]);
    mockCommands.reschedule.mockResolvedValue({ ...original, trainerId: 'trainer2', time: '11:00' });
    vm = new RescheduleViewModel(
      mockModel as unknown as BookingModel,
      mockCommands as IBookingCommands,
      () => 'America/Lima',
      () => fixedNow
    );
  });

  const fillSelection = async () => {
    await vm.start(original);
    await vm.setDate(newDate);
    vm.selectSlot('trainer2', '11:00');
    vm.setZone('gabinete');
  };

  it('starts closed and empty', () => {
    expect(vm.target).toBeNull();
    expect(vm.isOpen).toBe(false);
    expect(vm.selectedDate).toBeNull();
    expect(vm.error).toBeNull();
    expect(vm.isSubmitting).toBe(false);
  });

  describe('start', () => {
    it('opens for a booking with a clean selection and loads the trainers', async () => {
      await vm.start(original);

      expect(vm.isOpen).toBe(true);
      expect(vm.target).toEqual(original);
      expect(vm.trainers.map((t) => t.id)).toEqual(['trainer1', 'trainer2']);
      expect(vm.selectedDate).toBeNull();
      expect(vm.selectedTime).toBeNull();
      expect(vm.selectedZone).toBeNull();
    });

    it('does not reload the trainers when they are already loaded', async () => {
      await vm.start(original);
      vm.close();
      await vm.start(original);

      expect(mockModel.getTrainers).toHaveBeenCalledTimes(1);
    });

    it('clears a previous error and selection', async () => {
      await fillSelection();
      mockCommands.reschedule.mockRejectedValueOnce(new Error('falló'));
      await vm.confirm();
      expect(vm.error).toBe('falló');

      vm.close();
      await vm.start(original);

      expect(vm.error).toBeNull();
      expect(vm.selectedDate).toBeNull();
      expect(vm.selectedTime).toBeNull();
    });

    it('shows the error when the trainers cannot be loaded', async () => {
      mockModel.getTrainers.mockRejectedValue(new Error('sin conexión'));

      await vm.start(original);

      expect(vm.error).toBe('sin conexión');
      expect(vm.isOpen).toBe(true);
    });
  });

  describe('setDate', () => {
    it('loads the slots of every trainer asking the model to ignore the booking being moved', async () => {
      await vm.start(original);
      await vm.setDate(newDate);

      expect(mockModel.getAvailableSlots).toHaveBeenCalledWith('trainer1', newDate, fixedNow, 'b1');
      expect(mockModel.getAvailableSlots).toHaveBeenCalledWith('trainer2', newDate, fixedNow, 'b1');
      expect(vm.availableSlotsByTrainer).toEqual({ trainer1: ['09:00', '10:00'], trainer2: ['11:00'] });
      expect(vm.selectedDate).toEqual(newDate);
    });

    it('does not count the booking being moved in the occupancy shown to the client', async () => {
      await vm.start(original);
      await vm.setDate(newDate);

      expect(vm.bookings.map((b) => b.id)).toEqual(['other']);
    });

    it('clears the chosen slot and zone when the date changes', async () => {
      await fillSelection();

      await vm.setDate(new Date(2026, 10, 15));

      expect(vm.selectedTime).toBeNull();
      expect(vm.selectedTrainer).toBeNull();
      expect(vm.selectedZone).toBeNull();
    });

    it('is loading while the slots are requested', async () => {
      await vm.start(original);
      let release: (slots: string[]) => void = () => {};
      mockModel.getAvailableSlots.mockReturnValue(new Promise<string[]>((resolve) => { release = resolve; }));

      const pending = vm.setDate(newDate);
      expect(vm.isLoading).toBe(true);

      release(['09:00']);
      await pending;
      expect(vm.isLoading).toBe(false);
    });

    it('discards a stale response when the date changed while loading', async () => {
      await vm.start(original);
      const releases: Array<(slots: string[]) => void> = [];
      mockModel.getAvailableSlots.mockImplementation(
        () => new Promise<string[]>((resolve) => { releases.push(resolve); })
      );

      const first = vm.setDate(new Date(2026, 10, 14));
      await Promise.resolve();
      const second = vm.setDate(new Date(2026, 10, 15));
      await Promise.resolve();

      // Responden primero las de la segunda fecha y después las de la primera
      releases.slice(2).forEach((release) => release(['16:00']));
      await second;
      releases.slice(0, 2).forEach((release) => release(['07:00']));
      await first;

      expect(vm.selectedDate).toEqual(new Date(2026, 10, 15));
      expect(vm.availableSlotsByTrainer).toEqual({ trainer1: ['16:00'], trainer2: ['16:00'] });
    });

    it('shows the error when the availability cannot be loaded', async () => {
      await vm.start(original);
      mockModel.getAvailableSlots.mockRejectedValue(new Error('boom'));

      await vm.setDate(newDate);

      expect(vm.error).toBe('boom');
      expect(vm.isLoading).toBe(false);
    });
  });

  describe('selection', () => {
    it('selectSlot sets the trainer and the time', async () => {
      await vm.start(original);

      vm.selectSlot('trainer2', '11:00');

      expect(vm.selectedTrainer?.id).toBe('trainer2');
      expect(vm.selectedTime).toBe('11:00');
      expect(vm.selectedTrainerName).toBe('Entrenador Ana');
    });

    it('ignores a trainer that does not exist', async () => {
      await vm.start(original);

      vm.selectSlot('nobody', '11:00');

      expect(vm.selectedTrainer).toBeNull();
      expect(vm.selectedTime).toBeNull();
    });

    it('setZone sets the zone', () => {
      vm.setZone('gabinete');

      expect(vm.selectedZone).toBe('gabinete');
    });

    it('clearSlot forgets the trainer, the time and the zone but keeps the date and its slots', async () => {
      await fillSelection();

      vm.clearSlot();

      expect(vm.selectedTrainer).toBeNull();
      expect(vm.selectedTime).toBeNull();
      expect(vm.selectedZone).toBeNull();
      expect(vm.selectedDate).toEqual(newDate);
      expect(vm.availableSlotsByTrainer.trainer2).toEqual(['11:00']);
    });
  });

  describe('canConfirm', () => {
    it('is false until a date, a slot and a zone are chosen', async () => {
      await vm.start(original);
      expect(vm.canConfirm).toBe(false);

      await vm.setDate(newDate);
      expect(vm.canConfirm).toBe(false);

      vm.selectSlot('trainer2', '11:00');
      expect(vm.canConfirm).toBe(false);

      vm.setZone('gabinete');
      expect(vm.canConfirm).toBe(true);
    });

    it('is false when the choice is exactly the current slot', async () => {
      await vm.start(original);
      await vm.setDate(new Date(2026, 10, 12));
      vm.selectSlot('trainer1', '09:00');
      vm.setZone('gym');

      expect(vm.canConfirm).toBe(false);
    });

    it('is true when only the zone changes at the same date and time', async () => {
      await vm.start(original);
      await vm.setDate(new Date(2026, 10, 12));
      vm.selectSlot('trainer1', '09:00');
      vm.setZone('gabinete');

      expect(vm.canConfirm).toBe(true);
    });
  });

  describe('confirm', () => {
    it('reschedules through the gateway with the chosen slot and the browser time zone, then closes', async () => {
      await fillSelection();

      const ok = await vm.confirm();

      expect(ok).toBe(true);
      expect(mockCommands.reschedule).toHaveBeenCalledWith({
        bookingId: 'b1',
        trainerId: 'trainer2',
        date: '2026-11-14',
        time: '11:00',
        zone: 'gabinete',
        timeZone: 'America/Lima',
      });
      expect(vm.target).toBeNull();
      expect(vm.isOpen).toBe(false);
      expect(vm.error).toBeNull();
      expect(vm.isSubmitting).toBe(false);
    });

    it('returns false with a message and does not call the backend when data is missing', async () => {
      await vm.start(original);

      const ok = await vm.confirm();

      expect(ok).toBe(false);
      expect(vm.error).toBe('Faltan datos para reprogramar la cita');
      expect(mockCommands.reschedule).not.toHaveBeenCalled();
    });

    it('ignores repeated calls while a request is in flight (double click)', async () => {
      await fillSelection();
      let release: (b: Booking) => void = () => {};
      mockCommands.reschedule.mockReturnValue(new Promise<Booking>((resolve) => { release = resolve; }));

      const first = vm.confirm();
      expect(vm.isSubmitting).toBe(true);
      const second = await vm.confirm();

      expect(second).toBe(false);
      release(original);
      await first;
      expect(mockCommands.reschedule).toHaveBeenCalledTimes(1);
    });

    it('shows the backend message and keeps the dialog open when it fails', async () => {
      await fillSelection();
      mockCommands.reschedule.mockRejectedValue(new Error('Solo puedes reprogramar con al menos 1 hora de anticipación'));

      const ok = await vm.confirm();

      expect(ok).toBe(false);
      expect(vm.error).toBe('Solo puedes reprogramar con al menos 1 hora de anticipación');
      expect(vm.isOpen).toBe(true);
      expect(vm.isSubmitting).toBe(false);
    });

    it('allows trying again after a failure', async () => {
      await fillSelection();
      mockCommands.reschedule.mockRejectedValueOnce(new Error('falló'));
      await vm.confirm();

      const ok = await vm.confirm();

      expect(ok).toBe(true);
      expect(mockCommands.reschedule).toHaveBeenCalledTimes(2);
      expect(vm.error).toBeNull();
    });

    it('falls back to a generic message for non-Error rejections', async () => {
      await fillSelection();
      mockCommands.reschedule.mockRejectedValue('nope');

      await vm.confirm();

      expect(vm.error).toBe('No se pudo reprogramar la cita');
    });
  });

  describe('close', () => {
    it('closes and resets the selection', async () => {
      await fillSelection();

      vm.close();

      expect(vm.isOpen).toBe(false);
      expect(vm.target).toBeNull();
      expect(vm.selectedDate).toBeNull();
      expect(vm.selectedZone).toBeNull();
    });

    it('does nothing while a request is in flight', async () => {
      await fillSelection();
      let release: (b: Booking) => void = () => {};
      mockCommands.reschedule.mockReturnValue(new Promise<Booking>((resolve) => { release = resolve; }));
      const pending = vm.confirm();

      vm.close();

      expect(vm.isOpen).toBe(true);
      release(original);
      await pending;
    });
  });

  it('clearError removes the message', async () => {
    await vm.start(original);
    await vm.confirm();
    expect(vm.error).not.toBeNull();

    vm.clearError();

    expect(vm.error).toBeNull();
  });
});
