-- ============================================================
-- CUTOVER — NO se aplica automáticamente (no está en supabase/migrations/).
--
-- Defensa en profundidad contra reservas duplicadas (issue #201): un cliente no
-- puede tener dos reservas CONFIRMADAS en la misma fecha y hora, con cualquier
-- entrenador. La regla principal vive en BookingModel; este índice cubre la
-- carrera entre dos peticiones simultáneas que pasan la validación a la vez.
-- El repositorio traduce la violación (código 23505) a BookingDuplicateError.
--
-- ORDEN OBLIGATORIO:
--   1. Limpiar los duplicados existentes (ver consulta abajo): el índice no se
--      puede crear mientras haya dos reservas confirmadas iguales.
--   2. Aplicar este archivo (supabase db query / SQL editor).
--
-- Si se aplica sin limpiar antes, el CREATE INDEX falla y no cambia nada.
--
-- Nota: date y time_slot no llevan zona horaria; la regla compara la fecha y
-- hora tal como las eligió el cliente.
-- ============================================================

-- 1. Duplicados existentes (debe devolver 0 filas antes de crear el índice):
--
-- SELECT client_id, date, time_slot, count(*) AS reservas, array_agg(id ORDER BY created_at) AS ids
-- FROM public.bookings
-- WHERE status = 'confirmed'
-- GROUP BY client_id, date, time_slot
-- HAVING count(*) > 1;

-- 2. Índice único parcial:
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_client_slot_confirmed
  ON public.bookings (client_id, date, time_slot)
  WHERE status = 'confirmed';
