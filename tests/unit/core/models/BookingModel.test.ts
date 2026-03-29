import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingModel } from '@/core/models/BookingModel'
import { IDataService, ITrainerRepository, IBookingRepository } from '@/core/repositories'
import { Booking, Trainer, ZoneType } from '@/core/types'
import { BookingCapacityError } from '@/core/types/errors'

// Mock del data service
const mockTrainerRepository: ITrainerRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  save: vi.fn(),
  saveSchedule: vi.fn(),
  getSchedule: vi.fn()
}

const mockBookingRepository: IBookingRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  getByDate: vi.fn(),
  getByTrainer: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}

const mockDataService: IDataService = {
  clients: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByEmail: vi.fn(),
    save: vi.fn(),
    delete: vi.fn()
  },
  trainers: mockTrainerRepository,
  bookings: mockBookingRepository,
  initialize: vi.fn(),
  clear: vi.fn()
}

describe('BookingModel', () => {
  let bookingModel: BookingModel

  beforeEach(() => {
    bookingModel = new BookingModel(mockDataService)
    vi.clearAllMocks()
  })

  describe('createBooking', () => {
    const mockTrainer: Trainer = {
      id: 'trainer1',
      name: 'John',
      availableSlots: ['09:00', '10:00', '11:00']
    }

    const validBookingData: Omit<Booking, 'id'> = {
      clientId: 'client1',
      trainerId: 'trainer1',
      trainerName: 'Entrenador John',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      time: '09:00',
      duration: 60,
      zone: 'gym',
      status: 'confirmed'
    }

    it('should create a booking successfully', async () => {
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      mockBookingRepository.getByDate.mockResolvedValue([])
      mockBookingRepository.save.mockResolvedValue(undefined)

      const result = await bookingModel.createBooking(validBookingData)

      expect(result).toMatchObject(validBookingData)
      expect(result.id).toBeDefined()
      expect(result.id).toMatch(/^booking_\d+_[a-z0-9]+$/)
      expect(mockBookingRepository.save).toHaveBeenCalledWith(result)
    })

    it('should throw error for missing client', async () => {
      const invalidBooking = { ...validBookingData, clientId: '' }

      await expect(bookingModel.createBooking(invalidBooking)).rejects.toThrow('El cliente es requerido')
    })

    it('should throw error for duration less than 30 minutes', async () => {
      const invalidBooking = { ...validBookingData, duration: 29 }

      await expect(bookingModel.createBooking(invalidBooking)).rejects.toThrow('La duración mínima es 30 minutos')
    })

    it('should throw error for duration more than 180 minutes', async () => {
      const invalidBooking = { ...validBookingData, duration: 181 }

      await expect(bookingModel.createBooking(invalidBooking)).rejects.toThrow('La duración máxima es 180 minutos')
    })

    it('should throw error for past date', async () => {
      const invalidBooking = { ...validBookingData, date: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Yesterday

      await expect(bookingModel.createBooking(invalidBooking)).rejects.toThrow('No se pueden hacer reservas en el pasado')
    })

    it('should throw error for unavailable time slot', async () => {
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      mockBookingRepository.getByDate.mockResolvedValue([])

      const invalidBooking = { ...validBookingData, time: '12:00' } // Not in available slots

      await expect(bookingModel.createBooking(invalidBooking)).rejects.toThrow('El horario seleccionado no está disponible')
    })

    it('should throw BookingCapacityError when gabinete zone is at capacity', async () => {
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      
      // Create 1 existing booking for gabinete zone (max capacity)
      const existingBookings: Booking[] = [{
        id: 'booking1',
        clientId: 'client1',
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date: validBookingData.date,
        time: '09:00',
        duration: 60,
        zone: 'gabinete',
        status: 'confirmed'
      }]
      
      mockBookingRepository.getByDate.mockResolvedValue(existingBookings)

      const gabineteBooking = { ...validBookingData, zone: 'gabinete' as ZoneType }

      try {
        await bookingModel.createBooking(gabineteBooking)
        fail('Expected BookingCapacityError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BookingCapacityError)
      }
    })
  })

  describe('getTrainers', () => {
    it('should return all trainers', async () => {
      const mockTrainers: Trainer[] = [
        { id: 'trainer1', name: 'John', availableSlots: ['09:00', '10:00'] },
        { id: 'trainer2', name: 'Jane', availableSlots: ['11:00', '12:00'] }
      ]

      mockTrainerRepository.getAll.mockResolvedValue(mockTrainers)

      const result = await bookingModel.getTrainers()

      expect(result).toEqual(mockTrainers)
      expect(mockTrainerRepository.getAll).toHaveBeenCalledOnce()
    })
  })

  describe('getTrainerById', () => {
    it('should return trainer when found', async () => {
      const mockTrainer: Trainer = {
        id: 'trainer1',
        name: 'John',
        availableSlots: ['09:00', '10:00']
      }

      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)

      const result = await bookingModel.getTrainerById('trainer1')

      expect(result).toEqual(mockTrainer)
      expect(mockTrainerRepository.getById).toHaveBeenCalledWith('trainer1')
    })

    it('should return null when trainer not found', async () => {
      mockTrainerRepository.getById.mockResolvedValue(null)

      const result = await bookingModel.getTrainerById('nonexistent')

      expect(result).toBeNull()
      expect(mockTrainerRepository.getById).toHaveBeenCalledWith('nonexistent')
    })
  })

  describe('getBookingsByDate', () => {
    it('should return bookings for specific date', async () => {
      const date = new Date('2024-01-15')
      const mockBookings: Booking[] = [
        {
          id: 'booking1',
          clientId: 'client1',
          trainerId: 'trainer1',
          trainerName: 'Entrenador John',
          date,
          time: '09:00',
          duration: 60,
          zone: 'gym',
          status: 'confirmed'
        }
      ]

      mockBookingRepository.getByDate.mockResolvedValue(mockBookings)

      const result = await bookingModel.getBookingsByDate(date)

      expect(result).toEqual(mockBookings)
      expect(mockBookingRepository.getByDate).toHaveBeenCalledWith(date)
    })
  })

  describe('getAvailableSlots', () => {
    const mockTrainer: Trainer = {
      id: 'trainer1',
      name: 'John',
      availableSlots: ['09:00', '10:00', '11:00']
    }

    it('should return available slots when no schedule is set', async () => {
      const date = new Date('2024-01-15') // Monday
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      mockBookingRepository.getByDate.mockResolvedValue([])

      const result = await bookingModel.getAvailableSlots('trainer1', date)

      expect(result).toEqual(['09:00', '10:00', '11:00'])
    })

    it('should return empty array when trainer not found', async () => {
      mockTrainerRepository.getById.mockResolvedValue(null)

      const result = await bookingModel.getAvailableSlots('nonexistent', new Date())

      expect(result).toEqual([])
    })

    it('should filter out slots at capacity', async () => {
      const date = new Date('2024-01-15') // Monday
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      
      // Create 10 bookings for 09:00 slot (at capacity)
      const existingBookings: Booking[] = Array.from({ length: 10 }, (_, i) => ({
        id: `booking${i}`,
        clientId: `client${i}`,
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date,
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed'
      }))
      
      mockBookingRepository.getByDate.mockResolvedValue(existingBookings)

      const result = await bookingModel.getAvailableSlots('trainer1', date)

      expect(result).toEqual(['10:00', '11:00']) // 09:00 should be filtered out
    })
  })

  describe('getZoneOccupancy', () => {
    const date = new Date('2024-01-15')
    const time = '09:00'

    it('should return gym occupancy for specific trainer', async () => {
      const existingBookings: Booking[] = [
        {
          id: 'booking1',
          clientId: 'client1',
          trainerId: 'trainer1',
          trainerName: 'Entrenador John',
          date,
          time,
          duration: 60,
          zone: 'gym',
          status: 'confirmed'
        },
        {
          id: 'booking2',
          clientId: 'client2',
          trainerId: 'trainer2',
          trainerName: 'Entrenador Jane',
          date,
          time,
          duration: 60,
          zone: 'gym',
          status: 'confirmed'
        }
      ]

      mockBookingRepository.getByDate.mockResolvedValue(existingBookings)

      const result = await bookingModel.getZoneOccupancy('gym', date, time, 'trainer1')

      expect(result).toBe(1) // Only trainer1's booking counts
    })

    it('should return global gabinete occupancy', async () => {
      const existingBookings: Booking[] = [
        {
          id: 'booking1',
          clientId: 'client1',
          trainerId: 'trainer1',
          trainerName: 'Entrenador John',
          date,
          time,
          duration: 60,
          zone: 'gabinete',
          status: 'confirmed'
        },
        {
          id: 'booking2',
          clientId: 'client2',
          trainerId: 'trainer2',
          trainerName: 'Entrenador Jane',
          date,
          time,
          duration: 60,
          zone: 'gabinete',
          status: 'confirmed'
        }
      ]

      mockBookingRepository.getByDate.mockResolvedValue(existingBookings)

      const result = await bookingModel.getZoneOccupancy('gabinete', date, time)

      expect(result).toBe(2) // All gabinete bookings count
    })
  })

  describe('getAllZonesOccupancy', () => {
    const date = new Date('2024-01-15')
    const time = '09:00'

    it('should return occupancy for all zones', async () => {
      const existingBookings: Booking[] = [
        {
          id: 'booking1',
          clientId: 'client1',
          trainerId: 'trainer1',
          trainerName: 'Entrenador John',
          date,
          time,
          duration: 60,
          zone: 'gym',
          status: 'confirmed'
        },
        {
          id: 'booking2',
          clientId: 'client2',
          trainerId: 'trainer2',
          trainerName: 'Entrenador Jane',
          date,
          time,
          duration: 60,
          zone: 'gabinete',
          status: 'confirmed'
        }
      ]

      mockBookingRepository.getByDate.mockResolvedValue(existingBookings)

      const result = await bookingModel.getAllZonesOccupancy(date, time)

      expect(result).toEqual({
        gym: 1,
        gabinete: 1
      })
    })
  })
})