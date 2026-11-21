import { parseISO } from 'date-fns';
import { Booking, ZoneType } from '../types';
import { BookingValidationError, InvalidTimeZoneError } from '../types/errors';
import { isValidTimeZone, zonedDateTimeToUtc } from '../utils/timezone';
import { BookingModel } from './BookingModel';
import { ProgramModel } from './ProgramModel';

export interface CreateBookingInput {
  clientId: string;
  trainerId: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  zone: ZoneType;
  timeZone: string; // zona IANA del cliente
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const BOOKING_DURATION_MINUTES = 60;

/**
 * Casos de uso que coordinan reservas y programas: reservar (consume una sesión)
 * y cancelar (devuelve la sesión). Se ejecuta en el backend (Edge Function)
 * y, en modo local, en el navegador.
 */
export class BookingCommandsModel {
  constructor(
    private bookingModel: BookingModel,
    private programModel: ProgramModel
  ) {}

  async createBooking(input: CreateBookingInput, now: Date): Promise<Booking> {
    if (!isValidTimeZone(input.timeZone)) {
      throw new InvalidTimeZoneError(input.timeZone);
    }
    if (!DATE_PATTERN.test(input.date) || !TIME_PATTERN.test(input.time)) {
      throw new BookingValidationError('La fecha o la hora no tienen un formato válido');
    }

    const trainer = await this.bookingModel.getTrainerById(input.trainerId);
    if (!trainer) {
      throw new BookingValidationError('El entrenador no existe');
    }

    const created = await this.bookingModel.createBooking(
      {
        clientId: input.clientId,
        trainerId: input.trainerId,
        trainerName: `Entrenador ${trainer.name}`,
        date: parseISO(input.date),
        time: input.time,
        duration: BOOKING_DURATION_MINUTES,
        zone: input.zone,
        status: 'confirmed',
        startsAt: zonedDateTimeToUtc(input.date, input.time, input.timeZone),
        clientTimezone: input.timeZone,
      },
      now
    );

    const consumedProgram = await this.programModel.consumeSessionForClient(input.clientId);
    if (!consumedProgram) {
      return created;
    }

    // Se registra de qué programa salió la sesión para poder devolverla al cancelar
    await this.bookingModel.attachProgram(created.id, consumedProgram.id);
    return { ...created, programId: consumedProgram.id };
  }

  async cancelBooking(bookingId: string, clientId: string, now: Date): Promise<Booking> {
    const cancelled = await this.bookingModel.cancelBooking(bookingId, clientId, now);

    if (cancelled.programId) {
      await this.programModel.restoreSession(cancelled.programId);
    }
    return cancelled;
  }
}
