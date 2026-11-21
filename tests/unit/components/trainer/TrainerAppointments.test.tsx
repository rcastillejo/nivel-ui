import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Booking } from '@/core/types';

vi.mock('@/core/providers/ViewModelProvider', () => ({
  useClientViewModel: vi.fn(),
  useTrainerViewModel: vi.fn(),
}));

vi.mock('@/core/providers/AuthProvider', () => ({
  useAuthViewModel: vi.fn(),
}));

import { useClientViewModel, useTrainerViewModel } from '@/core/providers/ViewModelProvider';
import { useAuthViewModel } from '@/core/providers/AuthProvider';
import TrainerAppointments from '@/components/trainer/TrainerAppointments';

function makeBooking(overrides: Partial<Booking>): Booking {
  return {
    id: 'b1',
    clientId: 'client1',
    trainerId: 'trainer-ricardo',
    trainerName: 'Entrenador Ricardo',
    date: new Date(),
    time: '10:00',
    duration: 60,
    zone: 'gym',
    status: 'confirmed',
    ...overrides,
  } as Booking;
}

function mockViewModels(trainerAppointments: Booking[], allBookings: Booking[]) {
  const trainerVM = {
    bookings: allBookings,
    trainerAppointments,
    isLoading: false,
    selectedTrainerId: 'trainer-ricardo',
    loadAllBookings: vi.fn(),
    loadCurrentTrainer: vi.fn(),
  } as unknown as ReturnType<typeof useTrainerViewModel>;
  vi.mocked(useTrainerViewModel).mockReturnValue(trainerVM);

  vi.mocked(useClientViewModel).mockReturnValue({
    clients: [{ id: 'client1' }],
    isLoading: false,
    loadClients: vi.fn(),
    getClientName: vi.fn(() => 'Cliente Prueba'),
  } as unknown as ReturnType<typeof useClientViewModel>);

  vi.mocked(useAuthViewModel).mockReturnValue({
    currentUser: { id: 'auth-ricardo', email: 'ricardo@nivel.gym', role: 'trainer' },
  } as ReturnType<typeof useAuthViewModel>);

  return trainerVM;
}

describe('TrainerAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resuelve el entrenador conectado con la sesión antes de mostrar citas', () => {
    const trainerVM = mockViewModels([], []);

    render(<TrainerAppointments />);

    expect(trainerVM.loadCurrentTrainer).toHaveBeenCalledWith('auth-ricardo');
  });

  it('muestra solo las citas del entrenador conectado, no las de otros entrenadores', () => {
    const mine = makeBooking({ id: 'mia', time: '10:00' });
    const fromDiego = makeBooking({ id: 'de-diego', trainerId: 'trainer-diego', time: '07:00' });
    mockViewModels([mine], [fromDiego, mine]);

    render(<TrainerAppointments />);

    expect(screen.getAllByText('10:00').length).toBeGreaterThan(0);
    expect(screen.queryByText('07:00')).toBeNull();
  });
});
