import { FunctionsHttpError, SupabaseClient } from '@supabase/supabase-js';
import { BookingMapper } from '../mappers/BookingMapper';
import { IBookingCommands } from '../repositories';
import { Booking, BookingCommand, BookingDto, CreateBookingCommand } from '../types';

const FUNCTION_NAME = 'bookings';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBookingDto(value: unknown): value is BookingDto {
  return isRecord(value) && typeof value.id === 'string' && typeof value.date === 'string';
}

async function readErrorMessage(error: FunctionsHttpError): Promise<string> {
  const fallback = 'No se pudo completar la operación. Intenta de nuevo';
  try {
    const payload: unknown = await error.context.json();
    if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string') {
      return payload.error.message;
    }
  } catch {
    // El cuerpo no es JSON: se usa el mensaje genérico
  }
  return fallback;
}

/** Ejecuta los comandos de reserva en la Edge Function `bookings` (reglas garantizadas en el servidor). */
export class EdgeFunctionBookingCommands implements IBookingCommands {
  constructor(private readonly client: SupabaseClient) {}

  create(request: Omit<CreateBookingCommand, 'action'>): Promise<Booking> {
    return this.invoke({ action: 'create', ...request });
  }

  cancel(bookingId: string): Promise<Booking> {
    return this.invoke({ action: 'cancel', bookingId });
  }

  private async invoke(command: BookingCommand): Promise<Booking> {
    const { data, error } = await this.client.functions.invoke(FUNCTION_NAME, { body: command });

    if (error) {
      if (error instanceof FunctionsHttpError) {
        throw new Error(await readErrorMessage(error));
      }
      throw new Error('No se pudo conectar con el servidor. Intenta de nuevo');
    }

    if (!isRecord(data) || !isBookingDto(data.booking)) {
      throw new Error('Respuesta inesperada del servidor');
    }
    return BookingMapper.fromDto(data.booking);
  }
}
