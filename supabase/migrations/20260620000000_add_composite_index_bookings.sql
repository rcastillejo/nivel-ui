-- Índice compuesto para la consulta más frecuente:
-- getAvailableSlots filtra bookings por trainer_id, date y status.
-- Un índice compuesto evita un seq scan en tablas con muchas reservas.
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_date_status
  ON public.bookings (trainer_id, date, status);
