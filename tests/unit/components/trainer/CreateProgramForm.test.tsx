import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/core/providers/ViewModelProvider', () => ({
  useProgramViewModel: vi.fn(),
  useClientViewModel: vi.fn(),
  useTrainerViewModel: vi.fn(),
}));

vi.mock('@/core/providers/AuthProvider', () => ({
  useAuthViewModel: vi.fn(),
}));

import { useProgramViewModel, useClientViewModel, useTrainerViewModel } from '@/core/providers/ViewModelProvider';
import { useAuthViewModel } from '@/core/providers/AuthProvider';
import CreateProgramForm from '@/components/trainer/CreateProgramForm';

function mockProgramVM(overrides: Partial<ReturnType<typeof useProgramViewModel>> = {}) {
  const vm = {
    formData: {
      name: '',
      description: '',
      trainerId: '',
      clientIds: [],
      startDate: null,
      endDate: null,
      totalSessions: 0,
    },
    isLoading: false,
    error: null,
    showSuccessModal: false,
    createdProgram: null,
    canCreateProgram: false,
    setFormTrainerId: vi.fn(),
    setFormName: vi.fn(),
    setFormDescription: vi.fn(),
    setFormClientIds: vi.fn(),
    setFormStartDate: vi.fn(),
    setFormEndDate: vi.fn(),
    setFormTotalSessions: vi.fn(),
    resetForm: vi.fn(),
    clearError: vi.fn(),
    createProgram: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useProgramViewModel>;
  vi.mocked(useProgramViewModel).mockReturnValue(vm);
  return vm;
}

function mockClientVM() {
  const vm = {
    clients: [],
    getClientNames: vi.fn(),
  } as unknown as ReturnType<typeof useClientViewModel>;
  vi.mocked(useClientViewModel).mockReturnValue(vm);
  return vm;
}

// programs.trainer_id is a FK to public.trainers(id), never the Supabase auth
// user id, so selectedTrainerId (the resolved trainers.id row) must be a
// distinct value from the auth user id in these tests — otherwise a
// regression to stamping the raw auth id would go undetected.
function mockTrainerVM(selectedTrainerId: string | null) {
  const vm = {
    selectedTrainerId,
    loadCurrentTrainer: vi.fn(),
  } as unknown as ReturnType<typeof useTrainerViewModel>;
  vi.mocked(useTrainerViewModel).mockReturnValue(vm);
  return vm;
}

function mockAuthenticatedTrainer(id: string) {
  vi.mocked(useAuthViewModel).mockReturnValue({
    currentUser: { id, email: 'trainer@nivel.gym', role: 'trainer' },
  } as ReturnType<typeof useAuthViewModel>);
}

// ---------------------------------------------------------------------------
// Regression test for issue #164/#167: the "create program" form must resolve
// the real trainers.id row (via TrainerViewModel.loadCurrentTrainer) and stamp
// that — not the raw Supabase auth user id — onto every new program, since
// programs.trainer_id is a FK to public.trainers(id). Auth user id and
// trainer row id are independently-generated random UUIDs in these tests, so
// a regression to either a fixed literal or the raw auth id fails immediately.
// ---------------------------------------------------------------------------

describe('CreateProgramForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the trainer row via loadCurrentTrainer using the session auth id', () => {
    const authUserId = crypto.randomUUID();
    const trainerRowId = crypto.randomUUID();
    mockAuthenticatedTrainer(authUserId);
    const trainerVM = mockTrainerVM(trainerRowId);
    mockProgramVM();
    mockClientVM();

    render(<CreateProgramForm />);

    expect(trainerVM.loadCurrentTrainer).toHaveBeenCalledWith(authUserId);
  });

  it('stamps the resolved trainers.id row (not the raw auth user id) onto the form on mount', () => {
    const authUserId = crypto.randomUUID();
    const trainerRowId = crypto.randomUUID();
    mockAuthenticatedTrainer(authUserId);
    mockTrainerVM(trainerRowId);
    const programVM = mockProgramVM();
    mockClientVM();

    render(<CreateProgramForm />);

    expect(programVM.setFormTrainerId).toHaveBeenCalledWith(trainerRowId);
    expect(programVM.setFormTrainerId).not.toHaveBeenCalledWith(authUserId);
    expect(programVM.setFormTrainerId).not.toHaveBeenCalledWith('trainer1');
  });

  it('stamps a different, independently-generated trainer row id on another run', () => {
    const authUserId = crypto.randomUUID();
    const anotherTrainerRowId = crypto.randomUUID();
    mockAuthenticatedTrainer(authUserId);
    mockTrainerVM(anotherTrainerRowId);
    const programVM = mockProgramVM();
    mockClientVM();

    render(<CreateProgramForm />);

    expect(programVM.setFormTrainerId).toHaveBeenCalledWith(anotherTrainerRowId);
  });

  it('renders a pending state instead of the form while the trainer row has not resolved yet', () => {
    const authUserId = crypto.randomUUID();
    mockAuthenticatedTrainer(authUserId);
    mockTrainerVM(null);
    const programVM = mockProgramVM();
    mockClientVM();

    render(<CreateProgramForm />);

    expect(programVM.setFormTrainerId).not.toHaveBeenCalled();
    expect(screen.getByTestId('create-program-trainer-pending')).toBeInTheDocument();
    expect(screen.queryByTestId('create-program-form')).not.toBeInTheDocument();
  });

  it('surfaces the trainer resolution error instead of the form when the trainer lookup fails', () => {
    const authUserId = crypto.randomUUID();
    mockAuthenticatedTrainer(authUserId);
    vi.mocked(useTrainerViewModel).mockReturnValue({
      selectedTrainerId: null,
      error: 'No se encontró un entrenador asociado a este usuario',
      loadCurrentTrainer: vi.fn(),
    } as unknown as ReturnType<typeof useTrainerViewModel>);
    mockProgramVM();
    mockClientVM();

    render(<CreateProgramForm />);

    expect(screen.getByTestId('create-program-trainer-pending')).toHaveTextContent(
      'No se encontró un entrenador asociado a este usuario'
    );
  });

  it('re-stamps the same resolved trainer row id after clearing the form', async () => {
    const authUserId = crypto.randomUUID();
    const trainerRowId = crypto.randomUUID();
    mockAuthenticatedTrainer(authUserId);
    mockTrainerVM(trainerRowId);
    const programVM = mockProgramVM();
    mockClientVM();

    const user = userEvent.setup();
    render(<CreateProgramForm />);

    await user.click(screen.getByTestId('btn-clear-form'));

    expect(programVM.resetForm).toHaveBeenCalled();
    // Every setFormTrainerId call — the initial mount and the post-clear
    // reset — must use the same resolved trainer row id, never a literal.
    vi.mocked(programVM.setFormTrainerId).mock.calls.forEach((call) => {
      expect(call[0]).toBe(trainerRowId);
    });
  });
});
