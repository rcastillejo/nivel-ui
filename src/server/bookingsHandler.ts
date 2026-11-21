import { BookingMapper } from '../core/mappers/BookingMapper';
import { BookingCommandsModel } from '../core/models/BookingCommandsModel';
import { Booking, BookingCommand, BookingDto, UserRole, ZONE_CONFIG, ZoneType } from '../core/types';
import {
  AuthenticationError,
  BookingAlreadyCancelledError,
  BookingCancellationNoticeError,
  BookingCapacityError,
  BookingDuplicateError,
  BookingNotFoundError,
  BookingRescheduleNoticeError,
  BookingValidationError,
  InvalidTimeZoneError,
} from '../core/types/errors';

export interface HandlerUser {
  id: string;
  role: UserRole;
}

export interface BookingsHandlerDeps {
  /** Valida el JWT del usuario y devuelve su id y rol, o null si no es válido. */
  authenticate(accessToken: string): Promise<HandlerUser | null>;
  commands: BookingCommandsModel;
  now(): Date;
}

export interface BookingsRequest {
  method: string;
  authorization: string | null;
  body: unknown;
}

export type BookingsResponseBody =
  | { booking: BookingDto }
  | { error: { name: string; message: string } };

export interface BookingsResponse {
  status: number;
  body: BookingsResponseBody;
}

function errorResponse(status: number, name: string, message: string): BookingsResponse {
  return { status, body: { error: { name, message } } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isZone(value: unknown): value is ZoneType {
  return typeof value === 'string' && value in ZONE_CONFIG;
}

function parseCommand(body: unknown): BookingCommand | null {
  if (!isRecord(body)) return null;

  if (body.action === 'cancel') {
    return typeof body.bookingId === 'string' && body.bookingId
      ? { action: 'cancel', bookingId: body.bookingId }
      : null;
  }

  if (body.action === 'create') {
    const { trainerId, date, time, zone, timeZone } = body;
    if (
      typeof trainerId === 'string' && trainerId &&
      typeof date === 'string' &&
      typeof time === 'string' &&
      isZone(zone) &&
      typeof timeZone === 'string'
    ) {
      return { action: 'create', trainerId, date, time, zone, timeZone };
    }
  }

  if (body.action === 'reschedule') {
    const { bookingId, trainerId, date, time, zone, timeZone } = body;
    if (
      typeof bookingId === 'string' && bookingId &&
      typeof trainerId === 'string' && trainerId &&
      typeof date === 'string' &&
      typeof time === 'string' &&
      isZone(zone) &&
      typeof timeZone === 'string'
    ) {
      return { action: 'reschedule', bookingId, trainerId, date, time, zone, timeZone };
    }
  }
  return null;
}

function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function toErrorResponse(error: unknown): BookingsResponse {
  if (error instanceof AuthenticationError) {
    return errorResponse(401, error.name, error.message);
  }
  if (error instanceof BookingNotFoundError) {
    return errorResponse(404, error.name, error.message);
  }
  if (
    error instanceof BookingCancellationNoticeError ||
    error instanceof BookingRescheduleNoticeError ||
    error instanceof BookingAlreadyCancelledError ||
    error instanceof BookingCapacityError ||
    error instanceof BookingDuplicateError
  ) {
    return errorResponse(409, error.name, error.message);
  }
  if (error instanceof BookingValidationError || error instanceof InvalidTimeZoneError) {
    return errorResponse(422, error.name, error.message);
  }
  // Los errores inesperados no filtran detalles internos al cliente
  return errorResponse(500, 'InternalError', 'Error interno del servidor');
}

function runCommand(command: BookingCommand, clientId: string, deps: BookingsHandlerDeps): Promise<Booking> {
  switch (command.action) {
    case 'create':
      return deps.commands.createBooking(
        {
          clientId,
          trainerId: command.trainerId,
          date: command.date,
          time: command.time,
          zone: command.zone,
          timeZone: command.timeZone,
        },
        deps.now()
      );
    case 'cancel':
      return deps.commands.cancelBooking(command.bookingId, clientId, deps.now());
    case 'reschedule':
      return deps.commands.rescheduleBooking(
        {
          bookingId: command.bookingId,
          clientId,
          trainerId: command.trainerId,
          date: command.date,
          time: command.time,
          zone: command.zone,
          timeZone: command.timeZone,
        },
        deps.now()
      );
  }
}

export async function handleBookingsRequest(
  request: BookingsRequest,
  deps: BookingsHandlerDeps
): Promise<BookingsResponse> {
  if (request.method !== 'POST') {
    return errorResponse(405, 'MethodNotAllowed', 'Método no permitido');
  }

  try {
    const token = bearerToken(request.authorization);
    if (!token) {
      return errorResponse(401, 'AuthenticationError', 'Sesión requerida');
    }

    const user = await deps.authenticate(token);
    if (!user) {
      return errorResponse(401, 'AuthenticationError', 'Sesión inválida');
    }
    if (user.role !== 'client') {
      return errorResponse(403, 'Forbidden', 'Solo los clientes pueden gestionar sus reservas');
    }

    const command = parseCommand(request.body);
    if (!command) {
      return errorResponse(422, 'BookingValidationError', 'Comando inválido');
    }

    // El cliente siempre sale del token, nunca del cuerpo de la petición
    const booking = await runCommand(command, user.id, deps);

    return { status: 200, body: { booking: BookingMapper.toDto(booking) } };
  } catch (error) {
    return toErrorResponse(error);
  }
}
