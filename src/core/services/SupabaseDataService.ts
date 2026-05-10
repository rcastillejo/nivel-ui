import type { SupabaseClient } from '@supabase/supabase-js';
import { addWeeks, format, startOfWeek } from 'date-fns';
import { Booking, Client, Program, Trainer, TrainerSchedule } from '../types';
import {
  IBookingRepository,
  IClientRepository,
  IDataService,
  IProgramRepository,
  ITrainerRepository,
} from '../repositories';
import {
  BookingMapper,
  ClientMapper,
  ProgramMapper,
  TrainerMapper,
  TrainerScheduleMapper,
} from '../mappers';
import { BookingRow, ProgramRow, TrainerRow, TrainerScheduleRow, UserProfileRow } from '../types/supabase';

// Number of rolling calendar weeks written on each saveSchedule() call
const SCHEDULE_WEEKS = 4;

export class SupabaseClientRepository implements IClientRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAll(): Promise<Client[]> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('role', 'client');
    if (error) throw new Error(error.message);
    return (data as UserProfileRow[]).map((row) =>
      ClientMapper.toDomain(row, row.email ?? '', row.phone ?? ''),
    );
  }

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    const row = data as UserProfileRow;
    return ClientMapper.toDomain(row, row.email ?? '', row.phone ?? '');
  }

  async getByEmail(email: string): Promise<Client | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    if (error) return null;
    const row = data as UserProfileRow;
    return ClientMapper.toDomain(row, row.email ?? '', row.phone ?? '');
  }

  async save(client: Client): Promise<void> {
    const row = {
      id: client.id,
      role: 'client' as const,
      full_name: client.name,
      email: client.email,
      phone: client.phone,
    };
    const { error } = await this.client.from('user_profiles').upsert(row);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('user_profiles')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }
}

export class SupabaseTrainerRepository implements ITrainerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAll(): Promise<Trainer[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [trainersResult, scheduleResult] = await Promise.all([
      this.client.from('trainers').select('*').eq('is_active', true),
      this.client
        .from('trainer_schedules')
        .select('*')
        .eq('date', today)
        .eq('is_available', true),
    ]);
    if (trainersResult.error) throw new Error(trainersResult.error.message);
    if (scheduleResult.error) throw new Error(scheduleResult.error.message);

    const slotsByTrainer = new Map<string, string[]>();
    for (const row of scheduleResult.data as TrainerScheduleRow[]) {
      const slots = slotsByTrainer.get(row.trainer_id) ?? [];
      slots.push(row.time_slot);
      slotsByTrainer.set(row.trainer_id, slots);
    }

    return (trainersResult.data as TrainerRow[]).map((row) =>
      TrainerMapper.toDomain(row, (slotsByTrainer.get(row.id) ?? []).sort()),
    );
  }

  async getById(id: string): Promise<Trainer | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [trainerResult, scheduleResult] = await Promise.all([
      this.client.from('trainers').select('*').eq('id', id).single(),
      this.client
        .from('trainer_schedules')
        .select('*')
        .eq('trainer_id', id)
        .eq('date', today)
        .eq('is_available', true),
    ]);
    if (trainerResult.error) return null;
    const slots = (scheduleResult.data as TrainerScheduleRow[] | null)?.map(
      (r) => r.time_slot,
    ) ?? [];
    return TrainerMapper.toDomain(trainerResult.data as TrainerRow, slots.sort());
  }

  async save(trainer: Trainer): Promise<void> {
    const row = { id: trainer.id, name: trainer.name, is_active: true };
    const { error } = await this.client.from('trainers').upsert(row);
    if (error) throw new Error(error.message);
  }

  async saveSchedule(schedule: TrainerSchedule): Promise<void> {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const rows = Array.from({ length: SCHEDULE_WEEKS }, (_, i) =>
      TrainerScheduleMapper.toInsertRows(schedule, addWeeks(weekStart, i)),
    ).flat();

    const { error } = await this.client
      .from('trainer_schedules')
      .upsert(rows, { onConflict: 'trainer_id,date,time_slot' });
    if (error) throw new Error(error.message);
  }

  async getSchedule(trainerId: string): Promise<TrainerSchedule | null> {
    const [scheduleResult, trainerResult] = await Promise.all([
      this.client
        .from('trainer_schedules')
        .select('*')
        .eq('trainer_id', trainerId),
      this.client.from('trainers').select('name').eq('id', trainerId).single(),
    ]);
    if (scheduleResult.error) throw new Error(scheduleResult.error.message);

    const rows = scheduleResult.data as TrainerScheduleRow[];
    if (rows.length === 0) return null;

    const trainerName = (trainerResult.data as Pick<TrainerRow, 'name'> | null)?.name ?? '';
    return TrainerScheduleMapper.toDomain(rows, trainerId, trainerName);
  }
}

export class SupabaseBookingRepository implements IBookingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAll(): Promise<Booking[]> {
    const { data, error } = await this.client.from('bookings').select('*');
    if (error) throw new Error(error.message);
    return (data as BookingRow[]).map(BookingMapper.toDomain);
  }

  async getById(id: string): Promise<Booking | null> {
    const { data, error } = await this.client
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return BookingMapper.toDomain(data as BookingRow);
  }

  async getByDate(date: Date): Promise<Booking[]> {
    const { data, error } = await this.client
      .from('bookings')
      .select('*')
      .eq('date', format(date, 'yyyy-MM-dd'));
    if (error) throw new Error(error.message);
    return (data as BookingRow[]).map(BookingMapper.toDomain);
  }

  async getByTrainer(trainerId: string): Promise<Booking[]> {
    const { data, error } = await this.client
      .from('bookings')
      .select('*')
      .eq('trainer_id', trainerId);
    if (error) throw new Error(error.message);
    return (data as BookingRow[]).map(BookingMapper.toDomain);
  }

  async create(booking: Omit<Booking, 'id'>): Promise<Booking> {
    const { data, error } = await this.client
      .from('bookings')
      .insert(BookingMapper.toInsert(booking))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return BookingMapper.toDomain(data as BookingRow);
  }

  async save(booking: Booking): Promise<void> {
    const { id, ...rest } = booking;
    const row = { id, ...BookingMapper.toInsert(rest) };
    const { error } = await this.client.from('bookings').upsert(row);
    if (error) throw new Error(error.message);
  }

  async update(id: string, booking: Partial<Booking>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (booking.clientId   !== undefined) updates['client_id']        = booking.clientId;
    if (booking.trainerId  !== undefined) updates['trainer_id']       = booking.trainerId;
    if (booking.trainerName !== undefined) updates['trainer_name']    = booking.trainerName;
    if (booking.date       !== undefined) updates['date']             = format(booking.date, 'yyyy-MM-dd');
    if (booking.time       !== undefined) updates['time_slot']        = booking.time;
    if (booking.duration   !== undefined) updates['duration_minutes'] = booking.duration;
    if (booking.zone       !== undefined) updates['zone']             = booking.zone;
    if (booking.status     !== undefined) updates['status']           = booking.status;

    const { error } = await this.client
      .from('bookings')
      .update(updates)
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('bookings')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }
}

export class SupabaseProgramRepository implements IProgramRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAll(): Promise<Program[]> {
    const { data, error } = await this.client.from('programs').select('*');
    if (error) throw new Error(error.message);
    return (data as ProgramRow[]).map(ProgramMapper.toDomain);
  }

  async getById(id: string): Promise<Program | null> {
    const { data, error } = await this.client
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return ProgramMapper.toDomain(data as ProgramRow);
  }

  async getByTrainer(trainerId: string): Promise<Program[]> {
    const { data, error } = await this.client
      .from('programs')
      .select('*')
      .eq('trainer_id', trainerId);
    if (error) throw new Error(error.message);
    return (data as ProgramRow[]).map(ProgramMapper.toDomain);
  }

  async getByClient(clientId: string): Promise<Program[]> {
    const { data, error } = await this.client
      .from('programs')
      .select('*')
      .contains('client_ids', [clientId]);
    if (error) throw new Error(error.message);
    return (data as ProgramRow[]).map(ProgramMapper.toDomain);
  }

  async save(program: Program): Promise<void> {
    const { id, ...rest } = program;
    const row = { id, ...ProgramMapper.toInsert(rest) };
    const { error } = await this.client.from('programs').upsert(row);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('programs')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }
}

export class SupabaseDataService implements IDataService {
  readonly clients: IClientRepository;
  readonly trainers: ITrainerRepository;
  readonly bookings: IBookingRepository;
  readonly programs: IProgramRepository;

  constructor(client: SupabaseClient) {
    this.clients = new SupabaseClientRepository(client);
    this.trainers = new SupabaseTrainerRepository(client);
    this.bookings = new SupabaseBookingRepository(client);
    this.programs = new SupabaseProgramRepository(client);
  }

  async initialize(): Promise<void> {
    // Schema and seed data are managed via Supabase migrations — no client-side setup needed.
  }

  async clear(): Promise<void> {
    // No-op: clearing remote data is a destructive operation managed outside the client.
  }
}
