import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimeSelectionView from '@/components/TimeSelectionView';
import { Booking, ZoneType } from '@/core/types';

vi.mock('@/core/providers/ViewModelProvider', () => ({
  useProgramViewModel: vi.fn(),
}));

import { useProgramViewModel } from '@/core/providers/ViewModelProvider';

const selectedDate = new Date(2026, 10, 12);
const trainers = [
  { id: 't1', name: 'Diego' },
  { id: 't2', name: 'Ana' },
  { id: 't3', name: 'Sin cupos' },
];
const slotsByTrainer = { t1: ['09:00', '10:00'], t2: ['09:00'], t3: [] as string[] };

function booking(id: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    clientId: `c-${id}`,
    trainerId: 't1',
    trainerName: 'Entrenador Diego',
    date: selectedDate,
    time: '09:00',
    duration: 60,
    zone: 'gym',
    status: 'confirmed',
    ...overrides,
  };
}

function renderView(overrides: Partial<React.ComponentProps<typeof TimeSelectionView>> = {}) {
  const props = {
    selectedDate,
    trainers,
    slotsByTrainer,
    bookings: [] as Booking[],
    selectedTrainerName: null as string | null,
    selectedTime: null as string | null,
    selectedZone: null as ZoneType | null,
    onTimeSelect: vi.fn(),
    onZoneSelect: vi.fn(),
    onBack: vi.fn(),
    onConfirm: vi.fn(),
    canConfirm: true,
    isSubmitting: false,
    ...overrides,
  };
  render(<TimeSelectionView {...props} />);
  return props;
}

describe('TimeSelectionView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProgramViewModel).mockReturnValue({
      hasActiveProgram: true,
      activeProgramPendingSessions: 5,
    } as unknown as ReturnType<typeof useProgramViewModel>);
  });

  describe('slots', () => {
    it('lists only the trainers that have slots', () => {
      renderView();

      expect(screen.getByText('Entrenador Diego')).toBeInTheDocument();
      expect(screen.getByText('Entrenador Ana')).toBeInTheDocument();
      expect(screen.queryByText('Entrenador Sin cupos')).not.toBeInTheDocument();
    });

    it('calls onTimeSelect with the trainer label and the time when a slot is clicked', () => {
      const props = renderView();

      fireEvent.click(screen.getByTestId('time-slot-t1-10:00'));

      expect(props.onTimeSelect).toHaveBeenCalledWith('Entrenador Diego', '10:00');
    });

    it('shows the occupancy of both zones in each slot', () => {
      renderView({ bookings: [booking('a'), booking('b'), booking('c')] });

      expect(within(screen.getByTestId('time-slot-t1-09:00')).getByText('3/10')).toBeInTheDocument();
    });

    it('disables a slot when both zones are full', () => {
      const fullGym = Array.from({ length: 10 }, (_, i) => booking(`g${i}`));
      const fullGabinete = booking('gab', { zone: 'gabinete', trainerId: 't2' });
      renderView({ bookings: [...fullGym, fullGabinete] });

      expect(screen.getByTestId('time-slot-t1-09:00')).toBeDisabled();
      expect(screen.getByTestId('time-slot-t1-10:00')).toBeEnabled();
    });

    it('does not disable a slot when only one zone is full', () => {
      renderView({ bookings: [booking('gab', { zone: 'gabinete', trainerId: 't2' })] });

      expect(screen.getByTestId('time-slot-t1-09:00')).toBeEnabled();
    });

    it('ignores cancelled bookings and bookings of other days when counting', () => {
      renderView({
        bookings: [
          booking('x', { status: 'cancelled' }),
          booking('y', { date: new Date(2026, 10, 13) }),
        ],
      });

      expect(within(screen.getByTestId('time-slot-t1-09:00')).getByText('0/10')).toBeInTheDocument();
    });
  });

  describe('confirmation', () => {
    it('is hidden until a trainer and a time are chosen', () => {
      renderView();

      expect(screen.queryByTestId('time-selection-confirm')).not.toBeInTheDocument();
    });

    it('lets the user choose a zone, go back and confirm', () => {
      const props = renderView({ selectedTrainerName: 'Entrenador Diego', selectedTime: '10:00' });

      fireEvent.click(screen.getByTestId('zone-gabinete'));
      fireEvent.click(screen.getByTestId('time-selection-back'));
      fireEvent.click(screen.getByTestId('time-selection-confirm'));

      expect(props.onZoneSelect).toHaveBeenCalledWith('gabinete');
      expect(props.onBack).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('disables the confirm button when it cannot be confirmed', () => {
      renderView({ selectedTrainerName: 'Entrenador Diego', selectedTime: '10:00', canConfirm: false });

      expect(screen.getByTestId('time-selection-confirm')).toBeDisabled();
    });

    it('uses the booking wording by default', () => {
      renderView({ selectedTrainerName: 'Entrenador Diego', selectedTime: '10:00' });

      expect(screen.getByTestId('time-selection-confirm')).toHaveTextContent('Confirmar Reserva');
      expect(screen.getByText('¡Perfecto! Solo falta confirmar tu reserva')).toBeInTheDocument();
    });

    it('shows the submitting label while the request is in flight', () => {
      renderView({ selectedTrainerName: 'Entrenador Diego', selectedTime: '10:00', isSubmitting: true });

      expect(screen.getByTestId('time-selection-confirm')).toHaveTextContent('Confirmando...');
    });

    it('accepts custom wording for other flows such as rescheduling', () => {
      renderView({
        selectedTrainerName: 'Entrenador Diego',
        selectedTime: '10:00',
        isSubmitting: true,
        title: '¿A qué horario quieres mover tu cita?',
        confirmationTitle: 'Solo falta confirmar el cambio',
        confirmLabel: 'Confirmar cambio',
        submittingLabel: 'Guardando...',
      });

      expect(screen.getByText('¿A qué horario quieres mover tu cita?')).toBeInTheDocument();
      expect(screen.getByText('Solo falta confirmar el cambio')).toBeInTheDocument();
      expect(screen.getByTestId('time-selection-confirm')).toHaveTextContent('Guardando...');
    });
  });

  describe('program session info', () => {
    it('is shown by default when the client has an active program', () => {
      renderView({ selectedTrainerName: 'Entrenador Diego', selectedTime: '10:00' });

      expect(screen.getByText('Mi Programa:')).toBeInTheDocument();
    });

    it('can be hidden, since moving a booking does not consume a session', () => {
      renderView({ selectedTrainerName: 'Entrenador Diego', selectedTime: '10:00', showProgramInfo: false });

      expect(screen.queryByText('Mi Programa:')).not.toBeInTheDocument();
    });
  });
});
