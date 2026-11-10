-- ============================================================
-- CUTOVER — NO se aplica automáticamente (no está en supabase/migrations/).
--
-- Cierra la vía directa: tras aplicarlo, los clientes ya no pueden insertar ni
-- cancelar reservas llamando a Supabase directamente; solo la Edge Function
-- `bookings` (service role) escribe, y por tanto aplica siempre las reglas
-- de negocio (anticipación mínima, aforo, devolución de sesión).
--
-- ORDEN OBLIGATORIO:
--   1. Aplicar 20261110000000_bookings_starts_at.sql (automático al mergear).
--   2. Desplegar la Edge Function `bookings` y verificar reservar y cancelar
--      con una cuenta de cliente de prueba.
--   3. Desplegar la app que llama a la función.
--   4. Recién entonces aplicar este archivo (supabase db query / SQL editor).
--
-- Si se aplica antes del paso 2, nadie podrá reservar ni cancelar.
-- ============================================================

-- Todas las reservas deben tener ya su instante UTC.
UPDATE public.bookings
SET starts_at = (date + time_slot::time) AT TIME ZONE 'UTC',
    client_timezone = COALESCE(client_timezone, 'UTC')
WHERE starts_at IS NULL;

ALTER TABLE public.bookings ALTER COLUMN starts_at SET NOT NULL;

DROP POLICY IF EXISTS "bookings: client insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings: client cancel" ON public.bookings;

-- Opcional, ya sin uso desde el cliente (la sesión se consume en el backend):
-- DROP POLICY IF EXISTS "programs: client consume own session" ON public.programs;
