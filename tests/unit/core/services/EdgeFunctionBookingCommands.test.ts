import { describe, it, expect, vi } from 'vitest';
import { FunctionsHttpError, FunctionsRelayError, SupabaseClient } from '@supabase/supabase-js';
import { EdgeFunctionBookingCommands } from '@/core/services/EdgeFunctionBookingCommands';
import { BookingDto } from '@/core/types';

const dto: BookingDto = {
  id: 'b1',
  clientId: 'client1',
  trainerId: 'trainer1',
  trainerName: 'Entrenador John',
  date: '2026-11-15',
  time: '09:00',
  duration: 60,
  zone: 'gym',
  status: 'confirmed',
  startsAt: '2026-11-15T14:00:00.000Z',
  clientTimezone: 'America/Lima',
  programId: null,
};

function makeClient(result: { data: unknown; error: unknown }) {
  const invoke = vi.fn().mockResolvedValue(result);
  return { client: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}

describe('EdgeFunctionBookingCommands', () => {
  it('create invokes the bookings function and maps the DTO to a Booking', async () => {
    const { client, invoke } = makeClient({ data: { booking: dto }, error: null });

    const booking = await new EdgeFunctionBookingCommands(client).create({
      trainerId: 'trainer1',
      date: '2026-11-15',
      time: '09:00',
      zone: 'gym',
      timeZone: 'America/Lima',
    });

    expect(invoke).toHaveBeenCalledWith('bookings', {
      body: { action: 'create', trainerId: 'trainer1', date: '2026-11-15', time: '09:00', zone: 'gym', timeZone: 'America/Lima' },
    });
    expect(booking.id).toBe('b1');
    expect(booking.date).toBeInstanceOf(Date);
    expect(booking.startsAt?.toISOString()).toBe('2026-11-15T14:00:00.000Z');
  });

  it('cancel invokes the bookings function with the booking id', async () => {
    const { client, invoke } = makeClient({ data: { booking: { ...dto, status: 'cancelled' } }, error: null });

    const booking = await new EdgeFunctionBookingCommands(client).cancel('b1');

    expect(invoke).toHaveBeenCalledWith('bookings', { body: { action: 'cancel', bookingId: 'b1' } });
    expect(booking.status).toBe('cancelled');
  });

  it('surfaces the domain message returned by the backend on HTTP errors', async () => {
    const response = new Response(
      JSON.stringify({ error: { name: 'BookingCancellationNoticeError', message: 'Solo puedes cancelar con 1 hora de anticipación' } }),
      { status: 409 }
    );
    const { client } = makeClient({ data: null, error: new FunctionsHttpError(response) });

    await expect(new EdgeFunctionBookingCommands(client).cancel('b1')).rejects.toThrow(
      'Solo puedes cancelar con 1 hora de anticipación'
    );
  });

  it('falls back to a generic message when the error body is not the expected shape', async () => {
    const { client } = makeClient({ data: null, error: new FunctionsHttpError(new Response('oops', { status: 500 })) });

    await expect(new EdgeFunctionBookingCommands(client).cancel('b1')).rejects.toThrow(
      'No se pudo completar la operación. Intenta de nuevo'
    );
  });

  it('reports a connection problem for relay/network errors', async () => {
    const { client } = makeClient({ data: null, error: new FunctionsRelayError(new Error('relay')) });

    await expect(new EdgeFunctionBookingCommands(client).cancel('b1')).rejects.toThrow(
      'No se pudo conectar con el servidor. Intenta de nuevo'
    );
  });

  it('rejects an unexpected success payload', async () => {
    const { client } = makeClient({ data: { nope: true }, error: null });

    await expect(new EdgeFunctionBookingCommands(client).cancel('b1')).rejects.toThrow(
      'Respuesta inesperada del servidor'
    );
  });
});
