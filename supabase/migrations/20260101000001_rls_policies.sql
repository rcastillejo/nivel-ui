-- ============================================================
-- nivel-ui — Row Level Security (RLS) policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: obtiene el rol del usuario autenticado actual
-- SECURITY DEFINER para acceder a user_profiles sin RLS loop
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- user_profiles
-- ============================================================

-- Usuarios leen su propio perfil; entrenadores leen todos
CREATE POLICY "user_profiles: authenticated read"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.get_my_role() = 'trainer');

-- Usuarios actualizan solo su propio perfil
CREATE POLICY "user_profiles: own update"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- El trigger de signup (o service role) crea el perfil
CREATE POLICY "user_profiles: own insert"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================
-- trainers
-- ============================================================

-- Anónimos y autenticados pueden leer entrenadores activos
CREATE POLICY "trainers: public read"
  ON public.trainers FOR SELECT
  USING (is_active = true);

-- Entrenadores pueden actualizar su propio registro
CREATE POLICY "trainers: own update"
  ON public.trainers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- trainer_schedules
-- ============================================================

-- Lectura pública (necesaria para el flujo de reserva sin login)
CREATE POLICY "trainer_schedules: public read"
  ON public.trainer_schedules FOR SELECT
  USING (true);

-- Solo el entrenador dueño puede gestionar sus slots
CREATE POLICY "trainer_schedules: trainer insert"
  ON public.trainer_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id IN (
      SELECT id FROM public.trainers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trainer_schedules: trainer update"
  ON public.trainer_schedules FOR UPDATE
  TO authenticated
  USING (
    trainer_id IN (
      SELECT id FROM public.trainers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trainer_schedules: trainer delete"
  ON public.trainer_schedules FOR DELETE
  TO authenticated
  USING (
    trainer_id IN (
      SELECT id FROM public.trainers WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- bookings
-- ============================================================

-- Clientes ven solo sus reservas; entrenadores ven todas
CREATE POLICY "bookings: read"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR public.get_my_role() = 'trainer'
  );

-- Clientes autenticados crean reservas solo para sí mismos
CREATE POLICY "bookings: client insert"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND public.get_my_role() = 'client'
  );

-- Entrenadores pueden actualizar cualquier reserva (cambiar status)
CREATE POLICY "bookings: trainer update"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'trainer');

-- Clientes solo pueden cancelar sus propias reservas
CREATE POLICY "bookings: client cancel"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid() AND public.get_my_role() = 'client')
  WITH CHECK (status = 'cancelled');

-- ============================================================
-- programs
-- ============================================================

-- Clientes ven programas donde aparecen en client_ids; entrenadores ven todos
CREATE POLICY "programs: read"
  ON public.programs FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'trainer'
    OR client_ids @> to_jsonb(auth.uid()::text)
  );

-- Solo entrenadores gestionan programas
CREATE POLICY "programs: trainer insert"
  ON public.programs FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'trainer');

CREATE POLICY "programs: trainer update"
  ON public.programs FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'trainer');

CREATE POLICY "programs: trainer delete"
  ON public.programs FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'trainer');

-- ============================================================
-- Trigger: crea user_profile automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
