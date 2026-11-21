import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RescheduleDialog from '@/components/client/RescheduleDialog';
import { Booking, Trainer, ZoneType } from '@/core/types';

vi.mock('@/core/providers/ViewModelProvider', () => ({
  useRescheduleViewModel: vi.fn(),
  useProgramViewModel: vi.fn(),
}));

// El calendario real usa react-datepicker; aquí basta un botón que elige una fecha
vi.mock('@/components/CalendarStep', () => ({
  default: ({ onDateSelect }: { onDateSelect: (d: Date) => void }) => (
    <button type="button" data-testid="calendar-stub" onClick={() => onDateSelect(new Date(2026, 10, 14))}>
      calendario
    </button>
  ),
}));

import { useRescheduleViewModel, useProgramViewModel } from '@/core/providers/ViewModelProvider';

const setDate = vi.fn();
const selectSlot = vi.fn();
const setZone = vi.fn();
const clearSlot = vi.fn();
const confirm = vi.fn();
const close = vi.fn();
const onRescheduled = vi.fn();

const diego: Trainer = { id: 't1', userId: 'u1', name: 'Diego', availableSlots: ['09:00'] };
const ana: Trainer = { id: 't2', userId: 'u2', name: 'Ana', availableSlots: ['11:00'] };

const current: Booking = {
  id: 'b1',
  clientId: 'u1',
  trainerId: 't1',
  trainerName: 'Entrenador Diego',
  date: new Date(2026, 10, 12),
  time: '09:00',
  duration: 60,
  zone: 'gym',
  status: 'confirmed',
};

function mockVm(state: {
  target?: Booking | null;
  selectedDate?: Date | null;
  selectedTrainerName?: string | null;
  selectedTime?: string | null;
  selectedZone?: ZoneType | null;
  canConfirm?: boolean;
  isSubmitting?: boolean;
  isLoading?: boolean;
  error?: string | null;
}) {
  vi.mocked(useRescheduleViewModel).mockReturnValue({
    target: state.target === undefined ? current : state.target,
    isOpen: (state.target === undefined ? current : state.target) !== null,
    trainers: [diego, ana],
    availableSlotsByTrainer: { t1: ['09:00', '10:00'], t2: ['11:00'] },
    bookings: [],
    selectedDate: state.selectedDate ?? null,
    selectedTrainerName: state.selectedTrainerName ?? null,
    selectedTime: state.selectedTime ?? null,
    selectedZone: state.selectedZone ?? null,
    canConfirm: state.canConfirm ?? false,
    isSubmitting: state.isSubmitting ?? false,
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
    setDate,
    selectSlot,
    setZone,
    clearSlot,
    confirm,
    close,
  } as unknown as ReturnType<typeof useRescheduleViewModel>);
}

describe('RescheduleDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirm.mockResolvedValue(true);
    vi.mocked(useProgramViewModel).mockReturnValue({
      hasActiveProgram: true,
      activeProgramPendingSessions: 5,
    } as unknown as ReturnType<typeof useProgramViewModel>);
  });

  it('renders nothing when there is no appointment to reschedule', () => {
    mockVm({ target: null });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);

    expect(screen.queryByTestId('reschedule-dialog')).toBeNull();
  });

  it('is an accessible modal dialog that shows the current appointment', () => {
    mockVm({});

    render(<RescheduleDialog onRescheduled={onRescheduled} />);

    const dialog = screen.getByTestId('reschedule-dialog');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Reprogramar cita' })).toBeInTheDocument();
    const summary = screen.getByTestId('reschedule-current');
    expect(summary).toHaveTextContent('09:00');
    expect(summary).toHaveTextContent('Entrenador Diego');
    expect(summary).toHaveTextContent('Gym');
  });

  it('shows the calendar first and the slots only after a date is chosen', () => {
    mockVm({});

    render(<RescheduleDialog onRescheduled={onRescheduled} />);

    expect(screen.getByTestId('calendar-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('time-slot-t1-09:00')).toBeNull();
  });

  it('asks the view model to load the date picked in the calendar', () => {
    mockVm({});

    render(<RescheduleDialog onRescheduled={onRescheduled} />);
    fireEvent.click(screen.getByTestId('calendar-stub'));

    expect(setDate).toHaveBeenCalledWith(new Date(2026, 10, 14));
  });

  it('lists the slots of the chosen date and selects one by trainer id', () => {
    mockVm({ selectedDate: new Date(2026, 10, 14) });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);
    fireEvent.click(screen.getByTestId('time-slot-t2-11:00'));

    expect(selectSlot).toHaveBeenCalledWith('t2', '11:00');
  });

  it('lets the user choose the zone and go back to change the selection', () => {
    mockVm({ selectedDate: new Date(2026, 10, 14), selectedTrainerName: 'Entrenador Ana', selectedTime: '11:00' });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);
    fireEvent.click(screen.getByTestId('zone-gabinete'));
    fireEvent.click(screen.getByTestId('time-selection-back'));

    expect(setZone).toHaveBeenCalledWith('gabinete');
    expect(clearSlot).toHaveBeenCalledTimes(1);
  });

  it('uses rescheduling wording and does not show the program session info', () => {
    mockVm({ selectedDate: new Date(2026, 10, 14), selectedTrainerName: 'Entrenador Ana', selectedTime: '11:00', canConfirm: true });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);

    expect(screen.getByTestId('time-selection-confirm')).toHaveTextContent('Confirmar cambio');
    expect(screen.queryByText('¡Perfecto! Solo falta confirmar tu reserva')).toBeNull();
    expect(screen.queryByText('Mi Programa:')).toBeNull();
  });

  it('confirms through the view model and tells the view when it worked', async () => {
    mockVm({ selectedDate: new Date(2026, 10, 14), selectedTrainerName: 'Entrenador Ana', selectedTime: '11:00', selectedZone: 'gabinete', canConfirm: true });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);
    fireEvent.click(screen.getByTestId('time-selection-confirm'));

    await waitFor(() => expect(onRescheduled).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('does not tell the view when the reschedule failed', async () => {
    confirm.mockResolvedValue(false);
    mockVm({ selectedDate: new Date(2026, 10, 14), selectedTrainerName: 'Entrenador Ana', selectedTime: '11:00', selectedZone: 'gabinete', canConfirm: true });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);
    fireEvent.click(screen.getByTestId('time-selection-confirm'));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(onRescheduled).not.toHaveBeenCalled();
  });

  it('disables confirming while something is missing', () => {
    mockVm({ selectedDate: new Date(2026, 10, 14), selectedTrainerName: 'Entrenador Ana', selectedTime: '11:00', canConfirm: false });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);

    expect(screen.getByTestId('time-selection-confirm')).toBeDisabled();
  });

  it('disables confirming and closing and shows progress while the request runs', () => {
    mockVm({
      selectedDate: new Date(2026, 10, 14),
      selectedTrainerName: 'Entrenador Ana',
      selectedTime: '11:00',
      selectedZone: 'gabinete',
      canConfirm: true,
      isSubmitting: true,
    });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);

    expect(screen.getByTestId('time-selection-confirm')).toBeDisabled();
    expect(screen.getByTestId('time-selection-confirm')).toHaveTextContent('Guardando...');
    expect(screen.getByTestId('reschedule-close')).toBeDisabled();
  });

  it('shows the error without hiding the dialog', () => {
    mockVm({ error: 'Solo puedes reprogramar con al menos 1 hora de anticipación' });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);

    expect(screen.getByTestId('reschedule-error')).toHaveTextContent('Solo puedes reprogramar con al menos 1 hora');
    expect(screen.getByTestId('reschedule-dialog')).toBeInTheDocument();
  });

  it('shows a loading message while the availability is requested', () => {
    mockVm({ isLoading: true });

    render(<RescheduleDialog onRescheduled={onRescheduled} />);

    expect(screen.getByTestId('reschedule-loading')).toBeInTheDocument();
  });

  it('closes through the view model', () => {
    mockVm({});

    render(<RescheduleDialog onRescheduled={onRescheduled} />);
    fireEvent.click(screen.getByTestId('reschedule-close'));

    expect(close).toHaveBeenCalledTimes(1);
  });
});
