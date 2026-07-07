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

vi.mock('@/lib/env', () => ({
  isProductionEnvironment: vi.fn().mockReturnValue(false),
}));

import { getSupabaseBrowserClient } from '@/lib/supabase';
import { isProductionEnvironment } from '@/lib/env';
import { LocalStorageDataService } from '@/core/repositories/localStorage';
import { SupabaseDataService } from '@/core/services/SupabaseDataService';
import { DataProvider, useIsLocalStorageFallback } from '@/core/providers/DataProvider';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DataProvider — service selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isProductionEnvironment).mockReturnValue(false);
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

describe('DataProvider — local storage fallback detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
    vi.mocked(isProductionEnvironment).mockReturnValue(false);
  });

  function FallbackLabel() {
    const isFallback = useIsLocalStorageFallback();
    return <div data-testid="fallback-label">{String(isFallback)}</div>;
  }

  it('reports the fallback as active when using LocalStorageDataService', async () => {
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(null);

    render(
      <DataProvider>
        <FallbackLabel />
      </DataProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('fallback-label')).toHaveTextContent('true'));
  });

  it('reports the fallback as inactive when using SupabaseDataService', async () => {
    const fakeClient = { auth: {} } as never;
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(fakeClient);

    render(
      <DataProvider>
        <FallbackLabel />
      </DataProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('fallback-label')).toHaveTextContent('false'));
  });
});

describe('DataProvider — production without Supabase configured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
    vi.mocked(isProductionEnvironment).mockReturnValue(true);
  });

  it('shows a configuration error instead of falling back to localStorage', () => {
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(null);

    render(
      <DataProvider>
        <div data-testid="child" />
      </DataProvider>,
    );

    expect(screen.getByTestId('data-service-config-error')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('never instantiates LocalStorageDataService', () => {
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(null);

    render(
      <DataProvider>
        <div />
      </DataProvider>,
    );

    expect(LocalStorageDataService).not.toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it('still uses SupabaseDataService when Supabase is configured', async () => {
    const fakeClient = { auth: {} } as never;
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(fakeClient);

    render(
      <DataProvider>
        <div data-testid="child" />
      </DataProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('child')).toBeInTheDocument());
    expect(SupabaseDataService).toHaveBeenCalledWith(fakeClient);
    expect(LocalStorageDataService).not.toHaveBeenCalled();
  });
});
