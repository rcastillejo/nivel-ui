import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientAppointmentsViewModel } from '@/core/view-models/ClientAppointmentsViewModel';
import { BookingModel } from '@/core/models/BookingModel';
import { IBookingCommands } from '@/core/repositories';
import { Booking } from '@/core/types';
import { BookingValidationError } from '@/core/types/errors';

const mockBookingModel = {
  getClientAppointments: vi.fn(),
  canCancel: vi.fn(),
};

const mockCommands = {
  create: vi.fn(),
  cancel: vi.fn(),
};

const fixedNow = new Date(2026, 10, 10, 9, 30);

function makeBooking(id: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    clientId: 'client1',
    trainerId: 'trainer1',
    trainerName: 'Entrenador John',
    date: new Date(2026, 10, 12),
    time: '09:00',
    duration: 60,
    zone: 'gym',
    status: 'confirmed',
    ...overrides,
  };
}

describe('ClientAppointmentsViewModel', () => {
  let vm: ClientAppointmentsViewModel;

  beforeEach(() => {
    vi.clearAllMocks();
    vm = new ClientAppointmentsViewModel(mockBookingModel as unknown as BookingModel, mockCommands as IBookingCommands, () => fixedNow);
  });

  it('starts empty, not loading and without error', () => {
    expect(vm.upcoming).toEqual([]);
    expect(vm.past).toEqual([]);
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBeNull();
    expect(vm.isEmpty).toBe(true);
  });

  it('loads appointments using the injected clock', async () => {
    const upcoming = [makeBooking('u1')];
    const past = [makeBooking('p1', { date: new Date(2026, 10, 1) })];
    mockBookingModel.getClientAppointments.mockResolvedValue({ upcoming, past });

    await vm.load('client1');

    expect(mockBookingModel.getClientAppointments).toHaveBeenCalledWith('client1', fixedNow);
    expect(vm.upcoming).toEqual(upcoming);
    expect(vm.past).toEqual(past);
    expect(vm.hasUpcoming).toBe(true);
    expect(vm.hasPast).toBe(true);
    expect(vm.isEmpty).toBe(false);
    expect(vm.error).toBeNull();
  });

  it('is loading while the request is in flight', async () => {
    let resolve: (value: { upcoming: Booking[]; past: Booking[] }) => void = () => {};
    mockBookingModel.getClientAppointments.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );

    const loading = vm.load('client1');
    expect(vm.isLoading).toBe(true);

    resolve({ upcoming: [], past: [] });
    await loading;

    expect(vm.isLoading).toBe(false);
  });

  it('translates a domain error into a UI message and clears the lists', async () => {
    mockBookingModel.getClientAppointments.mockResolvedValueOnce({
      upcoming: [makeBooking('u1')],
      past: [],
    });
    await vm.load('client1');

    mockBookingModel.getClientAppointments.mockRejectedValueOnce(
      new BookingValidationError('El cliente es requerido')
    );
    await vm.load('');

    expect(vm.error).toBe('El cliente es requerido');
    expect(vm.upcoming).toEqual([]);
    expect(vm.past).toEqual([]);
    expect(vm.isLoading).toBe(false);
  });

  it('falls back to a generic message for non-Error rejections', async () => {
    mockBookingModel.getClientAppointments.mockRejectedValue('boom');

    await vm.load('client1');

    expect(vm.error).toBe('No se pudieron cargar tus citas');
  });

  it('clears the error on a new successful load', async () => {
    mockBookingModel.getClientAppointments.mockRejectedValueOnce(new Error('falló'));
    await vm.load('client1');
    expect(vm.error).toBe('falló');

    mockBookingModel.getClientAppointments.mockResolvedValueOnce({ upcoming: [], past: [] });
    await vm.load('client1');

    expect(vm.error).toBeNull();
  });

  describe('cancelling an appointment', () => {
    const upcoming = makeBooking('b1');
    const cancelledCopy = { ...upcoming, status: 'cancelled' as const };

    beforeEach(async () => {
      mockBookingModel.getClientAppointments.mockResolvedValue({ upcoming: [upcoming], past: [] });
      await vm.load('client1');
      mockBookingModel.getClientAppointments.mockClear();
    });

    it('canCancel delegates the rule to the model with the injected clock', () => {
      mockBookingModel.canCancel.mockReturnValue(true);

      expect(vm.canCancel(upcoming)).toBe(true);
      expect(mockBookingModel.canCancel).toHaveBeenCalledWith(upcoming, fixedNow);
    });

    it('explains the minimum notice of the booking zone', () => {
      expect(vm.cancellationNotice(upcoming)).toContain('1 hora');
      expect(vm.cancellationNotice({ ...upcoming, zone: 'gabinete' })).toContain('24 horas');
    });

    it('requestCancel opens the confirmation and dismissCancel closes it', () => {
      vm.requestCancel(upcoming);
      expect(vm.cancelTarget).toEqual(upcoming);

      vm.dismissCancel();
      expect(vm.cancelTarget).toBeNull();
      expect(vm.cancelError).toBeNull();
    });

    it('confirmCancel cancels through the gateway, closes the dialog and refreshes the lists', async () => {
      mockCommands.cancel.mockResolvedValue(cancelledCopy);
      mockBookingModel.getClientAppointments.mockResolvedValue({ upcoming: [], past: [cancelledCopy] });
      vm.requestCancel(upcoming);

      const ok = await vm.confirmCancel();

      expect(ok).toBe(true);
      expect(mockCommands.cancel).toHaveBeenCalledWith('b1');
      expect(vm.cancelTarget).toBeNull();
      expect(vm.cancellingId).toBeNull();
      expect(vm.upcoming).toEqual([]);
      expect(vm.past).toEqual([cancelledCopy]);
      expect(vm.error).toBeNull();
    });

    it('refreshes without showing the full-page loading state', async () => {
      mockCommands.cancel.mockResolvedValue(cancelledCopy);
      mockBookingModel.getClientAppointments.mockResolvedValue({ upcoming: [], past: [cancelledCopy] });
      vm.requestCancel(upcoming);

      const pending = vm.confirmCancel();
      expect(vm.cancellingId).toBe('b1');
      expect(vm.isLoading).toBe(false);
      await pending;
    });

    it('keeps the dialog open and shows the backend message when cancelling fails', async () => {
      mockCommands.cancel.mockRejectedValue(new Error('Solo puedes cancelar con al menos 1 hora de anticipación'));
      vm.requestCancel(upcoming);

      const ok = await vm.confirmCancel();

      expect(ok).toBe(false);
      expect(vm.cancelError).toBe('Solo puedes cancelar con al menos 1 hora de anticipación');
      expect(vm.cancelTarget).toEqual(upcoming);
      expect(vm.cancellingId).toBeNull();
      expect(vm.upcoming).toEqual([upcoming]); // la lista no se pierde
      expect(vm.error).toBeNull();
    });

    it('does nothing when there is no cancellation in progress', async () => {
      expect(await vm.confirmCancel()).toBe(false);
      expect(mockCommands.cancel).not.toHaveBeenCalled();
    });

    it('ignores a second confirmation while one is running (double click)', async () => {
      let resolveCancel: (b: Booking) => void = () => {};
      mockCommands.cancel.mockReturnValue(new Promise<Booking>((r) => { resolveCancel = r; }));
      mockBookingModel.getClientAppointments.mockResolvedValue({ upcoming: [], past: [cancelledCopy] });
      vm.requestCancel(upcoming);

      const first = vm.confirmCancel();
      const second = await vm.confirmCancel();
      resolveCancel(cancelledCopy);
      await first;

      expect(second).toBe(false);
      expect(mockCommands.cancel).toHaveBeenCalledTimes(1);
    });

    it('clears a previous cancel error when a new cancellation is requested', async () => {
      mockCommands.cancel.mockRejectedValue(new Error('x'));
      vm.requestCancel(upcoming);
      await vm.confirmCancel();
      expect(vm.cancelError).toBe('x');

      vm.dismissCancel();
      vm.requestCancel(upcoming);

      expect(vm.cancelError).toBeNull();
    });
  });
});
