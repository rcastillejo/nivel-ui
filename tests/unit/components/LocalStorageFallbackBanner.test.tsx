import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/core/providers/DataProvider', () => ({
  useIsLocalStorageFallback: vi.fn(),
}));

import { useIsLocalStorageFallback } from '@/core/providers/DataProvider';
import { LocalStorageFallbackBanner } from '@/components/LocalStorageFallbackBanner';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocalStorageFallbackBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a warning when the app is running on the localStorage fallback', () => {
    vi.mocked(useIsLocalStorageFallback).mockReturnValue(true);

    render(<LocalStorageFallbackBanner />);

    expect(screen.getByTestId('local-storage-fallback-banner')).toBeInTheDocument();
  });

  it('renders nothing when Supabase is the active data service', () => {
    vi.mocked(useIsLocalStorageFallback).mockReturnValue(false);

    const { container } = render(<LocalStorageFallbackBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});
