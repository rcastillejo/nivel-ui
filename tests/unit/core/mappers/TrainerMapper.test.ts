import { describe, it, expect } from 'vitest'
import { TrainerMapper } from '@/core/mappers/TrainerMapper'
import { TrainerRow } from '@/core/types/supabase'

const baseRow: TrainerRow = {
  id: 'uuid-trainer-1',
  user_id: 'uuid-user-1',
  name: 'Carlos López',
  email: 'carlos@nivalgym.com',
  specialization: 'Fuerza y acondicionamiento',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

describe('TrainerMapper', () => {
  describe('toDomain', () => {
    it('maps id, userId and name from the row', () => {
      const result = TrainerMapper.toDomain(baseRow)

      expect(result.id).toBe('uuid-trainer-1')
      expect(result.userId).toBe('uuid-user-1')
      expect(result.name).toBe('Carlos López')
    })

    it('defaults to empty availableSlots when not provided', () => {
      const result = TrainerMapper.toDomain(baseRow)

      expect(result.availableSlots).toEqual([])
    })

    it('uses provided availableSlots', () => {
      const slots = ['09:00', '10:00', '11:00']
      const result = TrainerMapper.toDomain(baseRow, slots)

      expect(result.availableSlots).toEqual(slots)
    })

    it('does not expose email, specialization, is_active, created_at or the raw user_id column on the domain entity', () => {
      const result = TrainerMapper.toDomain(baseRow) as unknown as Record<string, unknown>

      expect(result['email']).toBeUndefined()
      expect(result['specialization']).toBeUndefined()
      expect(result['is_active']).toBeUndefined()
      expect(result['created_at']).toBeUndefined()
      expect(result['user_id']).toBeUndefined()
    })

    it('handles a trainer with null specialization', () => {
      const result = TrainerMapper.toDomain({ ...baseRow, specialization: null })

      expect(result.id).toBe('uuid-trainer-1')
    })
  })
})
