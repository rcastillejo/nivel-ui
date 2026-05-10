// Row types that match exactly the Supabase PostgreSQL schema columns.
// Used exclusively by mappers — domain code never imports these directly.

import { UserRole } from '.';

export interface TrainerRow {
  id: string;               // UUID, PK
  user_id: string;          // UUID, FK → auth.users.id
  name: string;
  email: string;
  specialization: string | null;
  is_active: boolean;
  created_at: string;       // ISO timestamp
}

export interface TrainerScheduleRow {
  id: string;               // UUID, PK
  trainer_id: string;       // UUID, FK → trainers.id
  date: string;             // YYYY-MM-DD (specific calendar date)
  time_slot: string;        // HH:MM
  is_available: boolean;
  created_at: string;
}

export interface BookingRow {
  id: string;               // UUID, PK
  client_id: string;        // UUID, FK → auth.users.id
  trainer_id: string;       // UUID, FK → trainers.id
  trainer_name: string;     // Denormalized for read performance
  date: string;             // YYYY-MM-DD
  time_slot: string;        // HH:MM
  duration_minutes: number;
  zone: 'gym' | 'gabinete';
  status: 'confirmed' | 'cancelled' | 'pending';
  created_at: string;
}

export interface UserProfileRow {
  id: string;               // UUID, PK = auth.users.id
  role: UserRole;
  full_name: string | null;
  email: string | null;     // Denormalized from auth.users for client-side reads
  phone: string | null;     // Denormalized from auth.users for client-side reads
  created_at: string;
}

export interface ProgramRow {
  id: string;               // UUID, PK
  name: string;
  description: string;
  trainer_id: string;       // UUID, FK → trainers.id
  client_ids: string[];     // UUID[] stored as jsonb
  start_date: string;       // YYYY-MM-DD
  end_date: string;         // YYYY-MM-DD
  total_sessions: number;
  used_sessions: number;
  status: 'active' | 'inactive' | 'expired';
  previous_program_id: string | null;  // FK → programs.id (renewal chain)
  created_at: string;
}

// Insert types omit server-generated fields (id, created_at)
export type BookingInsert = Omit<BookingRow, 'id' | 'created_at'>;
export type ProgramInsert = Omit<ProgramRow, 'id' | 'created_at'>;
export type TrainerScheduleInsert = Omit<TrainerScheduleRow, 'id' | 'created_at'>;
