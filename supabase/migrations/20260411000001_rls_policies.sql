-- =============================================================================
-- Migration: Row Level Security (RLS) Policies for nivel-ui
-- Date: 2026-04-11
-- Issue: #80
-- Spec: docs/specs/supabase-schema.spec.md
--
-- Access matrix:
--   table              | anon | client (own) | trainer
--   ------------------|------|--------------|--------
--   trainers           | R    | R            | R + U own
--   trainer_schedules  | R    | R            | R + I + U own
--   bookings           | -    | R + I + U/D own | R + U/D all
--   user_profiles      | -    | R + I + U own | R + I + U own
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on all public tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: is the current user a trainer?
-- SECURITY DEFINER so it can read user_profiles without being blocked by RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_trainer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.user_profiles
    WHERE  id   = auth.uid()
    AND    role = 'trainer'
  );
$$;

-- ---------------------------------------------------------------------------
-- user_profiles policies
-- ---------------------------------------------------------------------------

-- Users can read their own profile
CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Users can create their own profile (called on first sign-up)
CREATE POLICY "user_profiles_insert_own"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ---------------------------------------------------------------------------
-- trainers policies
-- ---------------------------------------------------------------------------

-- Anyone (including anonymous) can read active trainers
CREATE POLICY "trainers_select_active"
  ON public.trainers
  FOR SELECT
  USING (is_active = true);

-- Trainers can update their own row
CREATE POLICY "trainers_update_own"
  ON public.trainers
  FOR UPDATE
  USING (user_id = auth.uid() AND public.is_trainer());

-- ---------------------------------------------------------------------------
-- trainer_schedules policies
-- ---------------------------------------------------------------------------

-- Anyone (including anonymous) can read all schedules
CREATE POLICY "trainer_schedules_select_all"
  ON public.trainer_schedules
  FOR SELECT
  USING (true);

-- Only a trainer can insert their own schedule slots
CREATE POLICY "trainer_schedules_insert_own"
  ON public.trainer_schedules
  FOR INSERT
  WITH CHECK (
    public.is_trainer()
    AND trainer_id IN (
      SELECT id FROM public.trainers WHERE user_id = auth.uid()
    )
  );

-- Only a trainer can update their own schedule slots
CREATE POLICY "trainer_schedules_update_own"
  ON public.trainer_schedules
  FOR UPDATE
  USING (
    public.is_trainer()
    AND trainer_id IN (
      SELECT id FROM public.trainers WHERE user_id = auth.uid()
    )
  );

-- Only a trainer can delete their own schedule slots
CREATE POLICY "trainer_schedules_delete_own"
  ON public.trainer_schedules
  FOR DELETE
  USING (
    public.is_trainer()
    AND trainer_id IN (
      SELECT id FROM public.trainers WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- bookings policies
-- ---------------------------------------------------------------------------

-- Clients see only their own bookings; trainers see all bookings
CREATE POLICY "bookings_select"
  ON public.bookings
  FOR SELECT
  USING (
    client_id = auth.uid()
    OR public.is_trainer()
  );

-- Authenticated clients can insert bookings for themselves only
CREATE POLICY "bookings_insert_own"
  ON public.bookings
  FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Clients can update their own bookings (e.g. cancel); trainers can update any
CREATE POLICY "bookings_update"
  ON public.bookings
  FOR UPDATE
  USING (
    client_id = auth.uid()
    OR public.is_trainer()
  );

-- Clients can delete their own bookings; trainers can delete any
CREATE POLICY "bookings_delete"
  ON public.bookings
  FOR DELETE
  USING (
    client_id = auth.uid()
    OR public.is_trainer()
  );
