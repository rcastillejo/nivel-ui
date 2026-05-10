import { describe, it, expect } from 'vitest'
import { ProgramMapper } from '@/core/mappers/ProgramMapper'
import { Program } from '@/core/types'
import { ProgramRow } from '@/core/types/supabase'

const baseRow: ProgramRow = {
  id: 'uuid-program-1',
  name: 'Plan Fuerza 12 semanas',
  description: 'Programa de fuerza progresiva',
  trainer_id: 'uuid-trainer-1',
  client_ids: ['uuid-client-1', 'uuid-client-2'],
  start_date: '2026-05-01',
  end_date: '2026-07-24',
  total_sessions: 24,
  used_sessions: 4,
  status: 'active',
  previous_program_id: null,
  created_at: '2026-04-30T10:00:00Z',
}

const baseDomain: Omit<Program, 'id'> = {
  name: 'Plan Fuerza 12 semanas',
  description: 'Programa de fuerza progresiva',
  trainerId: 'uuid-trainer-1',
  clientIds: ['uuid-client-1', 'uuid-client-2'],
  startDate: new Date('2026-05-01'),
  endDate: new Date('2026-07-24'),
  totalSessions: 24,
  usedSessions: 4,
  status: 'active',
}

describe('ProgramMapper', () => {
  describe('toDomain', () => {
    it('maps all snake_case fields to camelCase', () => {
      const result = ProgramMapper.toDomain(baseRow)

      expect(result.id).toBe('uuid-program-1')
      expect(result.name).toBe('Plan Fuerza 12 semanas')
      expect(result.description).toBe('Programa de fuerza progresiva')
      expect(result.trainerId).toBe('uuid-trainer-1')
      expect(result.clientIds).toEqual(['uuid-client-1', 'uuid-client-2'])
      expect(result.totalSessions).toBe(24)
      expect(result.usedSessions).toBe(4)
      expect(result.status).toBe('active')
    })

    it('parses start_date and end_date into Date objects', () => {
      const result = ProgramMapper.toDomain(baseRow)

      expect(result.startDate).toBeInstanceOf(Date)
      expect(result.endDate).toBeInstanceOf(Date)
      expect(result.startDate.getFullYear()).toBe(2026)
      expect(result.startDate.getMonth()).toBe(4) // May
      expect(result.startDate.getDate()).toBe(1)
    })

    it('omits previousProgramId when previous_program_id is null', () => {
      const result = ProgramMapper.toDomain({ ...baseRow, previous_program_id: null })

      expect(result.previousProgramId).toBeUndefined()
    })

    it('maps previousProgramId when previous_program_id is set', () => {
      const result = ProgramMapper.toDomain({
        ...baseRow,
        previous_program_id: 'uuid-prev-program',
      })

      expect(result.previousProgramId).toBe('uuid-prev-program')
    })

    it('maps all status values', () => {
      expect(ProgramMapper.toDomain({ ...baseRow, status: 'active' }).status).toBe('active')
      expect(ProgramMapper.toDomain({ ...baseRow, status: 'expired' }).status).toBe('expired')
      expect(ProgramMapper.toDomain({ ...baseRow, status: 'inactive' }).status).toBe('inactive')
    })

    it('does not expose created_at on the domain entity', () => {
      const result = ProgramMapper.toDomain(baseRow) as unknown as Record<string, unknown>

      expect(result['created_at']).toBeUndefined()
    })
  })

  describe('toInsert', () => {
    it('maps all camelCase fields to snake_case', () => {
      const result = ProgramMapper.toInsert(baseDomain)

      expect(result.name).toBe('Plan Fuerza 12 semanas')
      expect(result.description).toBe('Programa de fuerza progresiva')
      expect(result.trainer_id).toBe('uuid-trainer-1')
      expect(result.client_ids).toEqual(['uuid-client-1', 'uuid-client-2'])
      expect(result.total_sessions).toBe(24)
      expect(result.used_sessions).toBe(4)
      expect(result.status).toBe('active')
    })

    it('formats startDate and endDate as YYYY-MM-DD strings', () => {
      const result = ProgramMapper.toInsert(baseDomain)

      expect(result.start_date).toBe('2026-05-01')
      expect(result.end_date).toBe('2026-07-24')
    })

    it('sets previous_program_id to null when previousProgramId is undefined', () => {
      const result = ProgramMapper.toInsert({ ...baseDomain, previousProgramId: undefined })

      expect(result.previous_program_id).toBeNull()
    })

    it('maps previousProgramId to previous_program_id when set', () => {
      const result = ProgramMapper.toInsert({ ...baseDomain, previousProgramId: 'uuid-prev' })

      expect(result.previous_program_id).toBe('uuid-prev')
    })

    it('does not include id in the insert payload', () => {
      const result = ProgramMapper.toInsert(baseDomain) as unknown as Record<string, unknown>

      expect(result['id']).toBeUndefined()
    })

    it('round-trips correctly: toDomain(toInsert(domain)) === domain', () => {
      const insert = ProgramMapper.toInsert(baseDomain)
      const roundTripped = ProgramMapper.toDomain({ ...insert, id: 'new-id', created_at: '' })

      expect(roundTripped.name).toBe(baseDomain.name)
      expect(roundTripped.trainerId).toBe(baseDomain.trainerId)
      expect(roundTripped.clientIds).toEqual(baseDomain.clientIds)
      expect(roundTripped.totalSessions).toBe(baseDomain.totalSessions)
      expect(roundTripped.usedSessions).toBe(baseDomain.usedSessions)
      expect(roundTripped.status).toBe(baseDomain.status)
    })
  })
})
