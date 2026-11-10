-- ============================================================
-- bookings: instante UTC calculado en el servidor + origen de la sesión
--
-- - starts_at        : inicio de la cita en UTC. Lo calcula la Edge Function
--                      `bookings` a partir de date + time_slot y la zona IANA
--                      del cliente. Cancelar compara starts_at con now() del servidor.
-- - client_timezone  : zona IANA que usó el cliente al reservar.
-- - program_id       : programa del que se consumió la sesión (para devolverla
--                      al cancelar). NULL si la reserva no consumió ninguna.
--
-- Migración ADITIVA y retrocompatible: las columnas son opcionales, así que
-- el flujo actual (inserts directos desde el navegador) sigue funcionando
-- hasta que se despliegue la Edge Function. Ver supabase/cutover/.
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN starts_at       TIMESTAMPTZ,
  ADD COLUMN client_timezone TEXT,
  ADD COLUMN program_id      UUID REFERENCES public.programs(id) ON DELETE SET NULL;

-- Backfill: las reservas existentes se interpretan en la zona horaria del
-- servidor de base de datos (UTC).
UPDATE public.bookings
SET starts_at       = (date + time_slot::time) AT TIME ZONE 'UTC',
    client_timezone = 'UTC'
WHERE starts_at IS NULL;

CREATE INDEX bookings_program_id_idx ON public.bookings (program_id);

-- ============================================================
-- programs: el service role (Edge Function) puede devolver sesiones.
--
-- guard_client_program_update limita a los usuarios no entrenadores a
-- "used_sessions += 1". El service role no tiene rol de entrenador, así que
-- sin esta excepción no podría devolver una sesión al cancelar una cita.
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_client_program_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- El backend (service role) es de confianza: aplica sus propias reglas.
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

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
