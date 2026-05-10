import { describe, it, expect } from 'vitest'
import { TrainerScheduleMapper } from '@/core/mappers/TrainerScheduleMapper'
import { TrainerScheduleRow } from '@/core/types/supabase'

// 2026-05-11 = Monday, 2026-05-12 = Tuesday, ..., 2026-05-16 = Saturday, 2026-05-17 = Sunday
const MONDAY = '2026-05-11'
const TUESDAY = '2026-05-12'
const SATURDAY = '2026-05-16'
const SUNDAY = '2026-05-17'

function makeRow(overrides: Partial<TrainerScheduleRow> = {}): TrainerScheduleRow {
  return {
    id: 'uuid-schedule-1',
    trainer_id: 'uuid-trainer-1',
    date: MONDAY,
    time_slot: '09:00',
    is_available: true,
    created_at: '2026-05-10T00:00:00Z',
    ...overrides,
  }
}

describe('TrainerScheduleMapper', () => {
  describe('toDomain', () => {
    it('builds a TrainerSchedule with trainer metadata', () => {
      const rows = [makeRow()]
      const result = TrainerScheduleMapper.toDomain(rows, 'uuid-trainer-1', 'Carlos')

      expect(result.trainerId).toBe('uuid-trainer-1')
      expect(result.trainerName).toBe('Carlos')
    })

    it('produces a weeklySchedule with 6 entries (Mon–Sat)', () => {
      const result = TrainerScheduleMapper.toDomain([], 'uuid-trainer-1', 'Carlos')

      expect(result.weeklySchedule).toHaveLength(6)
    })

    it('assigns correct day names (Lunes … Sábado)', () => {
      const result = TrainerScheduleMapper.toDomain([], 'uuid-trainer-1', 'Carlos')
      const names = result.weeklySchedule.map((d) => d.day)

      expect(names).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'])
    })

    it('places a Monday row into weeklySchedule index 0 (Lunes)', () => {
      const rows = [makeRow({ date: MONDAY, time_slot: '09:00', is_available: true })]
      const result = TrainerScheduleMapper.toDomain(rows, 't1', 'Carlos')

      expect(result.weeklySchedule[0].day).toBe('Lunes')
      expect(result.weeklySchedule[0].slots).toContainEqual({ time: '09:00', available: true })
    })

    it('places a Tuesday row into weeklySchedule index 1 (Martes)', () => {
      const rows = [makeRow({ date: TUESDAY, time_slot: '10:00', is_available: true })]
      const result = TrainerScheduleMapper.toDomain(rows, 't1', 'Carlos')

      expect(result.weeklySchedule[1].day).toBe('Martes')
      expect(result.weeklySchedule[1].slots).toContainEqual({ time: '10:00', available: true })
    })

    it('places a Saturday row into weeklySchedule index 5 (Sábado)', () => {
      const rows = [makeRow({ date: SATURDAY, time_slot: '08:00', is_available: false })]
      const result = TrainerScheduleMapper.toDomain(rows, 't1', 'Carlos')

      expect(result.weeklySchedule[5].day).toBe('Sábado')
      expect(result.weeklySchedule[5].slots).toContainEqual({ time: '08:00', available: false })
    })

    it('ignores Sunday rows', () => {
      const rows = [makeRow({ date: SUNDAY, time_slot: '09:00', is_available: true })]
      const result = TrainerScheduleMapper.toDomain(rows, 't1', 'Carlos')

      const allSlots = result.weeklySchedule.flatMap((d) => d.slots)
      expect(allSlots).toHaveLength(0)
    })

    it('marks a slot available if ANY row for that (day, slot) is available', () => {
      const rows = [
        makeRow({ date: MONDAY, time_slot: '09:00', is_available: false }),
        makeRow({ id: 'row-2', date: MONDAY, time_slot: '09:00', is_available: true }),
      ]
      const result = TrainerScheduleMapper.toDomain(rows, 't1', 'Carlos')
      const slot = result.weeklySchedule[0].slots.find((s) => s.time === '09:00')

      expect(slot?.available).toBe(true)
    })

    it('keeps a slot unavailable if ALL rows for that (day, slot) are unavailable', () => {
      const rows = [
        makeRow({ date: MONDAY, time_slot: '09:00', is_available: false }),
        makeRow({ id: 'row-2', date: MONDAY, time_slot: '09:00', is_available: false }),
      ]
      const result = TrainerScheduleMapper.toDomain(rows, 't1', 'Carlos')
      const slot = result.weeklySchedule[0].slots.find((s) => s.time === '09:00')

      expect(slot?.available).toBe(false)
    })

    it('sorts slots alphabetically within a day', () => {
      const rows = [
        makeRow({ date: MONDAY, time_slot: '10:00', is_available: true }),
        makeRow({ id: 'r2', date: MONDAY, time_slot: '09:00', is_available: true }),
        makeRow({ id: 'r3', date: MONDAY, time_slot: '11:00', is_available: true }),
      ]
      const result = TrainerScheduleMapper.toDomain(rows, 't1', 'Carlos')
      const times = result.weeklySchedule[0].slots.map((s) => s.time)

      expect(times).toEqual(['09:00', '10:00', '11:00'])
    })

    it('leaves other days empty when rows only cover one day', () => {
      const rows = [makeRow({ date: MONDAY, time_slot: '09:00' })]
      const result = TrainerScheduleMapper.toDomain(rows, 't1', 'Carlos')

      // Tue–Sat should have no slots
      for (let i = 1; i <= 5; i++) {
        expect(result.weeklySchedule[i].slots).toHaveLength(0)
      }
    })
  })

  describe('toAvailableSlots', () => {
    it('returns only is_available=true time_slots', () => {
      const rows = [
        makeRow({ time_slot: '09:00', is_available: true }),
        makeRow({ id: 'r2', time_slot: '10:00', is_available: false }),
        makeRow({ id: 'r3', time_slot: '11:00', is_available: true }),
      ]
      const result = TrainerScheduleMapper.toAvailableSlots(rows)

      expect(result).toEqual(['09:00', '11:00'])
    })

    it('returns an empty array when no rows are available', () => {
      const rows = [
        makeRow({ time_slot: '09:00', is_available: false }),
        makeRow({ id: 'r2', time_slot: '10:00', is_available: false }),
      ]
      const result = TrainerScheduleMapper.toAvailableSlots(rows)

      expect(result).toEqual([])
    })

    it('returns an empty array for empty input', () => {
      expect(TrainerScheduleMapper.toAvailableSlots([])).toEqual([])
    })

    it('sorts the returned slots alphabetically', () => {
      const rows = [
        makeRow({ time_slot: '11:00', is_available: true }),
        makeRow({ id: 'r2', time_slot: '09:00', is_available: true }),
        makeRow({ id: 'r3', time_slot: '10:00', is_available: true }),
      ]
      const result = TrainerScheduleMapper.toAvailableSlots(rows)

      expect(result).toEqual(['09:00', '10:00', '11:00'])
    })
  })

  describe('toInsertRows', () => {
    const schedule = TrainerScheduleMapper.toDomain(
      [
        makeRow({ date: MONDAY, time_slot: '09:00', is_available: true }),
        makeRow({ id: 'r2', date: MONDAY, time_slot: '10:00', is_available: false }),
        makeRow({ id: 'r3', date: SATURDAY, time_slot: '08:00', is_available: true }),
      ],
      'uuid-trainer-1',
      'Carlos',
    )

    it('produces rows for a week starting on the given Monday', () => {
      const weekStart = new Date('2026-05-25') // a Monday
      const rows = TrainerScheduleMapper.toInsertRows(schedule, weekStart)

      const dates = rows.map((r) => r.date)
      expect(dates).toContain('2026-05-25') // Monday
      expect(dates).toContain('2026-05-30') // Saturday
    })

    it('sets trainer_id from the schedule on every row', () => {
      const rows = TrainerScheduleMapper.toInsertRows(schedule, new Date('2026-05-25'))

      rows.forEach((r) => expect(r.trainer_id).toBe('uuid-trainer-1'))
    })

    it('preserves is_available values', () => {
      const rows = TrainerScheduleMapper.toInsertRows(schedule, new Date('2026-05-25'))
      const mondaySlots = rows.filter((r) => r.date === '2026-05-25')
      const slot09 = mondaySlots.find((r) => r.time_slot === '09:00')
      const slot10 = mondaySlots.find((r) => r.time_slot === '10:00')

      expect(slot09?.is_available).toBe(true)
      expect(slot10?.is_available).toBe(false)
    })

    it('does not produce rows for days with no slots', () => {
      // Days 1–4 (Tue–Fri) have no slots in the schedule
      const rows = TrainerScheduleMapper.toInsertRows(schedule, new Date('2026-05-25'))
      const tuesdayRows = rows.filter((r) => r.date === '2026-05-26')

      expect(tuesdayRows).toHaveLength(0)
    })

    it('does not include id or created_at in insert rows', () => {
      const rows = TrainerScheduleMapper.toInsertRows(schedule, new Date('2026-05-25'))

      rows.forEach((r) => {
        expect((r as unknown as Record<string, unknown>)['id']).toBeUndefined()
        expect((r as unknown as Record<string, unknown>)['created_at']).toBeUndefined()
      })
    })
  })

  describe('dayIndexFromDate', () => {
    it('returns 0 for Monday', () => {
      expect(TrainerScheduleMapper.dayIndexFromDate(new Date('2026-05-11'))).toBe(0)
    })

    it('returns 5 for Saturday', () => {
      expect(TrainerScheduleMapper.dayIndexFromDate(new Date('2026-05-16'))).toBe(5)
    })

    it('returns -1 for Sunday', () => {
      expect(TrainerScheduleMapper.dayIndexFromDate(new Date('2026-05-17'))).toBe(-1)
    })
  })

  describe('dayName', () => {
    it('returns the correct Spanish day name for each index', () => {
      expect(TrainerScheduleMapper.dayName(0)).toBe('Lunes')
      expect(TrainerScheduleMapper.dayName(1)).toBe('Martes')
      expect(TrainerScheduleMapper.dayName(2)).toBe('Miércoles')
      expect(TrainerScheduleMapper.dayName(3)).toBe('Jueves')
      expect(TrainerScheduleMapper.dayName(4)).toBe('Viernes')
      expect(TrainerScheduleMapper.dayName(5)).toBe('Sábado')
    })

    it('returns empty string for out-of-range index', () => {
      expect(TrainerScheduleMapper.dayName(6)).toBe('')
      expect(TrainerScheduleMapper.dayName(-1)).toBe('')
    })
  })
})
