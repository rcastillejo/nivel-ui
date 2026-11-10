import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingModel } from '@/core/models/BookingModel'
import { IDataService } from '@/core/repositories'
import { Booking, Trainer, ZoneType } from '@/core/types'
import {
  BookingAlreadyCancelledError,
  BookingCancellationNoticeError,
  BookingCapacityError,
  BookingNotFoundError,
  BookingValidationError,
} from '@/core/types/errors'

// Mock del data service
const mockTrainerRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  getByAuthUserId: vi.fn(),
  save: vi.fn(),
  saveSchedule: vi.fn(),
  getSchedule: vi.fn()
}

const mockBookingRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  getByDate: vi.fn(),
  getByTrainer: vi.fn(),
  getByClient: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  cancelIfConfirmed: vi.fn(),
  delete: vi.fn()
}

const mockProgramRepository = {
  getAll: vi.fn(),
  getById: vi.fn(),
  getByTrainer: vi.fn(),
  getByClient: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
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
  programs: mockProgramRepository,
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
      userId: 'user1',
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
      const createdBooking = { ...validBookingData, id: 'generated-uuid' }
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      mockBookingRepository.getByDate.mockResolvedValue([])
      mockBookingRepository.create.mockResolvedValue(createdBooking)

      const result = await bookingModel.createBooking(validBookingData)

      expect(result).toEqual(createdBooking)
      expect(result.id).toBeDefined()
      expect(mockBookingRepository.create).toHaveBeenCalledWith(validBookingData)
      expect(mockBookingRepository.save).not.toHaveBeenCalled()
    })

    it('should not touch the program repository when creating a booking', async () => {
      const createdBooking = { ...validBookingData, id: 'generated-uuid' }
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      mockBookingRepository.getByDate.mockResolvedValue([])
      mockBookingRepository.create.mockResolvedValue(createdBooking)

      await bookingModel.createBooking(validBookingData)

      expect(mockProgramRepository.getByClient).not.toHaveBeenCalled()
      expect(mockProgramRepository.save).not.toHaveBeenCalled()
    })

    it('should throw error for missing client', async () => {
      const invalidBooking = { ...validBookingData, clientId: '' }

      await expect(bookingModel.createBooking(invalidBooking)).rejects.toThrow('El cliente es requerido')
    })

    it('should throw BookingValidationError for missing client', async () => {
      const invalidBooking = { ...validBookingData, clientId: '' }

      await expect(bookingModel.createBooking(invalidBooking)).rejects.toThrow(BookingValidationError)
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

    it('should throw BookingValidationError for past date', async () => {
      const invalidBooking = { ...validBookingData, date: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Yesterday

      await expect(bookingModel.createBooking(invalidBooking)).rejects.toThrow(BookingValidationError)
    })

    it('should allow a same-day booking even when the date has no time-of-day set', async () => {
      const todayAtMidnight = new Date()
      todayAtMidnight.setHours(0, 0, 0, 0)
      const sameDayBooking = { ...validBookingData, date: todayAtMidnight }

      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      mockBookingRepository.getByDate.mockResolvedValue([])
      mockBookingRepository.create.mockResolvedValue({ ...sameDayBooking, id: 'generated-uuid' })

      await expect(bookingModel.createBooking(sameDayBooking)).resolves.not.toThrow()
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

      await expect(bookingModel.createBooking(gabineteBooking)).rejects.toThrow(BookingCapacityError)
    })

    it('should throw BookingCapacityError only when the correct zone is full', async () => {
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)

      // Fill gym zone (maxCapacity = 10)
      const gymBookings: Booking[] = Array.from({ length: 10 }, (_, i): Booking => ({
        id: `booking${i}`,
        clientId: `client${i}`,
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date: validBookingData.date,
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed'
      }))

      // First call (checkAvailability): no bookings so slot is available
      mockBookingRepository.getByDate.mockResolvedValueOnce([])
      // Second call (validateCapacity): gym is full
      mockBookingRepository.getByDate.mockResolvedValue(gymBookings)

      await expect(bookingModel.createBooking(validBookingData)).rejects.toThrow(BookingCapacityError)
    })

    it('should not throw BookingCapacityError when only a different zone is full', async () => {
      const gabineteBooking = { ...validBookingData, zone: 'gabinete' as ZoneType }
      const createdBooking = { ...gabineteBooking, id: 'generated-uuid' }
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      mockBookingRepository.create.mockResolvedValue(createdBooking)

      // Fill gym zone (maxCapacity = 10) but leave gabinete empty
      const gymBookings: Booking[] = Array.from({ length: 10 }, (_, i): Booking => ({
        id: `booking${i}`,
        clientId: `client${i}`,
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date: validBookingData.date,
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed'
      }))

      // First call (checkAvailability): no bookings so slot is available
      mockBookingRepository.getByDate.mockResolvedValueOnce([])
      // Second call (validateCapacity): gym is full but gabinete has none
      mockBookingRepository.getByDate.mockResolvedValue(gymBookings)

      // Booking gabinete should succeed — gym is full but gabinete is not
      const result = await bookingModel.createBooking(gabineteBooking)

      expect(result).toMatchObject(gabineteBooking)
    })

    it('should throw BookingCapacityError when zone is full and existing booking has a different Date instance with same value', async () => {
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)

      // Different Date object, same calendar day — exposes the b.date === booking.date reference bug
      const bookingDate = new Date(validBookingData.date.getTime())
      const differentInstanceSameDay = new Date(validBookingData.date.getTime())

      const existingBookings: Booking[] = [{
        id: 'booking1',
        clientId: 'client2',
        trainerId: 'trainer1',
        trainerName: 'Entrenador John',
        date: differentInstanceSameDay,
        time: '09:00',
        duration: 60,
        zone: 'gabinete',
        status: 'confirmed'
      }]

      mockBookingRepository.getByDate.mockResolvedValueOnce([]) // checkAvailability
      mockBookingRepository.getByDate.mockResolvedValue(existingBookings) // validateCapacity

      const gabineteBooking = { ...validBookingData, date: bookingDate, zone: 'gabinete' as ZoneType }

      await expect(bookingModel.createBooking(gabineteBooking)).rejects.toThrow(BookingCapacityError)
    })

    it('should throw BookingValidationError (not generic Error) when time slot is unavailable', async () => {
      mockTrainerRepository.getById.mockResolvedValue(mockTrainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      mockBookingRepository.getByDate.mockResolvedValue([])

      const invalidBooking = { ...validBookingData, time: '12:00' } // not in available slots

      await expect(bookingModel.createBooking(invalidBooking)).rejects.toThrow(BookingValidationError)
    })
  })

  describe('getTrainers', () => {
    it('should return all trainers', async () => {
      const mockTrainers: Trainer[] = [
        { id: 'trainer1', userId: 'user1', name: 'John', availableSlots: ['09:00', '10:00'] },
        { id: 'trainer2', userId: 'user2', name: 'Jane', availableSlots: ['11:00', '12:00'] }
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
        userId: 'user1',
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
      userId: 'user1',
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
      const existingBookings: Booking[] = Array.from({ length: 10 }, (_, i): Booking => ({
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

  describe('getClientAppointments', () => {
    const now = new Date(2026, 10, 10, 9, 30) // 10-nov-2026 09:30 local

    const makeBooking = (overrides: Partial<Booking>): Booking => ({
      id: 'b',
      clientId: 'client1',
      trainerId: 'trainer1',
      trainerName: 'Entrenador John',
      date: new Date(2026, 10, 10),
      time: '09:00',
      duration: 60,
      zone: 'gym',
      status: 'confirmed',
      ...overrides
    })

    it('rejects an empty client id with a domain error', async () => {
      await expect(bookingModel.getClientAppointments('  ', now)).rejects.toThrow(
        BookingValidationError
      )
      expect(mockBookingRepository.getByClient).not.toHaveBeenCalled()
    })

    it('queries bookings only for the given client', async () => {
      mockBookingRepository.getByClient.mockResolvedValue([])

      await bookingModel.getClientAppointments('client1', now)

      expect(mockBookingRepository.getByClient).toHaveBeenCalledWith('client1')
    })

    it('returns empty lists when the client has no bookings', async () => {
      mockBookingRepository.getByClient.mockResolvedValue([])

      const result = await bookingModel.getClientAppointments('client1', now)

      expect(result).toEqual({ upcoming: [], past: [] })
    })

    it('keeps an in-progress booking as upcoming', async () => {
      const inProgress = makeBooking({ id: 'in-progress', time: '09:00', duration: 60 })
      mockBookingRepository.getByClient.mockResolvedValue([inProgress])

      const result = await bookingModel.getClientAppointments('client1', now)

      expect(result.upcoming).toEqual([inProgress])
      expect(result.past).toEqual([])
    })

    it('moves a booking to history exactly when it ends', async () => {
      const endsNow = makeBooking({ id: 'ends-now', time: '08:30', duration: 60 })
      const endsLater = makeBooking({ id: 'ends-later', time: '08:31', duration: 60 })
      mockBookingRepository.getByClient.mockResolvedValue([endsNow, endsLater])

      const result = await bookingModel.getClientAppointments('client1', now)

      expect(result.past).toEqual([endsNow])
      expect(result.upcoming).toEqual([endsLater])
    })

    it('sends cancelled bookings to history even if they are in the future', async () => {
      const cancelledFuture = makeBooking({
        id: 'cancelled-future',
        date: new Date(2026, 10, 20),
        status: 'cancelled'
      })
      mockBookingRepository.getByClient.mockResolvedValue([cancelledFuture])

      const result = await bookingModel.getClientAppointments('client1', now)

      expect(result.upcoming).toEqual([])
      expect(result.past).toEqual([cancelledFuture])
    })

    it('sorts upcoming ascending and history descending', async () => {
      const laterUpcoming = makeBooking({ id: 'later', date: new Date(2026, 10, 12), time: '10:00' })
      const soonerUpcoming = makeBooking({ id: 'sooner', date: new Date(2026, 10, 11), time: '18:00' })
      const olderPast = makeBooking({ id: 'older', date: new Date(2026, 10, 1), time: '09:00' })
      const newerPast = makeBooking({ id: 'newer', date: new Date(2026, 10, 5), time: '09:00' })
      mockBookingRepository.getByClient.mockResolvedValue([
        laterUpcoming,
        olderPast,
        soonerUpcoming,
        newerPast
      ])

      const result = await bookingModel.getClientAppointments('client1', now)

      expect(result.upcoming.map(b => b.id)).toEqual(['sooner', 'later'])
      expect(result.past.map(b => b.id)).toEqual(['newer', 'older'])
    })
  })

  describe('canCancel', () => {
    const base: Booking = {
      id: 'b1',
      clientId: 'client1',
      trainerId: 'trainer1',
      trainerName: 'Entrenador John',
      date: new Date(2026, 10, 10),
      time: '10:00',
      duration: 60,
      zone: 'gym',
      status: 'confirmed',
    }

    it('allows a gym booking with exactly 60 minutes of notice', () => {
      expect(bookingModel.canCancel(base, new Date(2026, 10, 10, 9, 0))).toBe(true)
    })

    it('rejects a gym booking with less than 60 minutes of notice', () => {
      expect(bookingModel.canCancel(base, new Date(2026, 10, 10, 9, 1))).toBe(false)
    })

    it('allows a gabinete booking with exactly 24 hours of notice', () => {
      const gabinete: Booking = { ...base, zone: 'gabinete' }
      expect(bookingModel.canCancel(gabinete, new Date(2026, 10, 9, 10, 0))).toBe(true)
    })

    it('rejects a gabinete booking with 23 hours of notice', () => {
      const gabinete: Booking = { ...base, zone: 'gabinete' }
      expect(bookingModel.canCancel(gabinete, new Date(2026, 10, 9, 11, 0))).toBe(false)
    })

    it('uses startsAt (UTC instant) when present instead of date + time', () => {
      const withStartsAt: Booking = { ...base, startsAt: new Date('2026-11-10T14:00:00.000Z') }
      expect(bookingModel.canCancel(withStartsAt, new Date('2026-11-10T13:00:00.000Z'))).toBe(true)
      expect(bookingModel.canCancel(withStartsAt, new Date('2026-11-10T13:00:01.000Z'))).toBe(false)
    })

    it('rejects cancelled bookings and bookings that already ended', () => {
      const now = new Date(2026, 10, 1, 9, 0)
      expect(bookingModel.canCancel({ ...base, status: 'cancelled' }, now)).toBe(false)
      expect(bookingModel.canCancel(base, new Date(2026, 10, 10, 12, 0))).toBe(false)
    })
  })

  describe('cancelBooking', () => {
    const now = new Date(2026, 10, 10, 6, 0)
    const confirmed: Booking = {
      id: 'b1',
      clientId: 'client1',
      trainerId: 'trainer1',
      trainerName: 'Entrenador John',
      date: new Date(2026, 10, 10),
      time: '10:00',
      duration: 60,
      zone: 'gym',
      status: 'confirmed',
      programId: 'program1',
    }

    it('cancels a confirmed booking with enough notice and returns it as cancelled', async () => {
      mockBookingRepository.getById.mockResolvedValue(confirmed)
      mockBookingRepository.cancelIfConfirmed.mockResolvedValue(true)

      const result = await bookingModel.cancelBooking('b1', 'client1', now)

      expect(mockBookingRepository.cancelIfConfirmed).toHaveBeenCalledWith('b1')
      expect(result).toEqual({ ...confirmed, status: 'cancelled' })
      expect(mockBookingRepository.update).not.toHaveBeenCalled()
    })

    it('throws BookingNotFoundError when the booking does not exist', async () => {
      mockBookingRepository.getById.mockResolvedValue(null)

      await expect(bookingModel.cancelBooking('missing', 'client1', now)).rejects.toThrow(BookingNotFoundError)
      expect(mockBookingRepository.cancelIfConfirmed).not.toHaveBeenCalled()
    })

    it('throws BookingNotFoundError (not a permission error) for another client\'s booking', async () => {
      mockBookingRepository.getById.mockResolvedValue({ ...confirmed, clientId: 'someone-else' })

      await expect(bookingModel.cancelBooking('b1', 'client1', now)).rejects.toThrow(BookingNotFoundError)
      expect(mockBookingRepository.cancelIfConfirmed).not.toHaveBeenCalled()
    })

    it('requires a client id', async () => {
      await expect(bookingModel.cancelBooking('b1', ' ', now)).rejects.toThrow(BookingValidationError)
    })

    it('throws BookingAlreadyCancelledError when the booking is already cancelled', async () => {
      mockBookingRepository.getById.mockResolvedValue({ ...confirmed, status: 'cancelled' })

      await expect(bookingModel.cancelBooking('b1', 'client1', now)).rejects.toThrow(BookingAlreadyCancelledError)
    })

    it('throws BookingValidationError when the booking already ended', async () => {
      mockBookingRepository.getById.mockResolvedValue(confirmed)

      await expect(
        bookingModel.cancelBooking('b1', 'client1', new Date(2026, 10, 10, 12, 0))
      ).rejects.toThrow(BookingValidationError)
      expect(mockBookingRepository.cancelIfConfirmed).not.toHaveBeenCalled()
    })

    it('throws BookingCancellationNoticeError for a gym booking starting in 30 minutes', async () => {
      mockBookingRepository.getById.mockResolvedValue(confirmed)

      const error = await bookingModel
        .cancelBooking('b1', 'client1', new Date(2026, 10, 10, 9, 30))
        .catch((e: unknown) => e)

      expect(error).toBeInstanceOf(BookingCancellationNoticeError)
      expect((error as BookingCancellationNoticeError).minNoticeMinutes).toBe(60)
      expect(mockBookingRepository.cancelIfConfirmed).not.toHaveBeenCalled()
    })

    it('throws BookingCancellationNoticeError for a gabinete booking starting in 23 hours', async () => {
      mockBookingRepository.getById.mockResolvedValue({ ...confirmed, zone: 'gabinete' })

      const error = await bookingModel
        .cancelBooking('b1', 'client1', new Date(2026, 10, 9, 11, 0))
        .catch((e: unknown) => e)

      expect(error).toBeInstanceOf(BookingCancellationNoticeError)
      expect((error as BookingCancellationNoticeError).minNoticeMinutes).toBe(1440)
    })

    it('throws BookingAlreadyCancelledError when another request cancelled it first (race)', async () => {
      mockBookingRepository.getById.mockResolvedValue(confirmed)
      mockBookingRepository.cancelIfConfirmed.mockResolvedValue(false)

      await expect(bookingModel.cancelBooking('b1', 'client1', now)).rejects.toThrow(BookingAlreadyCancelledError)
    })
  })

  describe('createBooking with client timezone', () => {
    const trainer: Trainer = { id: 'trainer1', userId: 'user1', name: 'John', availableSlots: ['09:00'] }
    const data: Omit<Booking, 'id'> = {
      clientId: 'client1',
      trainerId: 'trainer1',
      trainerName: 'Entrenador John',
      date: new Date(2026, 10, 10),
      time: '09:00',
      duration: 60,
      zone: 'gym',
      status: 'confirmed',
      clientTimezone: 'America/Lima',
    }

    beforeEach(() => {
      mockTrainerRepository.getById.mockResolvedValue(trainer)
      mockTrainerRepository.getSchedule.mockResolvedValue(null)
      mockBookingRepository.getByDate.mockResolvedValue([])
      mockBookingRepository.create.mockImplementation(async (b: Omit<Booking, 'id'>) => ({ ...b, id: 'new' }))
    })

    it('treats the client\'s calendar day as today even when the server is already on the next UTC day', async () => {
      // 2026-11-11T02:00Z es todavía 10 de noviembre en Lima
      const serverNow = new Date('2026-11-11T02:00:00.000Z')

      await expect(bookingModel.createBooking(data, serverNow)).resolves.toMatchObject({ id: 'new' })
    })

    it('rejects a date that is already past in the client\'s zone', async () => {
      const serverNow = new Date('2026-11-11T06:00:00.000Z') // 11 nov 01:00 en Lima

      await expect(bookingModel.createBooking(data, serverNow)).rejects.toThrow(
        'No se pueden hacer reservas en el pasado'
      )
    })
  })

  describe('attachProgram', () => {
    it('records the program a booking consumed its session from', async () => {
      mockBookingRepository.update.mockResolvedValue(undefined)

      await bookingModel.attachProgram('b1', 'program1')

      expect(mockBookingRepository.update).toHaveBeenCalledWith('b1', { programId: 'program1' })
    })
  })
})
