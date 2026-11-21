-- ============================================================
-- Consumo y devolución atómicos de sesiones de un programa (issue #201)
--
-- Antes la app leía used_sessions y luego escribía used_sessions + 1 en dos pasos:
-- con reservas simultáneas dos peticiones leían el mismo valor y una de las
-- sumas se perdía. Aquí el UPDATE condicional es una única sentencia, así que
-- Postgres serializa las peticiones concurrentes sobre la misma fila.
--
-- Devuelven la fila actualizada, o ninguna fila si no procede
-- (programa inexistente / sin sesiones / no activo).
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_program_session(p_program_id UUID)
RETURNS SETOF public.programs
LANGUAGE sql
AS $$
  UPDATE public.programs
  SET used_sessions = used_sessions + 1
  WHERE id = p_program_id
    AND used_sessions < total_sessions
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.restore_program_session(p_program_id UUID)
RETURNS SETOF public.programs
LANGUAGE sql
AS $$
  UPDATE public.programs
  SET used_sessions = used_sessions - 1
  WHERE id = p_program_id
    AND status = 'active'
    AND used_sessions > 0
  RETURNING *;
$$;

-- SECURITY INVOKER (por defecto): se aplican las políticas RLS y el trigger
-- guard_client_program_update de quien llama; el service role del backend los omite.
REVOKE ALL ON FUNCTION public.consume_program_session(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_program_session(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_program_session(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_program_session(UUID) TO authenticated, service_role;
