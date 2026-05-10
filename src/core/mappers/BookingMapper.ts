import { parseISO, format } from 'date-fns';
import { Booking } from '../types';
import { BookingInsert, BookingRow } from '../types/supabase';

export class BookingMapper {
  static toDomain(row: BookingRow): Booking {
    return {
      id: row.id,
      clientId: row.client_id,
      trainerId: row.trainer_id,
      trainerName: row.trainer_name,
      date: parseISO(row.date),
      time: row.time_slot,
      duration: row.duration_minutes,
      zone: row.zone,
      status: row.status,
    };
  }

  static toInsert(booking: Omit<Booking, 'id'>): BookingInsert {
    return {
      client_id: booking.clientId,
      trainer_id: booking.trainerId,
      trainer_name: booking.trainerName,
      date: format(booking.date, 'yyyy-MM-dd'),
      time_slot: booking.time,
      duration_minutes: booking.duration,
      zone: booking.zone,
      status: booking.status,
    };
  }
}
