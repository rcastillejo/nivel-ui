import { BookingCommandsModel } from '../models/BookingCommandsModel';
import { IBookingCommands } from '../repositories';
import { Booking, CreateBookingCommand } from '../types';

/**
 * Modo local (sin Supabase): ejecuta los mismos casos de uso en el navegador.
 * La garantía de servidor solo existe con el backend real; las reglas de negocio
 * son las mismas porque viven en los Models.
 */
export class LocalBookingCommands implements IBookingCommands {
  constructor(
    private readonly commands: BookingCommandsModel,
    private readonly getClientId: () => string,
    private readonly now: () => Date = () => new Date()
  ) {}

  create(request: Omit<CreateBookingCommand, 'action'>): Promise<Booking> {
    return this.commands.createBooking({ clientId: this.getClientId(), ...request }, this.now());
  }

  cancel(bookingId: string): Promise<Booking> {
    return this.commands.cancelBooking(bookingId, this.getClientId(), this.now());
  }
}
