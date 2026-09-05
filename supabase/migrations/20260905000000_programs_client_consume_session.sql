-- ============================================================
-- programs: permitir que un cliente consuma una sesión de su
-- propio programa activo al confirmar una reserva.
--
-- Antes de esta migración, solo los entrenadores tenían permiso
-- de UPDATE sobre `programs`. El flujo de reserva del cliente
-- (BookingViewModel.createBooking -> ProgramModel.consumeSessionForClient)
-- necesita incrementar `used_sessions` en su propio programa, lo que
-- provocaba "new row violates row-level security policy for table
-- programs" al reservar como cliente.
--
-- Se agrega una policy de UPDATE acotada al propio programa del
-- cliente, más un trigger que garantiza que, cuando quien actualiza
-- no es un entrenador, la única modificación permitida sea
-- used_sessions = used_sessions + 1 (ningún otro campo puede cambiar).
-- ============================================================

CREATE POLICY "programs: client consume own session"
  ON public.programs FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'client'
    AND client_ids @> to_jsonb(auth.uid()::text)
  )
  WITH CHECK (
    client_ids @> to_jsonb(auth.uid()::text)
  );

CREATE OR REPLACE FUNCTION public.guard_client_program_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Los entrenadores pueden modificar cualquier campo de sus programas.
  IF public.get_my_role() = 'trainer' THEN
    RETURN NEW;
  END IF;

  -- Un cliente solo puede "consumir una sesión": used_sessions += 1,
  -- ningún otro campo puede cambiar en la misma operación.
  IF NEW.name               IS DISTINCT FROM OLD.name
     OR NEW.description         IS DISTINCT FROM OLD.description
     OR NEW.trainer_id          IS DISTINCT FROM OLD.trainer_id
     OR NEW.client_ids          IS DISTINCT FROM OLD.client_ids
     OR NEW.start_date          IS DISTINCT FROM OLD.start_date
     OR NEW.end_date            IS DISTINCT FROM OLD.end_date
     OR NEW.total_sessions      IS DISTINCT FROM OLD.total_sessions
     OR NEW.status              IS DISTINCT FROM OLD.status
     OR NEW.previous_program_id IS DISTINCT FROM OLD.previous_program_id
     OR NEW.used_sessions       IS DISTINCT FROM OLD.used_sessions + 1
  THEN
    RAISE EXCEPTION 'clients can only consume one session at a time (used_sessions += 1)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_client_program_update
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_program_update();
