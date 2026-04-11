/**
 * Supabase row types for nivel-ui
 *
 * These types mirror the PostgreSQL columns defined in
 * supabase/migrations/20260411000000_initial_schema.sql.
 * They must stay in sync with the database schema.
 *
 * Spec: docs/specs/supabase-schema.spec.md
 */

export type UserRole = 'client' | 'trainer';

export type BookingStatus = 'confirmed' | 'cancelled' | 'pending';

export type ZoneValue = 'gym' | 'gabinete';

export interface UserProfileRow {
  /** UUID, PK — equals auth.users.id */
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string; // ISO timestamptz
}

export interface TrainerRow {
  /** UUID, PK */
  id: string;
  /** UUID, FK → auth.users.id */
  user_id: string | null;
  name: string;
  email: string;
  specialization: string | null;
  is_active: boolean;
  created_at: string; // ISO timestamptz
}

export interface TrainerScheduleRow {
  /** UUID, PK */
  id: string;
  /** UUID, FK → trainers.id */
  trainer_id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24-hour) */
  time_slot: string;
  is_available: boolean;
  created_at: string; // ISO timestamptz
}

export interface BookingRow {
  /** UUID, PK */
  id: string;
  /** UUID, FK → auth.users.id */
  client_id: string;
  /** UUID, FK → trainers.id */
  trainer_id: string;
  /** Denormalized for read performance */
  trainer_name: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24-hour) */
  time_slot: string;
  duration_minutes: number;
  zone: ZoneValue;
  status: BookingStatus;
  created_at: string; // ISO timestamptz
}
