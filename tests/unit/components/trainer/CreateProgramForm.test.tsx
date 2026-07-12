import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/core/providers/ViewModelProvider', () => ({
  useProgramViewModel: vi.fn(),
  useClientViewModel: vi.fn(),
}));

vi.mock('@/core/providers/AuthProvider', () => ({
  useAuthViewModel: vi.fn(),
}));

import { useProgramViewModel, useClientViewModel } from '@/core/providers/ViewModelProvider';
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

function mockAuthenticatedTrainer(id: string) {
  vi.mocked(useAuthViewModel).mockReturnValue({
    currentUser: { id, email: 'trainer@nivel.gym', role: 'trainer' },
  } as ReturnType<typeof useAuthViewModel>);
}

// ---------------------------------------------------------------------------
// Regression test for issue #164: the "create program" form must stamp the
// authenticated trainer's real session id onto every new program, never a
// fixed literal. A fresh random UUID is generated per test run, so a
// reintroduced hardcoded value (e.g. "trainer1") fails the assertion
// immediately instead of silently matching a fixture id.
// ---------------------------------------------------------------------------

describe('CreateProgramForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stamps the authenticated trainer id from the session onto the form on mount', () => {
    const randomTrainerId = crypto.randomUUID();
    mockAuthenticatedTrainer(randomTrainerId);
    const programVM = mockProgramVM();
    mockClientVM();

    render(<CreateProgramForm />);

    expect(programVM.setFormTrainerId).toHaveBeenCalledWith(randomTrainerId);
    expect(programVM.setFormTrainerId).not.toHaveBeenCalledWith('trainer1');
  });

  it('stamps a different, independently-generated session id on another run', () => {
    const anotherRandomTrainerId = crypto.randomUUID();
    mockAuthenticatedTrainer(anotherRandomTrainerId);
    const programVM = mockProgramVM();
    mockClientVM();

    render(<CreateProgramForm />);

    expect(programVM.setFormTrainerId).toHaveBeenCalledWith(anotherRandomTrainerId);
  });

  it('re-stamps the same dynamic session id after clearing the form', async () => {
    const randomTrainerId = crypto.randomUUID();
    mockAuthenticatedTrainer(randomTrainerId);
    const programVM = mockProgramVM();
    mockClientVM();

    const user = userEvent.setup();
    render(<CreateProgramForm />);

    await user.click(screen.getByTestId('btn-clear-form'));

    expect(programVM.resetForm).toHaveBeenCalled();
    // Every setFormTrainerId call — the initial mount and the post-clear
    // reset — must use the same dynamic session id, never a literal.
    vi.mocked(programVM.setFormTrainerId).mock.calls.forEach((call) => {
      expect(call[0]).toBe(randomTrainerId);
    });
  });
});
