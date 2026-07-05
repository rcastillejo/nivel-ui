import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SupabaseBookingRepository,
  SupabaseClientRepository,
  SupabaseProgramRepository,
  SupabaseTrainerRepository,
  SupabaseDataService,
} from '@/core/services/SupabaseDataService';
import { BookingRow, ProgramRow, TrainerRow, TrainerScheduleRow, UserProfileRow } from '@/core/types/supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase query-builder mock.
 *
 * The builder is thenable so `await chain.eq(...)` resolves to `result`.
 * Individual terminal methods (.single, .upsert) can be overridden per test.
 */
function makeBuilder(result: { data: unknown; error: { message: string } | null }) {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    // Makes the chain itself awaitable (Supabase v2 PostgrestBuilder pattern)
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function makeClient(builder: ReturnType<typeof makeBuilder>) {
  return { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Row fixtures
// ---------------------------------------------------------------------------

const bookingRow: BookingRow = {
  id: 'b1',
  client_id: 'c1',
  trainer_id: 't1',
  trainer_name: 'Diego Lamas',
  date: '2026-05-11',
  time_slot: '09:00',
  duration_minutes: 60,
  zone: 'gym',
  status: 'confirmed',
  created_at: '2026-05-01T00:00:00Z',
};

const profileRow: UserProfileRow = {
  id: 'c1',
  role: 'client',
  full_name: 'María González',
  email: 'maria@example.com',
  phone: '+34 611 000 001',
  created_at: '2026-01-01T00:00:00Z',
};

const trainerRow: TrainerRow = {
  id: 't1',
  user_id: 'u1',
  name: 'Diego Lamas',
  email: 'diego@example.com',
  specialization: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const scheduleRow: TrainerScheduleRow = {
  id: 's1',
  trainer_id: 't1',
  date: '2026-05-11',
  time_slot: '09:00',
  is_available: true,
  created_at: '2026-01-01T00:00:00Z',
};

const programRow: ProgramRow = {
  id: 'p1',
  name: 'Programa Fuerza',
  description: 'Desc',
  trainer_id: 't1',
  client_ids: ['c1'],
  start_date: '2026-01-01',
  end_date: '2026-06-30',
  total_sessions: 20,
  used_sessions: 5,
  status: 'active',
  previous_program_id: null,
  created_at: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// SupabaseBookingRepository
// ---------------------------------------------------------------------------

describe('SupabaseBookingRepository', () => {
  describe('getAll', () => {
    it('queries the bookings table and maps rows to domain Bookings', async () => {
      const builder = makeBuilder({ data: [bookingRow], error: null });
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      const result = await repo.getAll();

      expect(client.from).toHaveBeenCalledWith('bookings');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('b1');
      expect(result[0].clientId).toBe('c1');
      expect(result[0].time).toBe('09:00');
      expect(result[0].duration).toBe(60);
      expect(result[0].date).toBeInstanceOf(Date);
    });

    it('throws when Supabase returns an error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'DB error' } });
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      await expect(repo.getAll()).rejects.toThrow('DB error');
    });
  });

  describe('getByDate', () => {
    it('filters by formatted date string', async () => {
      const builder = makeBuilder({ data: [bookingRow], error: null });
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      const date = new Date('2026-05-11');
      await repo.getByDate(date);

      expect(builder.eq).toHaveBeenCalledWith('date', '2026-05-11');
    });
  });

  describe('getById', () => {
    it('returns null when Supabase returns an error (not found)', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'not found' } });
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      const result = await repo.getById('unknown');
      expect(result).toBeNull();
    });

    it('returns a mapped Booking when found', async () => {
      const builder = makeBuilder({ data: bookingRow, error: null });
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      const result = await repo.getById('b1');
      expect(result?.id).toBe('b1');
    });
  });

  describe('getByTrainer', () => {
    it('filters by trainer_id', async () => {
      const builder = makeBuilder({ data: [bookingRow], error: null });
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      await repo.getByTrainer('t1');

      expect(builder.eq).toHaveBeenCalledWith('trainer_id', 't1');
    });
  });

  describe('create', () => {
    it('inserts without id, selects the created row, and returns a mapped Booking', async () => {
      const builder = makeBuilder({ data: bookingRow, error: null });
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      const result = await repo.create({
        clientId: 'c1',
        trainerId: 't1',
        trainerName: 'Diego Lamas',
        date: new Date('2026-05-11'),
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed',
      });

      expect(client.from).toHaveBeenCalledWith('bookings');
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: 'c1', time_slot: '09:00' }),
      );
      expect(builder.insert).toHaveBeenCalledWith(
        expect.not.objectContaining({ id: expect.anything() }),
      );
      expect(builder.select).toHaveBeenCalled();
      expect(builder.single).toHaveBeenCalled();
      expect(result.id).toBe('b1');
      expect(result.clientId).toBe('c1');
    });

    it('throws when Supabase returns an error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'insert failed' } });
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      await expect(
        repo.create({
          clientId: 'c1',
          trainerId: 't1',
          trainerName: 'Diego',
          date: new Date('2026-05-11'),
          time: '09:00',
          duration: 60,
          zone: 'gym',
          status: 'confirmed',
        }),
      ).rejects.toThrow('insert failed');
    });
  });

  describe('save', () => {
    it('upserts a row built from BookingMapper', async () => {
      const builder = makeBuilder({ data: null, error: null });
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      await repo.save({
        id: 'b1',
        clientId: 'c1',
        trainerId: 't1',
        trainerName: 'Diego',
        date: new Date('2026-05-11'),
        time: '09:00',
        duration: 60,
        zone: 'gym',
        status: 'confirmed',
      });

      expect(client.from).toHaveBeenCalledWith('bookings');
      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'b1', client_id: 'c1', time_slot: '09:00' }),
      );
    });
  });

  describe('update', () => {
    it('maps partial domain fields to column names and calls update', async () => {
      const builder = makeBuilder({ data: null, error: null });
      // update() returns the builder; the final eq() resolves via the thenable
      (builder.update as ReturnType<typeof vi.fn>).mockReturnValue(builder);
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      await repo.update('b1', { status: 'cancelled', time: '10:00' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled', time_slot: '10:00' }),
      );
      expect(builder.eq).toHaveBeenCalledWith('id', 'b1');
    });

    it('does not include undefined fields in the update payload', async () => {
      const builder = makeBuilder({ data: null, error: null });
      (builder.update as ReturnType<typeof vi.fn>).mockReturnValue(builder);
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      await repo.update('b1', { status: 'cancelled' });

      const [updateArg] = (builder.update as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(Object.keys(updateArg)).toEqual(['status']);
    });
  });

  describe('delete', () => {
    it('calls delete on the bookings table with the given id', async () => {
      const builder = makeBuilder({ data: null, error: null });
      (builder.delete as ReturnType<typeof vi.fn>).mockReturnValue(builder);
      const client = makeClient(builder);
      const repo = new SupabaseBookingRepository(client);

      await repo.delete('b1');

      expect(client.from).toHaveBeenCalledWith('bookings');
      expect(builder.eq).toHaveBeenCalledWith('id', 'b1');
    });
  });
});

// ---------------------------------------------------------------------------
// SupabaseClientRepository
// ---------------------------------------------------------------------------

describe('SupabaseClientRepository', () => {
  describe('getAll', () => {
    it('filters by role=client and maps rows to domain Clients', async () => {
      const builder = makeBuilder({ data: [profileRow], error: null });
      const client = makeClient(builder);
      const repo = new SupabaseClientRepository(client);

      const result = await repo.getAll();

      expect(builder.eq).toHaveBeenCalledWith('role', 'client');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
      expect(result[0].email).toBe('maria@example.com');
      expect(result[0].name).toBe('María González');
    });

    it('falls back to email as name when full_name is null', async () => {
      const row: UserProfileRow = { ...profileRow, full_name: null };
      const builder = makeBuilder({ data: [row], error: null });
      const client = makeClient(builder);
      const repo = new SupabaseClientRepository(client);

      const result = await repo.getAll();

      expect(result[0].name).toBe('maria@example.com');
    });
  });

  describe('getById', () => {
    it('returns null on error', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'not found' } });
      const client = makeClient(builder);
      const repo = new SupabaseClientRepository(client);

      expect(await repo.getById('unknown')).toBeNull();
    });

    it('returns a mapped Client when found', async () => {
      const builder = makeBuilder({ data: profileRow, error: null });
      const client = makeClient(builder);
      const repo = new SupabaseClientRepository(client);

      const result = await repo.getById('c1');
      expect(result?.id).toBe('c1');
      expect(result?.phone).toBe('+34 611 000 001');
    });
  });

  describe('getByEmail', () => {
    it('filters by email column', async () => {
      const builder = makeBuilder({ data: profileRow, error: null });
      const client = makeClient(builder);
      const repo = new SupabaseClientRepository(client);

      await repo.getByEmail('maria@example.com');

      expect(builder.eq).toHaveBeenCalledWith('email', 'maria@example.com');
    });
  });

  describe('save', () => {
    it('upserts with role=client and mapped fields', async () => {
      const builder = makeBuilder({ data: null, error: null });
      const client = makeClient(builder);
      const repo = new SupabaseClientRepository(client);

      await repo.save({
        id: 'c1',
        name: 'María',
        email: 'maria@example.com',
        phone: '+34 000',
        status: 'active',
        createdAt: new Date(),
      });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1', role: 'client', full_name: 'María' }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// SupabaseTrainerRepository
// ---------------------------------------------------------------------------

describe('SupabaseTrainerRepository', () => {
  describe('getAll', () => {
    it('fetches trainers and today schedule in parallel, builds Trainer with available slots', async () => {
      // Two separate from() calls — one for trainers, one for trainer_schedules
      const trainersBuilder = makeBuilder({ data: [trainerRow], error: null });
      const scheduleBuilder = makeBuilder({ data: [scheduleRow], error: null });

      let call = 0;
      const mockClient = {
        from: vi.fn().mockImplementation(() => (call++ === 0 ? trainersBuilder : scheduleBuilder)),
      } as unknown as SupabaseClient;

      const repo = new SupabaseTrainerRepository(mockClient);
      const result = await repo.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
      expect(result[0].availableSlots).toContain('09:00');
    });

    it('returns trainers with empty slots when no schedule rows exist for today', async () => {
      const trainersBuilder = makeBuilder({ data: [trainerRow], error: null });
      const scheduleBuilder = makeBuilder({ data: [], error: null });

      let call = 0;
      const mockClient = {
        from: vi.fn().mockImplementation(() => (call++ === 0 ? trainersBuilder : scheduleBuilder)),
      } as unknown as SupabaseClient;

      const repo = new SupabaseTrainerRepository(mockClient);
      const result = await repo.getAll();

      expect(result[0].availableSlots).toEqual([]);
    });
  });

  describe('getByAuthUserId', () => {
    it('returns null when no trainer matches the auth user id', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'not found' } });
      const client = makeClient(builder);

      const repo = new SupabaseTrainerRepository(client);
      const result = await repo.getByAuthUserId('unknown-user');

      expect(result).toBeNull();
    });

    it('returns the trainer with today available slots when found', async () => {
      const trainerBuilder = makeBuilder({ data: trainerRow, error: null });
      const scheduleBuilder = makeBuilder({ data: [scheduleRow], error: null });

      let call = 0;
      const mockClient = {
        from: vi.fn().mockImplementation(() => (call++ === 0 ? trainerBuilder : scheduleBuilder)),
      } as unknown as SupabaseClient;

      const repo = new SupabaseTrainerRepository(mockClient);
      const result = await repo.getByAuthUserId('u1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('t1');
      expect(result!.userId).toBe('u1');
      expect(result!.availableSlots).toContain('09:00');
    });
  });

  describe('getSchedule', () => {
    it('returns null when no schedule rows exist for trainer', async () => {
      const scheduleBuilder = makeBuilder({ data: [], error: null });
      const trainerBuilder = makeBuilder({ data: { name: 'Diego' }, error: null });

      let call = 0;
      const mockClient = {
        from: vi.fn().mockImplementation(() => (call++ === 0 ? scheduleBuilder : trainerBuilder)),
      } as unknown as SupabaseClient;

      const repo = new SupabaseTrainerRepository(mockClient);
      const result = await repo.getSchedule('t1');

      expect(result).toBeNull();
    });

    it('returns a TrainerSchedule built from schedule rows', async () => {
      const scheduleBuilder = makeBuilder({ data: [scheduleRow], error: null });
      const trainerBuilder = makeBuilder({ data: { name: 'Diego Lamas' }, error: null });

      let call = 0;
      const mockClient = {
        from: vi.fn().mockImplementation(() => (call++ === 0 ? scheduleBuilder : trainerBuilder)),
      } as unknown as SupabaseClient;

      const repo = new SupabaseTrainerRepository(mockClient);
      const result = await repo.getSchedule('t1');

      expect(result).not.toBeNull();
      expect(result!.trainerId).toBe('t1');
      expect(result!.trainerName).toBe('Diego Lamas');
    });
  });

  describe('saveSchedule', () => {
    it('upserts rows for SCHEDULE_WEEKS calendar weeks', async () => {
      const builder = makeBuilder({ data: null, error: null });
      const client = makeClient(builder);
      const repo = new SupabaseTrainerRepository(client);

      const schedule = {
        trainerId: 't1',
        trainerName: 'Diego',
        weeklySchedule: [
          { day: 'Lunes', slots: [{ time: '09:00', available: true }] },
          { day: 'Martes', slots: [] },
          { day: 'Miércoles', slots: [] },
          { day: 'Jueves', slots: [] },
          { day: 'Viernes', slots: [] },
          { day: 'Sábado', slots: [] },
        ],
      };

      await repo.saveSchedule(schedule);

      expect(builder.upsert).toHaveBeenCalledOnce();
      const [rows] = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls[0];
      // 1 slot × 4 weeks = 4 rows
      expect(rows).toHaveLength(4);
      expect(rows[0].trainer_id).toBe('t1');
      expect(rows[0].time_slot).toBe('09:00');
    });
  });
});

// ---------------------------------------------------------------------------
// SupabaseProgramRepository
// ---------------------------------------------------------------------------

describe('SupabaseProgramRepository', () => {
  describe('getAll', () => {
    it('maps ProgramRows to domain Programs', async () => {
      const builder = makeBuilder({ data: [programRow], error: null });
      const client = makeClient(builder);
      const repo = new SupabaseProgramRepository(client);

      const result = await repo.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
      expect(result[0].totalSessions).toBe(20);
      expect(result[0].startDate).toBeInstanceOf(Date);
    });
  });

  describe('getByClient', () => {
    it('uses .contains() with a JSON-stringified array, since client_ids is jsonb', async () => {
      const builder = makeBuilder({ data: [programRow], error: null });
      const client = makeClient(builder);
      const repo = new SupabaseProgramRepository(client);

      await repo.getByClient('c1');

      expect(builder.contains).toHaveBeenCalledWith('client_ids', JSON.stringify(['c1']));
    });
  });

  describe('getByTrainer', () => {
    it('filters by trainer_id', async () => {
      const builder = makeBuilder({ data: [programRow], error: null });
      const client = makeClient(builder);
      const repo = new SupabaseProgramRepository(client);

      await repo.getByTrainer('t1');

      expect(builder.eq).toHaveBeenCalledWith('trainer_id', 't1');
    });
  });

  describe('save', () => {
    it('upserts with both id and ProgramMapper fields', async () => {
      const builder = makeBuilder({ data: null, error: null });
      const client = makeClient(builder);
      const repo = new SupabaseProgramRepository(client);

      await repo.save({
        id: 'p1',
        name: 'Fuerza',
        description: 'Desc',
        trainerId: 't1',
        clientIds: ['c1'],
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        totalSessions: 20,
        usedSessions: 5,
        status: 'active',
      });

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1', trainer_id: 't1', total_sessions: 20 }),
      );
    });
  });

  describe('getById', () => {
    it('returns null when not found', async () => {
      const builder = makeBuilder({ data: null, error: { message: 'not found' } });
      const client = makeClient(builder);
      const repo = new SupabaseProgramRepository(client);

      expect(await repo.getById('unknown')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// SupabaseDataService
// ---------------------------------------------------------------------------

describe('SupabaseDataService', () => {
  it('exposes clients, trainers, bookings and programs repositories', () => {
    const builder = makeBuilder({ data: [], error: null });
    const client = makeClient(builder);
    const service = new SupabaseDataService(client);

    expect(service.clients).toBeDefined();
    expect(service.trainers).toBeDefined();
    expect(service.bookings).toBeDefined();
    expect(service.programs).toBeDefined();
  });

  it('initialize() resolves without error', async () => {
    const builder = makeBuilder({ data: [], error: null });
    const client = makeClient(builder);
    const service = new SupabaseDataService(client);

    await expect(service.initialize()).resolves.toBeUndefined();
  });

  it('clear() resolves without error', async () => {
    const builder = makeBuilder({ data: [], error: null });
    const client = makeClient(builder);
    const service = new SupabaseDataService(client);

    await expect(service.clear()).resolves.toBeUndefined();
  });
});
