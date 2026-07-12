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
}));

vi.mock('@/core/providers/AuthProvider', () => ({
  useAuthViewModel: vi.fn(),
}));

import { useProgramViewModel, useClientViewModel } from '@/core/providers/ViewModelProvider';
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

function mockAuthenticatedTrainer(id: string) {
  vi.mocked(useAuthViewModel).mockReturnValue({
    currentUser: { id, email: 'trainer@nivel.gym', role: 'trainer' },
  } as ReturnType<typeof useAuthViewModel>);
}

// ---------------------------------------------------------------------------
// Regression test for issue #164: a component must never fetch programs
// using a fixed/hardcoded trainer id. A fresh random UUID is generated on
// every test run and asserted end-to-end, so any reintroduced literal
// (e.g. "trainer1") fails immediately instead of silently matching a fixture.
// ---------------------------------------------------------------------------

describe('ProgramListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads programs using the authenticated trainer id from the session, not a hardcoded value', () => {
    const randomTrainerId = crypto.randomUUID();
    mockAuthenticatedTrainer(randomTrainerId);
    const programVM = mockProgramVM();
    mockClientVM();

    render(<ProgramListView />);

    expect(programVM.loadPrograms).toHaveBeenCalledWith(randomTrainerId);
    expect(programVM.loadPrograms).not.toHaveBeenCalledWith('trainer1');
  });

  it('re-fetches with whatever session id is active on a second, independently-generated run', () => {
    // Independently generated from the id above — proves the component reads
    // the id dynamically from auth on every render rather than caching/
    // hardcoding a value that happened to work once.
    const anotherRandomTrainerId = crypto.randomUUID();
    mockAuthenticatedTrainer(anotherRandomTrainerId);
    const programVM = mockProgramVM();
    mockClientVM();

    render(<ProgramListView />);

    expect(programVM.loadPrograms).toHaveBeenCalledWith(anotherRandomTrainerId);
  });

  it('reloads programs with the same dynamic session trainer id after renewing a program', async () => {
    const randomTrainerId = crypto.randomUUID();
    mockAuthenticatedTrainer(randomTrainerId);
    const activeProgram = makeProgram();
    const programVM = mockProgramVM({ programs: [activeProgram] });
    mockClientVM();

    const user = userEvent.setup();
    render(<ProgramListView />);

    await user.click(screen.getByTestId(`renew-program-btn-${activeProgram.id}`));
    await user.click(screen.getByTestId('renew-modal-submit'));

    // Every loadPrograms call — the initial mount fetch and the post-renew
    // refresh — must use the same dynamic session id, never a literal.
    await waitFor(() => {
      expect(programVM.loadPrograms).toHaveBeenCalledTimes(2);
    });
    vi.mocked(programVM.loadPrograms).mock.calls.forEach((call) => {
      expect(call[0]).toBe(randomTrainerId);
    });
  });
});
