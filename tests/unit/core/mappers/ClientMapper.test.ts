import { describe, it, expect } from 'vitest'
import { ClientMapper } from '@/core/mappers/ClientMapper'
import { UserProfileRow } from '@/core/types/supabase'

const baseRow: UserProfileRow = {
  id: 'uuid-client-1',
  role: 'client',
  full_name: 'Alice García',
  email: 'alice@gym.com',
  phone: null,
  created_at: '2026-01-15T10:00:00Z',
}

describe('ClientMapper', () => {
  describe('toDomain', () => {
    it('maps id from the row', () => {
      const result = ClientMapper.toDomain(baseRow, 'alice@gym.com')

      expect(result.id).toBe('uuid-client-1')
    })

    it('uses full_name as the client name when it is set', () => {
      const result = ClientMapper.toDomain(baseRow, 'alice@gym.com')

      expect(result.name).toBe('Alice García')
    })

    it('falls back to email as name when full_name is null', () => {
      const result = ClientMapper.toDomain({ ...baseRow, full_name: null }, 'alice@gym.com')

      expect(result.name).toBe('alice@gym.com')
    })

    it('assigns the provided email', () => {
      const result = ClientMapper.toDomain(baseRow, 'alice@gym.com')

      expect(result.email).toBe('alice@gym.com')
    })

    it('defaults phone to empty string when not provided', () => {
      const result = ClientMapper.toDomain(baseRow, 'alice@gym.com')

      expect(result.phone).toBe('')
    })

    it('uses the provided phone when given', () => {
      const result = ClientMapper.toDomain(baseRow, 'alice@gym.com', '+52 55 1234 5678')

      expect(result.phone).toBe('+52 55 1234 5678')
    })

    it('always sets status to active', () => {
      const result = ClientMapper.toDomain(baseRow, 'alice@gym.com')

      expect(result.status).toBe('active')
    })

    it('parses created_at into a Date object', () => {
      const result = ClientMapper.toDomain(baseRow, 'alice@gym.com')

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.createdAt.getFullYear()).toBe(2026)
      expect(result.createdAt.getMonth()).toBe(0) // January
      expect(result.createdAt.getDate()).toBe(15)
    })

    it('does not expose role or created_at as raw strings on the domain entity', () => {
      const result = ClientMapper.toDomain(baseRow, 'alice@gym.com') as unknown as Record<string, unknown>

      expect(result['role']).toBeUndefined()
      expect(result['created_at']).toBeUndefined()
      expect(result['full_name']).toBeUndefined()
    })
  })
})
