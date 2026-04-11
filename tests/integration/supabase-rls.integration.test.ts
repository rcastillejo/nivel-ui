/**
 * Integration tests: Row Level Security (RLS) for Supabase
 *
 * These tests verify the RLS policy logic defined in:
 *   supabase/migrations/20260411000001_rls_policies.sql
 *
 * Because the CI environment does not have a live Supabase connection, the
 * SQL policies are mirrored as TypeScript predicate functions.  The same
 * boolean logic that lives inside each SQL policy is expressed here, so any
 * change to the SQL must be reflected in the corresponding helper below.
 *
 * For full end-to-end verification run `supabase db reset && supabase test db`
 * against a local Supabase instance.
 *
 * Scenarios covered (from docs/specs/supabase-schema.spec.md):
 *   1. Cliente autenticado solo ve sus propias reservas
 *   2. Entrenador autenticado ve todas las reservas
 *   3. Usuario anónimo puede leer trainers y trainer_schedules
 *   4. Usuario anónimo NO puede insertar en bookings
 *   5. Entrenador puede insertar/actualizar sus propios trainer_schedules
 *   6. Entrenador NO puede modificar schedules de otro entrenador
 *
 * Checklist (CLAUDE.md §6):
 *   [x] Flujo completo cubierto con datos representativos
 *   [x] Estado limpiado entre tests (datos locales, sin estado compartido)
 *   [x] Tests siguen el patrón Arrange-Act-Assert
 */

import { describe, it, expect } from 'vitest';
import type {
  BookingRow,
  TrainerRow,
  TrainerScheduleRow,
  UserProfileRow,
} from '@/core/types/supabase';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TRAINER_ID_CARLOS = '11111111-1111-1111-1111-111111111111';
const TRAINER_ID_MARIA = '22222222-2222-2222-2222-222222222222';

const USER_ID_ALICE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';   // client
const USER_ID_BOB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';     // client
const USER_ID_CARLOS = 'cccccccc-cccc-cccc-cccc-cccccccccccc';  // trainer

const userProfiles: UserProfileRow[] = [
  { id: USER_ID_ALICE,  role: 'client',  full_name: 'Alice',  created_at: '2026-04-01T00:00:00Z' },
  { id: USER_ID_BOB,    role: 'client',  full_name: 'Bob',    created_at: '2026-04-01T00:00:00Z' },
  { id: USER_ID_CARLOS, role: 'trainer', full_name: 'Carlos', created_at: '2026-04-01T00:00:00Z' },
];

const trainers: TrainerRow[] = [
  {
    id: TRAINER_ID_CARLOS,
    user_id: USER_ID_CARLOS,
    name: 'Carlos Rodríguez',
    email: 'carlos@nivelgym.com',
    specialization: 'Entrenamiento Funcional y Fuerza',
    is_active: true,
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: TRAINER_ID_MARIA,
    user_id: null, // María hasn't created her auth account yet
    name: 'María González',
    email: 'maria@nivelgym.com',
    specialization: 'Yoga y Pilates',
    is_active: true,
    created_at: '2026-04-01T00:00:00Z',
  },
];

const trainerSchedules: TrainerScheduleRow[] = [
  {
    id: 'sched-1',
    trainer_id: TRAINER_ID_CARLOS,
    date: '2026-05-01',
    time_slot: '09:00',
    is_available: true,
    created_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 'sched-2',
    trainer_id: TRAINER_ID_MARIA,
    date: '2026-05-01',
    time_slot: '10:00',
    is_available: true,
    created_at: '2026-04-10T00:00:00Z',
  },
];

const bookings: BookingRow[] = [
  {
    id: 'booking-alice-1',
    client_id: USER_ID_ALICE,
    trainer_id: TRAINER_ID_CARLOS,
    trainer_name: 'Carlos Rodríguez',
    date: '2026-05-01',
    time_slot: '09:00',
    duration_minutes: 60,
    zone: 'gym',
    status: 'confirmed',
    created_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 'booking-bob-1',
    client_id: USER_ID_BOB,
    trainer_id: TRAINER_ID_CARLOS,
    trainer_name: 'Carlos Rodríguez',
    date: '2026-05-01',
    time_slot: '09:00',
    duration_minutes: 60,
    zone: 'gabinete',
    status: 'confirmed',
    created_at: '2026-04-10T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// RLS policy helpers (TypeScript mirrors of the SQL policies)
//
// Each function accepts the current user's auth.uid() and their role (from
// user_profiles) and returns only the rows the user is allowed to see.
// Anonymous users pass uid = null and role = null.
// ---------------------------------------------------------------------------

/**
 * Mirrors: CREATE POLICY "trainers_select_active" FOR SELECT USING (is_active = true)
 * Any user (including anonymous) can read active trainers.
 */
function applyTrainersSelectPolicy(rows: TrainerRow[]): TrainerRow[] {
  return rows.filter((t) => t.is_active === true);
}

/**
 * Mirrors: CREATE POLICY "trainer_schedules_select_all" FOR SELECT USING (true)
 * Anyone can read all trainer_schedules.
 */
function applyTrainerSchedulesSelectPolicy(rows: TrainerScheduleRow[]): TrainerScheduleRow[] {
  return rows;
}

/**
 * Mirrors: CREATE POLICY "trainer_schedules_insert_own" FOR INSERT
 * WITH CHECK (is_trainer() AND trainer_id IN (SELECT id FROM trainers WHERE user_id = auth.uid()))
 */
function canInsertTrainerSchedule(
  uid: string | null,
  userRole: 'client' | 'trainer' | null,
  trainerId: string
): boolean {
  if (!uid || userRole !== 'trainer') return false;
  const ownedTrainer = trainers.find((t) => t.user_id === uid);
  return ownedTrainer?.id === trainerId;
}

/**
 * Mirrors: CREATE POLICY "bookings_select" FOR SELECT
 * USING (client_id = auth.uid() OR is_trainer())
 */
function applyBookingsSelectPolicy(
  uid: string | null,
  userRole: 'client' | 'trainer' | null,
  rows: BookingRow[]
): BookingRow[] {
  if (!uid) return []; // anonymous users cannot see bookings
  if (userRole === 'trainer') return rows; // trainers see all
  return rows.filter((b) => b.client_id === uid); // clients see only their own
}

/**
 * Mirrors: CREATE POLICY "bookings_insert_own" FOR INSERT
 * WITH CHECK (client_id = auth.uid())
 */
function canInsertBooking(uid: string | null, clientId: string): boolean {
  if (!uid) return false; // anonymous users cannot insert
  return uid === clientId;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function roleOf(uid: string | null): 'client' | 'trainer' | null {
  if (!uid) return null;
  return userProfiles.find((p) => p.id === uid)?.role ?? null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RLS: trainers table', () => {
  it('usuario anónimo puede leer entrenadores activos', () => {
    // Arrange
    const uid = null;

    // Act
    const visible = applyTrainersSelectPolicy(trainers);

    // Assert
    expect(visible).toHaveLength(2);
    expect(visible.every((t) => t.is_active)).toBe(true);
    void uid; // anonymous — no uid needed for this policy
  });

  it('solo devuelve entrenadores con is_active = true', () => {
    // Arrange
    const inactive: TrainerRow = {
      ...trainers[0],
      id: 'inactive-trainer',
      is_active: false,
    };
    const withInactive = [...trainers, inactive];

    // Act
    const visible = applyTrainersSelectPolicy(withInactive);

    // Assert
    expect(visible.find((t) => t.id === 'inactive-trainer')).toBeUndefined();
    expect(visible).toHaveLength(2);
  });
});

describe('RLS: trainer_schedules table', () => {
  it('usuario anónimo puede leer todos los horarios', () => {
    // Arrange / Act
    const visible = applyTrainerSchedulesSelectPolicy(trainerSchedules);

    // Assert
    expect(visible).toHaveLength(2);
  });

  it('entrenador puede insertar su propio horario', () => {
    // Arrange
    const uid = USER_ID_CARLOS;
    const role = roleOf(uid);

    // Act
    const allowed = canInsertTrainerSchedule(uid, role, TRAINER_ID_CARLOS);

    // Assert
    expect(allowed).toBe(true);
  });

  it('entrenador NO puede insertar horario de otro entrenador', () => {
    // Arrange — Carlos tries to insert a slot for María's trainer id
    const uid = USER_ID_CARLOS;
    const role = roleOf(uid);

    // Act
    const allowed = canInsertTrainerSchedule(uid, role, TRAINER_ID_MARIA);

    // Assert
    expect(allowed).toBe(false);
  });

  it('cliente NO puede insertar horarios', () => {
    // Arrange
    const uid = USER_ID_ALICE;
    const role = roleOf(uid);

    // Act
    const allowed = canInsertTrainerSchedule(uid, role, TRAINER_ID_CARLOS);

    // Assert
    expect(allowed).toBe(false);
  });

  it('usuario anónimo NO puede insertar horarios', () => {
    // Arrange / Act
    const allowed = canInsertTrainerSchedule(null, null, TRAINER_ID_CARLOS);

    // Assert
    expect(allowed).toBe(false);
  });
});

describe('RLS: bookings table — SELECT', () => {
  it('cliente solo ve sus propias reservas', () => {
    // Arrange
    const uid = USER_ID_ALICE;
    const role = roleOf(uid);

    // Act
    const visible = applyBookingsSelectPolicy(uid, role, bookings);

    // Assert — Alice should only see her own booking, not Bob's
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('booking-alice-1');
    expect(visible.find((b) => b.client_id === USER_ID_BOB)).toBeUndefined();
  });

  it('las reservas de otros clientes NO aparecen para alice', () => {
    // Arrange
    const uid = USER_ID_ALICE;
    const role = roleOf(uid);

    // Act
    const visible = applyBookingsSelectPolicy(uid, role, bookings);

    // Assert — Bob's booking must not appear
    expect(visible.every((b) => b.client_id === USER_ID_ALICE)).toBe(true);
  });

  it('entrenador ve todas las reservas', () => {
    // Arrange
    const uid = USER_ID_CARLOS;
    const role = roleOf(uid);

    // Act
    const visible = applyBookingsSelectPolicy(uid, role, bookings);

    // Assert — trainer sees all bookings
    expect(visible).toHaveLength(bookings.length);
  });

  it('usuario anónimo NO ve ninguna reserva', () => {
    // Arrange / Act
    const visible = applyBookingsSelectPolicy(null, null, bookings);

    // Assert
    expect(visible).toHaveLength(0);
  });
});

describe('RLS: bookings table — INSERT', () => {
  it('cliente autenticado puede insertar una reserva propia', () => {
    // Arrange
    const uid = USER_ID_ALICE;

    // Act
    const allowed = canInsertBooking(uid, USER_ID_ALICE);

    // Assert
    expect(allowed).toBe(true);
  });

  it('cliente NO puede insertar una reserva en nombre de otro cliente', () => {
    // Arrange — Alice tries to create a booking with Bob's client_id
    const uid = USER_ID_ALICE;

    // Act
    const allowed = canInsertBooking(uid, USER_ID_BOB);

    // Assert
    expect(allowed).toBe(false);
  });

  it('usuario anónimo NO puede insertar reservas', () => {
    // Arrange / Act
    const allowed = canInsertBooking(null, USER_ID_ALICE);

    // Assert
    expect(allowed).toBe(false);
  });
});
