import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientAppointmentsViewModel } from '@/core/view-models/ClientAppointmentsViewModel';
import { BookingModel } from '@/core/models/BookingModel';
import { Booking } from '@/core/types';
import { BookingValidationError } from '@/core/types/errors';

const mockBookingModel = {
  getClientAppointments: vi.fn(),
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
    vm = new ClientAppointmentsViewModel(mockBookingModel as unknown as BookingModel, () => fixedNow);
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
});
