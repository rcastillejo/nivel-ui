import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClientAppointmentsView from '@/components/client/ClientAppointmentsView';
import { Booking } from '@/core/types';

vi.mock('@/core/providers/AuthProvider', () => ({
  useAuthViewModel: vi.fn(),
}));

vi.mock('@/core/providers/ViewModelProvider', () => ({
  useClientAppointmentsViewModel: vi.fn(),
}));

import { useAuthViewModel } from '@/core/providers/AuthProvider';
import { useClientAppointmentsViewModel } from '@/core/providers/ViewModelProvider';

const load = vi.fn();
const requestCancel = vi.fn();
const dismissCancel = vi.fn();
const confirmCancel = vi.fn();

function booking(id: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    clientId: 'u1',
    trainerId: 't1',
    trainerName: 'Diego Lamas',
    date: new Date(2026, 10, 12),
    time: '09:00',
    duration: 60,
    zone: 'gym',
    status: 'confirmed',
    ...overrides,
  };
}

function mockVm(state: {
  upcoming?: Booking[];
  past?: Booking[];
  isLoading?: boolean;
  error?: string | null;
  cancellable?: string[];
  cancelTarget?: Booking | null;
  cancellingId?: string | null;
  cancelError?: string | null;
}) {
  const upcoming = state.upcoming ?? [];
  const past = state.past ?? [];
  vi.mocked(useClientAppointmentsViewModel).mockReturnValue({
    upcoming,
    past,
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
    hasUpcoming: upcoming.length > 0,
    hasPast: past.length > 0,
    isEmpty: upcoming.length === 0 && past.length === 0,
    load,
    canCancel: (b: Booking) => (state.cancellable ?? []).includes(b.id),
    cancellationNotice: () => 'Solo se puede cancelar con al menos 1 hora de anticipación (Gym)',
    cancelTarget: state.cancelTarget ?? null,
    cancellingId: state.cancellingId ?? null,
    cancelError: state.cancelError ?? null,
    requestCancel,
    dismissCancel,
    confirmCancel,
  } as unknown as ReturnType<typeof useClientAppointmentsViewModel>);
}

describe('ClientAppointmentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthViewModel).mockReturnValue({
      currentUser: { id: 'u1', email: 'c@nivel.gym', role: 'client' },
    } as ReturnType<typeof useAuthViewModel>);
  });

  it('loads the appointments of the authenticated client', () => {
    mockVm({});

    render(<ClientAppointmentsView />);

    expect(load).toHaveBeenCalledWith('u1');
  });

  it('does not load when there is no authenticated user', () => {
    vi.mocked(useAuthViewModel).mockReturnValue({
      currentUser: null,
    } as ReturnType<typeof useAuthViewModel>);
    mockVm({});

    render(<ClientAppointmentsView />);

    expect(load).not.toHaveBeenCalled();
  });

  it('shows the loading state', () => {
    mockVm({ isLoading: true });

    render(<ClientAppointmentsView />);

    expect(screen.getByTestId('appointments-loading')).toBeInTheDocument();
  });

  it('shows the error message', () => {
    mockVm({ error: 'No se pudieron cargar tus citas' });

    render(<ClientAppointmentsView />);

    expect(screen.getByTestId('appointments-error')).toHaveTextContent(
      'No se pudieron cargar tus citas'
    );
    expect(screen.queryByTestId('appointments-upcoming')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no appointments', () => {
    mockVm({});

    render(<ClientAppointmentsView />);

    expect(screen.getByTestId('appointments-empty')).toBeInTheDocument();
  });

  it('renders upcoming appointments with trainer, time and status', () => {
    mockVm({ upcoming: [booking('b1')] });

    render(<ClientAppointmentsView />);

    const section = screen.getByTestId('appointments-upcoming');
    expect(within(section).getByTestId('appointment-item-b1')).toHaveTextContent('Diego Lamas');
    expect(within(section).getByTestId('appointment-item-b1')).toHaveTextContent('09:00');
    expect(screen.getByTestId('appointment-status-b1')).toHaveTextContent('Confirmada');
    expect(screen.queryByTestId('appointments-history')).not.toBeInTheDocument();
  });

  it('renders cancelled appointments in the history with the "Cancelada" label', () => {
    mockVm({ past: [booking('b2', { status: 'cancelled' })] });

    render(<ClientAppointmentsView />);

    const section = screen.getByTestId('appointments-history');
    expect(within(section).getByTestId('appointment-item-b2')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-status-b2')).toHaveTextContent('Cancelada');
    expect(screen.queryByTestId('appointments-upcoming')).not.toBeInTheDocument();
  });

  describe('cancelling', () => {
    it('shows a cancel button for cancellable upcoming appointments and opens the confirmation', () => {
      const b = booking('b1');
      mockVm({ upcoming: [b], cancellable: ['b1'] });

      render(<ClientAppointmentsView />);
      fireEvent.click(screen.getByTestId('appointment-cancel-b1'));

      expect(requestCancel).toHaveBeenCalledWith(b);
    });

    it('explains why an upcoming appointment cannot be cancelled', () => {
      mockVm({ upcoming: [booking('b1')], cancellable: [] });

      render(<ClientAppointmentsView />);

      expect(screen.queryByTestId('appointment-cancel-b1')).toBeNull();
      expect(screen.getByTestId('appointment-cancel-blocked-b1')).toHaveTextContent('1 hora de anticipación');
    });

    it('never offers cancelling for history items', () => {
      mockVm({ past: [booking('p1'), booking('p2', { status: 'cancelled' })], cancellable: ['p1', 'p2'] });

      render(<ClientAppointmentsView />);

      expect(screen.queryByTestId('appointment-cancel-p1')).toBeNull();
      expect(screen.queryByTestId('appointment-cancel-blocked-p1')).toBeNull();
      expect(screen.queryByTestId('appointment-cancel-p2')).toBeNull();
    });

    it('does not render the dialog when nothing is being cancelled', () => {
      mockVm({ upcoming: [booking('b1')], cancellable: ['b1'] });

      render(<ClientAppointmentsView />);

      expect(screen.queryByTestId('cancel-dialog')).toBeNull();
    });

    it('shows the confirmation dialog for the selected appointment and confirms or dismisses', () => {
      const b = booking('b1');
      mockVm({ upcoming: [b], cancellable: ['b1'], cancelTarget: b });

      render(<ClientAppointmentsView />);
      const dialog = screen.getByTestId('cancel-dialog');
      expect(dialog).toHaveTextContent('Diego Lamas');

      fireEvent.click(within(dialog).getByTestId('cancel-confirm'));
      expect(confirmCancel).toHaveBeenCalled();

      fireEvent.click(within(dialog).getByTestId('cancel-dismiss'));
      expect(dismissCancel).toHaveBeenCalled();
    });

    it('disables the buttons while the cancellation is running', () => {
      const b = booking('b1');
      mockVm({ upcoming: [b], cancelTarget: b, cancellingId: 'b1' });

      render(<ClientAppointmentsView />);

      expect(screen.getByTestId('cancel-confirm')).toBeDisabled();
      expect(screen.getByTestId('cancel-dismiss')).toBeDisabled();
    });

    it('shows the cancellation error inside the dialog without hiding the lists', () => {
      const b = booking('b1');
      mockVm({ upcoming: [b], cancelTarget: b, cancelError: 'No se pudo cancelar la cita' });

      render(<ClientAppointmentsView />);

      expect(screen.getByTestId('cancel-error')).toHaveTextContent('No se pudo cancelar la cita');
      expect(screen.getByTestId('appointments-upcoming')).toBeInTheDocument();
    });
  });
});
