-- ============================================================
-- Índice único contra reservas duplicadas (issue #201)
--
-- Un cliente no puede tener dos reservas CONFIRMADAS en la misma fecha y hora,
-- con cualquier entrenador y zona. La regla principal vive en BookingModel;
-- este índice cubre la carrera entre dos peticiones simultáneas que pasan la
-- validación a la vez. El repositorio traduce la violación (código 23505) a
-- BookingDuplicateError. Las reservas canceladas no cuentan.
--
-- IF NOT EXISTS: en producción el índice ya se creó a mano el 2026-11-10, tras
-- cancelar los duplicados existentes; esta migración deja ese estado versionado
-- y es un no-op allí. En un entorno nuevo la tabla parte vacía, así que se crea
-- sin problema.
--
-- Si se aplica sobre una base con duplicados confirmados, el CREATE INDEX falla
-- y no cambia nada. Antes hay que depurarlos; esta consulta debe devolver 0 filas:
--
--   SELECT client_id, date, time_slot, count(*) AS reservas, array_agg(id ORDER BY created_at) AS ids
--   FROM public.bookings
--   WHERE status = 'confirmed'
--   GROUP BY client_id, date, time_slot
--   HAVING count(*) > 1;
--
-- Nota: date y time_slot no llevan zona horaria; la regla compara la fecha y
-- hora tal como las eligió el cliente.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_client_slot_confirmed
  ON public.bookings (client_id, date, time_slot)
  WHERE status = 'confirmed';
