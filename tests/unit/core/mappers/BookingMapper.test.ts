import { describe, it, expect } from 'vitest'
import { BookingMapper } from '@/core/mappers/BookingMapper'
import { Booking } from '@/core/types'
import { BookingInsert, BookingRow } from '@/core/types/supabase'

const baseRow: BookingRow = {
  id: 'uuid-booking-1',
  client_id: 'uuid-client-1',
  trainer_id: 'uuid-trainer-1',
  trainer_name: 'Carlos López',
  date: '2026-05-15',
  time_slot: '09:00',
  duration_minutes: 60,
  zone: 'gym',
  status: 'confirmed',
  starts_at: null,
  client_timezone: null,
  program_id: null,
  created_at: '2026-05-10T12:00:00Z',
}

const baseDomain: Omit<Booking, 'id'> = {
  clientId: 'uuid-client-1',
  trainerId: 'uuid-trainer-1',
  trainerName: 'Carlos López',
  date: new Date('2026-05-15T12:00:00.000Z'),
  time: '09:00',
  duration: 60,
  zone: 'gym',
  status: 'confirmed',
}

describe('BookingMapper', () => {
  describe('toDomain', () => {
    it('maps all snake_case fields to camelCase', () => {
      const result = BookingMapper.toDomain(baseRow)

      expect(result.id).toBe('uuid-booking-1')
      expect(result.clientId).toBe('uuid-client-1')
      expect(result.trainerId).toBe('uuid-trainer-1')
      expect(result.trainerName).toBe('Carlos López')
      expect(result.time).toBe('09:00')
      expect(result.duration).toBe(60)
      expect(result.zone).toBe('gym')
      expect(result.status).toBe('confirmed')
    })

    it('parses the date string into a Date object', () => {
      const result = BookingMapper.toDomain(baseRow)

      expect(result.date).toBeInstanceOf(Date)
      expect(result.date.getFullYear()).toBe(2026)
      expect(result.date.getMonth()).toBe(4) // May = 4 (0-indexed)
      expect(result.date.getDate()).toBe(15)
    })

    it('maps zone gabinete correctly', () => {
      const result = BookingMapper.toDomain({ ...baseRow, zone: 'gabinete' })

      expect(result.zone).toBe('gabinete')
    })

    it('maps all booking status values', () => {
      expect(BookingMapper.toDomain({ ...baseRow, status: 'confirmed' }).status).toBe('confirmed')
      expect(BookingMapper.toDomain({ ...baseRow, status: 'cancelled' }).status).toBe('cancelled')
      expect(BookingMapper.toDomain({ ...baseRow, status: 'pending' }).status).toBe('pending')
    })

    it('does not include created_at in the domain entity', () => {
      const result = BookingMapper.toDomain(baseRow) as unknown as Record<string, unknown>

      expect(result['created_at']).toBeUndefined()
    })
  })

  describe('toInsert', () => {
    it('maps all camelCase fields to snake_case', () => {
      const result = BookingMapper.toInsert(baseDomain)

      expect(result.client_id).toBe('uuid-client-1')
      expect(result.trainer_id).toBe('uuid-trainer-1')
      expect(result.trainer_name).toBe('Carlos López')
      expect(result.time_slot).toBe('09:00')
      expect(result.duration_minutes).toBe(60)
      expect(result.zone).toBe('gym')
      expect(result.status).toBe('confirmed')
    })

    it('formats the Date object as YYYY-MM-DD string', () => {
      const result = BookingMapper.toInsert(baseDomain)

      expect(result.date).toBe('2026-05-15')
    })

    it('does not include id in the insert payload', () => {
      const result = BookingMapper.toInsert(baseDomain) as unknown as Record<string, unknown>

      expect(result['id']).toBeUndefined()
    })

    it('round-trips correctly: toDomain(toInsert(domain)) === domain', () => {
      const insert: BookingInsert = BookingMapper.toInsert(baseDomain)
      const roundTripped = BookingMapper.toDomain({ ...insert, id: 'new-id', created_at: '' })

      expect(roundTripped.clientId).toBe(baseDomain.clientId)
      expect(roundTripped.trainerId).toBe(baseDomain.trainerId)
      expect(roundTripped.trainerName).toBe(baseDomain.trainerName)
      expect(roundTripped.time).toBe(baseDomain.time)
      expect(roundTripped.duration).toBe(baseDomain.duration)
      expect(roundTripped.zone).toBe(baseDomain.zone)
      expect(roundTripped.status).toBe(baseDomain.status)
    })
  })

  describe('server-calculated fields', () => {
    const withServerFields: BookingRow = {
      ...baseRow,
      starts_at: '2026-05-15T14:00:00.000Z',
      client_timezone: 'America/Lima',
      program_id: 'uuid-program-1',
    }

    it('maps starts_at, client_timezone and program_id to the domain', () => {
      const result = BookingMapper.toDomain(withServerFields)

      expect(result.startsAt?.toISOString()).toBe('2026-05-15T14:00:00.000Z')
      expect(result.clientTimezone).toBe('America/Lima')
      expect(result.programId).toBe('uuid-program-1')
    })

    it('leaves startsAt and clientTimezone undefined and programId null for legacy rows', () => {
      const result = BookingMapper.toDomain(baseRow)

      expect(result.startsAt).toBeUndefined()
      expect(result.clientTimezone).toBeUndefined()
      expect(result.programId).toBeNull()
    })

    it('maps the server fields to the insert payload', () => {
      const insert = BookingMapper.toInsert({
        ...baseDomain,
        startsAt: new Date('2026-05-15T14:00:00.000Z'),
        clientTimezone: 'America/Lima',
        programId: 'uuid-program-1',
      })

      expect(insert.starts_at).toBe('2026-05-15T14:00:00.000Z')
      expect(insert.client_timezone).toBe('America/Lima')
      expect(insert.program_id).toBe('uuid-program-1')
    })

    it('inserts nulls when the server fields are absent', () => {
      const insert = BookingMapper.toInsert(baseDomain)

      expect(insert.starts_at).toBeNull()
      expect(insert.client_timezone).toBeNull()
      expect(insert.program_id).toBeNull()
    })
  })

  describe('DTO', () => {
    it('round-trips a booking through toDto/fromDto', () => {
      const booking: Booking = {
        ...baseDomain,
        id: 'b-1',
        date: new Date(2026, 4, 15),
        startsAt: new Date('2026-05-15T14:00:00.000Z'),
        clientTimezone: 'America/Lima',
        programId: 'p-1',
      }

      const dto = BookingMapper.toDto(booking)
      expect(dto.date).toBe('2026-05-15')
      expect(dto.startsAt).toBe('2026-05-15T14:00:00.000Z')
      expect(JSON.parse(JSON.stringify(dto))).toEqual(dto)

      const back = BookingMapper.fromDto(dto)
      expect(back.date.getDate()).toBe(15)
      expect(back.startsAt?.toISOString()).toBe('2026-05-15T14:00:00.000Z')
      expect(back.programId).toBe('p-1')
      expect(back.clientTimezone).toBe('America/Lima')
    })

    it('maps absent optional fields to nulls in the DTO and back to undefined', () => {
      const dto = BookingMapper.toDto({ ...baseDomain, id: 'b-2' })

      expect(dto.startsAt).toBeNull()
      expect(dto.programId).toBeNull()
      expect(BookingMapper.fromDto(dto).startsAt).toBeUndefined()
    })
  })
})
