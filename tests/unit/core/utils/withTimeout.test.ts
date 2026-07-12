import { describe, it, expect, vi, afterEach } from 'vitest';
import { withTimeout } from '@/core/utils/withTimeout';

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the original value when the promise settles before the timeout', async () => {
    const result = await withTimeout(Promise.resolve('done'), 1000, 'timed out');
    expect(result).toBe('done');
  });

  it('rejects with the original error when the promise rejects before the timeout', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('boom')), 1000, 'timed out'),
    ).rejects.toThrow('boom');
  });

  it('rejects with the timeout message when the promise never settles', async () => {
    vi.useFakeTimers();
    const hung = new Promise(() => {});

    const result = withTimeout(hung, 1000, 'timed out');
    const assertion = expect(result).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('clears the timer once the promise settles, so it does not fire later', async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(global, 'clearTimeout');

    await withTimeout(Promise.resolve('done'), 1000, 'timed out');

    expect(clearSpy).toHaveBeenCalled();
  });
});
