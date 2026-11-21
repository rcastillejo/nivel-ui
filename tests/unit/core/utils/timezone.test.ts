import { describe, it, expect } from 'vitest';
import { isValidTimeZone, zonedDateTimeToUtc, formatDateInTimeZone } from '@/core/utils/timezone';

describe('isValidTimeZone', () => {
  it('accepts IANA zones', () => {
    expect(isValidTimeZone('America/Lima')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
  });

  it('rejects unknown or empty zones', () => {
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('zonedDateTimeToUtc', () => {
  it('converts Lima local time (UTC-5, no DST) to UTC', () => {
    expect(zonedDateTimeToUtc('2026-11-15', '09:00', 'America/Lima').toISOString()).toBe('2026-11-15T14:00:00.000Z');
  });

  it('returns the same instant for UTC', () => {
    expect(zonedDateTimeToUtc('2026-11-15', '09:00', 'UTC').toISOString()).toBe('2026-11-15T09:00:00.000Z');
  });

  it('handles a zone ahead of UTC crossing midnight', () => {
    expect(zonedDateTimeToUtc('2026-11-15', '01:30', 'Asia/Tokyo').toISOString()).toBe('2026-11-14T16:30:00.000Z');
  });

  it('respects daylight saving time (New York, summer vs winter)', () => {
    expect(zonedDateTimeToUtc('2026-07-01', '09:00', 'America/New_York').toISOString()).toBe('2026-07-01T13:00:00.000Z');
    expect(zonedDateTimeToUtc('2026-12-01', '09:00', 'America/New_York').toISOString()).toBe('2026-12-01T14:00:00.000Z');
  });

  it('throws on an invalid zone', () => {
    expect(() => zonedDateTimeToUtc('2026-11-15', '09:00', 'Mars/Olympus')).toThrow();
  });
});

describe('formatDateInTimeZone', () => {
  it('returns the calendar date of an instant in the given zone', () => {
    const instant = new Date('2026-11-11T02:00:00.000Z');
    expect(formatDateInTimeZone(instant, 'America/Lima')).toBe('2026-11-10');
    expect(formatDateInTimeZone(instant, 'UTC')).toBe('2026-11-11');
  });
});
