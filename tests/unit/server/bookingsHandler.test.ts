import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleBookingsRequest, BookingsHandlerDeps } from '@/server/bookingsHandler';
import { BookingCommandsModel } from '@/core/models/BookingCommandsModel';
import { Booking } from '@/core/types';
import {
  BookingAlreadyCancelledError,
  BookingCancellationNoticeError,
  BookingCapacityError,
  BookingNotFoundError,
  BookingValidationError,
  InvalidTimeZoneError,
} from '@/core/types/errors';

const commands = {
  createBooking: vi.fn(),
  cancelBooking: vi.fn(),
};

const fixedNow = new Date('2026-11-10T12:00:00.000Z');

const booking: Booking = {
  id: 'b1',
  clientId: 'client1',
  trainerId: 'trainer1',
  trainerName: 'Entrenador John',
  date: new Date(2026, 10, 15),
  time: '09:00',
  duration: 60,
  zone: 'gym',
  status: 'confirmed',
  startsAt: new Date('2026-11-15T14:00:00.000Z'),
  clientTimezone: 'America/Lima',
  programId: null,
};

const createBody = { action: 'create', trainerId: 'trainer1', date: '2026-11-15', time: '09:00', zone: 'gym', timeZone: 'America/Lima' };

describe('handleBookingsRequest', () => {
  let deps: BookingsHandlerDeps;
  const authenticate = vi.fn();

  const call = (overrides: { method?: string; authorization?: string | null; body?: unknown } = {}) =>
    handleBookingsRequest(
      {
        method: overrides.method ?? 'POST',
        authorization: overrides.authorization === undefined ? 'Bearer good-token' : overrides.authorization,
        body: overrides.body === undefined ? createBody : overrides.body,
      },
      deps
    );

  beforeEach(() => {
    vi.clearAllMocks();
    authenticate.mockResolvedValue({ id: 'client1', role: 'client' });
    commands.createBooking.mockResolvedValue(booking);
    commands.cancelBooking.mockResolvedValue({ ...booking, status: 'cancelled' });
    deps = {
      authenticate,
      commands: commands as unknown as BookingCommandsModel,
      now: () => fixedNow,
    };
  });

  describe('authentication and authorization', () => {
    it('rejects non-POST methods with 405', async () => {
      expect((await call({ method: 'GET' })).status).toBe(405);
    });

    it('rejects a missing Authorization header with 401', async () => {
      expect((await call({ authorization: null })).status).toBe(401);
      expect(authenticate).not.toHaveBeenCalled();
    });

    it('rejects a malformed Authorization header with 401', async () => {
      expect((await call({ authorization: 'Basic abc' })).status).toBe(401);
    });

    it('rejects an invalid token with 401', async () => {
      authenticate.mockResolvedValue(null);

      expect((await call()).status).toBe(401);
      expect(commands.createBooking).not.toHaveBeenCalled();
    });

    it('rejects non-client roles with 403', async () => {
      authenticate.mockResolvedValue({ id: 'trainer-user', role: 'trainer' });

      expect((await call()).status).toBe(403);
      expect(commands.createBooking).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates the booking for the authenticated user and returns a DTO', async () => {
      const response = await call();

      expect(response.status).toBe(200);
      expect(commands.createBooking).toHaveBeenCalledWith(
        { clientId: 'client1', trainerId: 'trainer1', date: '2026-11-15', time: '09:00', zone: 'gym', timeZone: 'America/Lima' },
        fixedNow
      );
      expect(response.body).toMatchObject({
        booking: { id: 'b1', date: '2026-11-15', startsAt: '2026-11-15T14:00:00.000Z', clientTimezone: 'America/Lima' },
      });
    });

    it('ignores a clientId smuggled in the body', async () => {
      await call({ body: { ...createBody, clientId: 'victim' } });

      expect(commands.createBooking.mock.calls[0][0].clientId).toBe('client1');
    });

    it('maps capacity errors to 409', async () => {
      commands.createBooking.mockRejectedValue(new BookingCapacityError('gabinete', 1, 1));

      expect((await call()).status).toBe(409);
    });

    it('maps validation and time zone errors to 422', async () => {
      commands.createBooking.mockRejectedValue(new BookingValidationError('x'));
      expect((await call()).status).toBe(422);

      commands.createBooking.mockRejectedValue(new InvalidTimeZoneError('Mars/Olympus'));
      expect((await call()).status).toBe(422);
    });
  });

  describe('cancel', () => {
    const cancelBody = { action: 'cancel', bookingId: 'b1' };

    it('cancels using the authenticated user and the server clock', async () => {
      const response = await call({ body: cancelBody });

      expect(response.status).toBe(200);
      expect(commands.cancelBooking).toHaveBeenCalledWith('b1', 'client1', fixedNow);
      expect(response.body).toMatchObject({ booking: { id: 'b1', status: 'cancelled' } });
    });

    it('maps a missing or foreign booking to 404', async () => {
      commands.cancelBooking.mockRejectedValue(new BookingNotFoundError('b1'));

      expect((await call({ body: cancelBody })).status).toBe(404);
    });

    it('maps notice and already-cancelled errors to 409 keeping the domain message', async () => {
      commands.cancelBooking.mockRejectedValue(new BookingCancellationNoticeError('gym', 60));
      const notice = await call({ body: cancelBody });
      expect(notice.status).toBe(409);
      expect(notice.body).toEqual({
        error: { name: 'BookingCancellationNoticeError', message: expect.stringContaining('1 hora') },
      });

      commands.cancelBooking.mockRejectedValue(new BookingAlreadyCancelledError('b1'));
      expect((await call({ body: cancelBody })).status).toBe(409);
    });
  });

  describe('input validation', () => {
    it.each([
      ['null body', null],
      ['unknown action', { action: 'delete', bookingId: 'b1' }],
      ['cancel without bookingId', { action: 'cancel' }],
      ['create with missing fields', { action: 'create', trainerId: 'trainer1' }],
      ['create with an invalid zone', { ...createBody, zone: 'pool' }],
      ['non-string field', { ...createBody, time: 900 }],
    ])('rejects %s with 422', async (_label, body) => {
      const response = await call({ body });

      expect(response.status).toBe(422);
      expect(commands.createBooking).not.toHaveBeenCalled();
      expect(commands.cancelBooking).not.toHaveBeenCalled();
    });
  });

  describe('unexpected errors', () => {
    it('returns 500 without leaking internal details', async () => {
      commands.createBooking.mockRejectedValue(new Error('connection to db.internal:5432 refused'));

      const response = await call();

      expect(response.status).toBe(500);
      expect(JSON.stringify(response.body)).not.toContain('db.internal');
    });
  });
});
