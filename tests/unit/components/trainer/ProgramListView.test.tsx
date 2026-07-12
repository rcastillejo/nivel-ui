import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Program } from '@/core/types';

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
import ProgramListView from '@/components/trainer/ProgramListView';

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'prog1',
    name: 'Plan Test',
    description: 'desc',
    trainerId: 'irrelevant',
    clientIds: ['client1'],
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 3, 1),
    totalSessions: 10,
    usedSessions: 2,
    status: 'active',
    ...overrides,
  };
}

function mockProgramVM(overrides: Partial<ReturnType<typeof useProgramViewModel>> = {}) {
  const vm = {
    programs: [],
    isLoading: false,
    error: null,
    loadPrograms: vi.fn(),
    renewProgram: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as ReturnType<typeof useProgramViewModel>;
  vi.mocked(useProgramViewModel).mockReturnValue(vm);
  return vm;
}

function mockClientVM() {
  const vm = {
    clients: [],
    getClientNames: vi.fn((ids: string[]) => ids.join(', ')),
  } as unknown as ReturnType<typeof useClientViewModel>;
  vi.mocked(useClientViewModel).mockReturnValue(vm);
  return vm;
}

// programs.trainer_id is a FK to public.trainers(id), never the Supabase auth
// user id, so selectedTrainerId (the resolved trainers.id row) must be a
// distinct value from the auth user id in these tests — otherwise a
// regression to fetching with the raw auth id would go undetected.
function mockTrainerVM(selectedTrainerId: string) {
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
// Regression test for issue #164/#167: a component must never fetch programs
// using a fixed/hardcoded trainer id, nor the raw Supabase auth user id
// (programs.trainer_id is a FK to public.trainers(id), a distinct row). Auth
// user id and resolved trainer row id are independently-generated random
// UUIDs in these tests, so a regression to either a literal or the raw auth
// id fails immediately instead of silently matching a fixture.
// ---------------------------------------------------------------------------

describe('ProgramListView', () => {
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

    render(<ProgramListView />);

    expect(trainerVM.loadCurrentTrainer).toHaveBeenCalledWith(authUserId);
  });

  it('loads programs using the resolved trainers.id row, not the raw auth user id or a hardcoded value', () => {
    const authUserId = crypto.randomUUID();
    const trainerRowId = crypto.randomUUID();
    mockAuthenticatedTrainer(authUserId);
    mockTrainerVM(trainerRowId);
    const programVM = mockProgramVM();
    mockClientVM();

    render(<ProgramListView />);

    expect(programVM.loadPrograms).toHaveBeenCalledWith(trainerRowId);
    expect(programVM.loadPrograms).not.toHaveBeenCalledWith(authUserId);
    expect(programVM.loadPrograms).not.toHaveBeenCalledWith('trainer1');
  });

  it('re-fetches with whatever resolved trainer row id is active on a second, independently-generated run', () => {
    // Independently generated from the id above — proves the component reads
    // the resolved trainer id dynamically rather than caching/hardcoding a
    // value that happened to work once.
    const authUserId = crypto.randomUUID();
    const anotherTrainerRowId = crypto.randomUUID();
    mockAuthenticatedTrainer(authUserId);
    mockTrainerVM(anotherTrainerRowId);
    const programVM = mockProgramVM();
    mockClientVM();

    render(<ProgramListView />);

    expect(programVM.loadPrograms).toHaveBeenCalledWith(anotherTrainerRowId);
  });

  it('reloads programs with the same resolved trainer row id after renewing a program', async () => {
    const authUserId = crypto.randomUUID();
    const trainerRowId = crypto.randomUUID();
    mockAuthenticatedTrainer(authUserId);
    mockTrainerVM(trainerRowId);
    const activeProgram = makeProgram();
    const programVM = mockProgramVM({ programs: [activeProgram] });
    mockClientVM();

    const user = userEvent.setup();
    render(<ProgramListView />);

    await user.click(screen.getByTestId(`renew-program-btn-${activeProgram.id}`));
    await user.click(screen.getByTestId('renew-modal-submit'));

    // Every loadPrograms call — the initial mount fetch and the post-renew
    // refresh — must use the same resolved trainer row id, never a literal.
    await waitFor(() => {
      expect(programVM.loadPrograms).toHaveBeenCalledTimes(2);
    });
    vi.mocked(programVM.loadPrograms).mock.calls.forEach((call) => {
      expect(call[0]).toBe(trainerRowId);
    });
  });
});
