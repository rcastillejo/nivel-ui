-- ============================================================
-- Cierre de escrituras directas del cliente (antes: supabase/cutover/).
--
-- Desde esta migración, bookings y la sesión del programa solo los modifica la
-- Edge Function `bookings` (service role), que aplica siempre las reglas de negocio
-- (anticipación mínima, aforo, duplicados, devolución de sesión).
--
-- Requisitos (ya cumplidos en producción antes de existir este archivo):
--   - 20261110000000_bookings_starts_at.sql aplicada.
--   - Edge Function `bookings` desplegada y la app llamándola.
--
-- Atómica: si alguna sentencia falla no queda nada a medias.
-- ============================================================

-- 1. starts_at obligatorio. No se adivina la zona horaria de filas antiguas:
--    si quedara alguna sin instante, se aborta para corregirla a mano.
DO $$
DECLARE
  missing INTEGER;
BEGIN
  SELECT count(*) INTO missing FROM public.bookings WHERE starts_at IS NULL;
  IF missing > 0 THEN
    RAISE EXCEPTION 'Hay % reserva(s) sin starts_at; rellénalas antes de aplicar esta migración', missing;
  END IF;
END $$;

ALTER TABLE public.bookings ALTER COLUMN starts_at SET NOT NULL;

-- 2. El cliente ya no inserta ni cancela reservas directamente.
DROP POLICY IF EXISTS "bookings: client insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings: client cancel" ON public.bookings;

-- 3. Endurecimiento de programs: el cliente ya no mueve used_sessions directamente.
DROP POLICY IF EXISTS "programs: client consume own session" ON public.programs;

REVOKE EXECUTE ON FUNCTION public.consume_program_session(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_program_session(UUID) FROM authenticated;
