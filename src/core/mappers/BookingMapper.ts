import { parseISO, format } from 'date-fns';
import { Booking, BookingDto } from '../types';
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
      startsAt: row.starts_at ? new Date(row.starts_at) : undefined,
      clientTimezone: row.client_timezone ?? undefined,
      programId: row.program_id,
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
      starts_at: booking.startsAt ? booking.startsAt.toISOString() : null,
      client_timezone: booking.clientTimezone ?? null,
      program_id: booking.programId ?? null,
    };
  }

  static toDto(booking: Booking): BookingDto {
    return {
      id: booking.id,
      clientId: booking.clientId,
      trainerId: booking.trainerId,
      trainerName: booking.trainerName,
      date: format(booking.date, 'yyyy-MM-dd'),
      time: booking.time,
      duration: booking.duration,
      zone: booking.zone,
      status: booking.status,
      startsAt: booking.startsAt ? booking.startsAt.toISOString() : null,
      clientTimezone: booking.clientTimezone ?? null,
      programId: booking.programId ?? null,
    };
  }

  static fromDto(dto: BookingDto): Booking {
    return {
      id: dto.id,
      clientId: dto.clientId,
      trainerId: dto.trainerId,
      trainerName: dto.trainerName,
      date: parseISO(dto.date),
      time: dto.time,
      duration: dto.duration,
      zone: dto.zone,
      status: dto.status,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      clientTimezone: dto.clientTimezone ?? undefined,
      programId: dto.programId,
    };
  }
}
