import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingCommandsModel } from '@/core/models/BookingCommandsModel';
import { BookingModel } from '@/core/models/BookingModel';
import { ProgramModel } from '@/core/models/ProgramModel';
import { Booking, Program, Trainer } from '@/core/types';
import { BookingCancellationNoticeError, BookingValidationError, InvalidTimeZoneError } from '@/core/types/errors';

const mockBookingModel = {
  getTrainerById: vi.fn(),
  createBooking: vi.fn(),
  cancelBooking: vi.fn(),
  attachProgram: vi.fn(),
};

const mockProgramModel = {
  consumeSessionForClient: vi.fn(),
  restoreSession: vi.fn(),
};

const trainer: Trainer = { id: 'trainer1', userId: 'u1', name: 'John', availableSlots: ['09:00'] };
const now = new Date('2026-11-10T12:00:00.000Z');

const program: Program = {
  id: 'program1',
  name: 'P',
  description: 'D',
  trainerId: 'trainer1',
  clientIds: ['client1'],
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2026, 11, 31),
  totalSessions: 10,
  usedSessions: 3,
  status: 'active',
};

describe('BookingCommandsModel', () => {
  let model: BookingCommandsModel;

  beforeEach(() => {
    vi.clearAllMocks();
    model = new BookingCommandsModel(
      mockBookingModel as unknown as BookingModel,
      mockProgramModel as unknown as ProgramModel
    );
  });

  describe('createBooking', () => {
    const input = {
      clientId: 'client1',
      trainerId: 'trainer1',
      date: '2026-11-15',
      time: '09:00',
      zone: 'gym' as const,
      timeZone: 'America/Lima',
    };

    beforeEach(() => {
      mockBookingModel.getTrainerById.mockResolvedValue(trainer);
      mockBookingModel.createBooking.mockImplementation(async (b: Omit<Booking, 'id'>) => ({ ...b, id: 'new-booking' }));
      mockProgramModel.consumeSessionForClient.mockResolvedValue(null);
    });

    it('computes startsAt in UTC from the client time zone and stores the zone used', async () => {
      await model.createBooking(input, now);

      const [created, passedNow] = mockBookingModel.createBooking.mock.calls[0];
      expect(created.startsAt.toISOString()).toBe('2026-11-15T14:00:00.000Z');
      expect(created.clientTimezone).toBe('America/Lima');
      expect(created.trainerName).toBe('Entrenador John');
      expect(created.status).toBe('confirmed');
      expect(created.duration).toBe(60);
      expect(passedNow).toBe(now);
    });

    it('takes the client id from the command input, never from elsewhere', async () => {
      await model.createBooking(input, now);

      expect(mockBookingModel.createBooking.mock.calls[0][0].clientId).toBe('client1');
    });

    it('consumes a program session and records which program it came from', async () => {
      mockProgramModel.consumeSessionForClient.mockResolvedValue({ ...program, usedSessions: 4 });

      const booking = await model.createBooking(input, now);

      expect(mockProgramModel.consumeSessionForClient).toHaveBeenCalledWith('client1');
      expect(mockBookingModel.attachProgram).toHaveBeenCalledWith('new-booking', 'program1');
      expect(booking.programId).toBe('program1');
    });

    it('does not record a program when no session was consumed', async () => {
      const booking = await model.createBooking(input, now);

      expect(mockBookingModel.attachProgram).not.toHaveBeenCalled();
      expect(booking.programId ?? null).toBeNull();
    });

    it('does not consume a session when the booking itself fails', async () => {
      mockBookingModel.createBooking.mockRejectedValue(new BookingValidationError('El horario seleccionado no está disponible'));

      await expect(model.createBooking(input, now)).rejects.toThrow('El horario seleccionado no está disponible');
      expect(mockProgramModel.consumeSessionForClient).not.toHaveBeenCalled();
    });

    it('rejects an invalid time zone before touching the database', async () => {
      await expect(model.createBooking({ ...input, timeZone: 'Mars/Olympus' }, now)).rejects.toThrow(InvalidTimeZoneError);
      expect(mockBookingModel.createBooking).not.toHaveBeenCalled();
    });

    it('rejects malformed dates and times', async () => {
      await expect(model.createBooking({ ...input, date: '15/11/2026' }, now)).rejects.toThrow(BookingValidationError);
      await expect(model.createBooking({ ...input, time: '9am' }, now)).rejects.toThrow(BookingValidationError);
      expect(mockBookingModel.createBooking).not.toHaveBeenCalled();
    });

    it('rejects an unknown trainer', async () => {
      mockBookingModel.getTrainerById.mockResolvedValue(null);

      await expect(model.createBooking(input, now)).rejects.toThrow('El entrenador no existe');
    });
  });

  describe('cancelBooking', () => {
    const cancelled: Booking = {
      id: 'b1',
      clientId: 'client1',
      trainerId: 'trainer1',
      trainerName: 'Entrenador John',
      date: new Date(2026, 10, 15),
      time: '09:00',
      duration: 60,
      zone: 'gym',
      status: 'cancelled',
      programId: 'program1',
    };

    it('cancels the booking and gives back the program session', async () => {
      mockBookingModel.cancelBooking.mockResolvedValue(cancelled);
      mockProgramModel.restoreSession.mockResolvedValue({ ...program, usedSessions: 2 });

      const result = await model.cancelBooking('b1', 'client1', now);

      expect(mockBookingModel.cancelBooking).toHaveBeenCalledWith('b1', 'client1', now);
      expect(mockProgramModel.restoreSession).toHaveBeenCalledWith('program1');
      expect(result).toBe(cancelled);
    });

    it('cancels without restoring anything when the booking has no program', async () => {
      mockBookingModel.cancelBooking.mockResolvedValue({ ...cancelled, programId: null });

      await model.cancelBooking('b1', 'client1', now);

      expect(mockProgramModel.restoreSession).not.toHaveBeenCalled();
    });

    it('does not restore a session when the cancellation is rejected', async () => {
      mockBookingModel.cancelBooking.mockRejectedValue(new BookingCancellationNoticeError('gym', 60));

      await expect(model.cancelBooking('b1', 'client1', now)).rejects.toThrow(BookingCancellationNoticeError);
      expect(mockProgramModel.restoreSession).not.toHaveBeenCalled();
    });
  });
});
