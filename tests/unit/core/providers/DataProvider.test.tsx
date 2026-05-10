import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInitialize = vi.fn().mockResolvedValue(undefined);

const makeServiceMock = () => ({
  initialize: mockInitialize,
  bookings: { getAll: vi.fn().mockResolvedValue([]), create: vi.fn(), save: vi.fn(), getByDate: vi.fn().mockResolvedValue([]) },
  trainers: { getAll: vi.fn().mockResolvedValue([]), getById: vi.fn(), getSchedule: vi.fn().mockResolvedValue(null), saveSchedule: vi.fn() },
  clients: { getAll: vi.fn().mockResolvedValue([]) },
  programs: { getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), create: vi.fn() },
});

vi.mock('@/core/repositories/localStorage', () => ({
  LocalStorageDataService: vi.fn().mockImplementation(() => makeServiceMock()),
}));

vi.mock('@/core/services/SupabaseDataService', () => ({
  SupabaseDataService: vi.fn().mockImplementation(() => makeServiceMock()),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseBrowserClient: vi.fn(),
}));

import { getSupabaseBrowserClient } from '@/lib/supabase';
import { LocalStorageDataService } from '@/core/repositories/localStorage';
import { SupabaseDataService } from '@/core/services/SupabaseDataService';
import { DataProvider, useDataService } from '@/core/providers/DataProvider';

// ---------------------------------------------------------------------------
// Helper — exposes which service was injected
// ---------------------------------------------------------------------------

function ServiceLabel() {
  const svc = useDataService();
  const label = svc instanceof (LocalStorageDataService as never) ? 'localStorage' : 'supabase';
  return <div data-testid="service-label">{label}</div>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DataProvider — service selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('instantiates LocalStorageDataService when Supabase client is not available', async () => {
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(null);

    render(
      <DataProvider>
        <div />
      </DataProvider>,
    );

    await waitFor(() => expect(mockInitialize).toHaveBeenCalled());
    expect(LocalStorageDataService).toHaveBeenCalledTimes(1);
    expect(SupabaseDataService).not.toHaveBeenCalled();
  });

  it('instantiates SupabaseDataService when Supabase client is available', async () => {
    const fakeClient = { auth: {} } as never;
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(fakeClient);

    render(
      <DataProvider>
        <div />
      </DataProvider>,
    );

    await waitFor(() => expect(mockInitialize).toHaveBeenCalled());
    expect(SupabaseDataService).toHaveBeenCalledWith(fakeClient);
    expect(LocalStorageDataService).not.toHaveBeenCalled();
  });

  it('calls service.initialize() on mount', async () => {
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(null);

    render(
      <DataProvider>
        <div />
      </DataProvider>,
    );

    await waitFor(() => expect(mockInitialize).toHaveBeenCalledTimes(1));
  });

  it('renders children after initialization completes', async () => {
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(null);

    render(
      <DataProvider>
        <div data-testid="child" />
      </DataProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('child')).toBeInTheDocument());
  });

  it('shows a loading indicator while initializing', () => {
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(null);
    // initialize never resolves within this synchronous check
    mockInitialize.mockReturnValue(new Promise(() => {}));

    render(
      <DataProvider>
        <div data-testid="child" />
      </DataProvider>,
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });
});
