-- ============================================================
-- nivel-ui — Initial Schema
-- Tablas principales del MVP: user_profiles, trainers,
-- trainer_schedules, bookings, programs
-- ============================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- user_profiles
-- Extiende auth.users con el rol del sistema (client | trainer)
-- ============================================================
CREATE TABLE public.user_profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('client', 'trainer')),
  full_name  TEXT,
  email      TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- trainers
-- Perfil público del entrenador; user_id referencia auth.users
-- ============================================================
CREATE TABLE public.trainers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  specialization TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- trainer_schedules
-- Disponibilidad diaria por entrenador (una fila = un slot)
-- ============================================================
CREATE TABLE public.trainer_schedules (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id   UUID        NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  date         DATE        NOT NULL,
  time_slot    TEXT        NOT NULL,
  is_available BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, date, time_slot)
);

-- ============================================================
-- bookings
-- Reservas de clientes con entrenadores
-- ============================================================
CREATE TABLE public.bookings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id       UUID        NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  trainer_name     TEXT        NOT NULL,
  date             DATE        NOT NULL,
  time_slot        TEXT        NOT NULL,
  duration_minutes INTEGER     NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 30 AND 180),
  zone             TEXT        NOT NULL CHECK (zone IN ('gym', 'gabinete')),
  status           TEXT        NOT NULL DEFAULT 'confirmed'
                               CHECK (status IN ('confirmed', 'cancelled', 'pending')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- programs
-- Programas de entrenamiento asignados a clientes
-- client_ids: JSONB array de UUID strings
-- ============================================================
CREATE TABLE public.programs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  description         TEXT        NOT NULL DEFAULT '',
  trainer_id          UUID        NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  client_ids          JSONB       NOT NULL DEFAULT '[]',
  start_date          DATE        NOT NULL,
  end_date            DATE        NOT NULL,
  total_sessions      INTEGER     NOT NULL CHECK (total_sessions > 0),
  used_sessions       INTEGER     NOT NULL DEFAULT 0 CHECK (used_sessions >= 0),
  status              TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'inactive', 'expired')),
  previous_program_id UUID        REFERENCES public.programs(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date > start_date),
  CHECK (used_sessions <= total_sessions)
);

-- ============================================================
-- Indices de performance
-- ============================================================
CREATE INDEX idx_bookings_date_trainer   ON public.bookings (date, trainer_id);
CREATE INDEX idx_bookings_client         ON public.bookings (client_id);
CREATE INDEX idx_bookings_status         ON public.bookings (status);
CREATE INDEX idx_schedules_trainer_date  ON public.trainer_schedules (trainer_id, date);
CREATE INDEX idx_programs_trainer        ON public.programs (trainer_id);
CREATE INDEX idx_programs_status         ON public.programs (status);
CREATE INDEX idx_programs_client_ids     ON public.programs USING GIN (client_ids);
