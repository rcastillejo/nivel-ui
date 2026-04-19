-- =============================================================================
-- Migration: Initial Schema for nivel-ui
-- Date: 2026-04-11
-- Issue: #80
-- Spec: docs/specs/supabase-schema.spec.md
--
-- Creates tables: user_profiles, trainers, trainer_schedules, bookings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- user_profiles
-- Extends auth.users with role and display information.
-- id = auth.users.id (1-to-1 relationship)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('client', 'trainer')),
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_profiles IS
  'Extends auth.users with application-level role and display name.';

-- ---------------------------------------------------------------------------
-- trainers
-- Gym trainer profiles. user_id links to auth.users for trainers who log in.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainers (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  name           text        NOT NULL,
  email          text        NOT NULL UNIQUE,
  specialization text,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.trainers IS
  'Gym trainer profiles. Seeded manually; user_id is set once the trainer creates an auth account.';

-- ---------------------------------------------------------------------------
-- trainer_schedules
-- Available time slots that a trainer offers on a given date.
-- Unique constraint: one row per (trainer, date, time_slot).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainer_schedules (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id   uuid        NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  date         date        NOT NULL,
  time_slot    text        NOT NULL
                             CHECK (time_slot ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  is_available boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_trainer_schedules_trainer_date_slot
    UNIQUE (trainer_id, date, time_slot)
);

COMMENT ON TABLE public.trainer_schedules IS
  'Available time slots per trainer per day. RLS allows any user to read; only the trainer can write.';

-- ---------------------------------------------------------------------------
-- bookings
-- A client reservation for a specific trainer slot.
-- trainer_name is denormalized for read performance (avoids JOIN on hot path).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id       uuid        NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  trainer_name     text        NOT NULL,
  date             date        NOT NULL,
  time_slot        text        NOT NULL
                                 CHECK (time_slot ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  duration_minutes integer     NOT NULL
                                 CHECK (duration_minutes >= 30 AND duration_minutes <= 180),
  zone             text        NOT NULL CHECK (zone IN ('gym', 'gabinete')),
  status           text        NOT NULL DEFAULT 'confirmed'
                                 CHECK (status IN ('confirmed', 'cancelled', 'pending')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bookings IS
  'Client reservations. RLS ensures clients only see their own bookings; trainers see all.';

-- ---------------------------------------------------------------------------
-- Indexes for performance
-- Spec requirement: idx on bookings(date, trainer_id) and
-- trainer_schedules(trainer_id, date)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_date_trainer
  ON public.bookings (date, trainer_id);

CREATE INDEX IF NOT EXISTS idx_bookings_client_id
  ON public.bookings (client_id);

CREATE INDEX IF NOT EXISTS idx_trainer_schedules_trainer_date
  ON public.trainer_schedules (trainer_id, date);
