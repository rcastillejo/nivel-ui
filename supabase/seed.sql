-- =============================================================================
-- Seed Data for nivel-ui MVP
-- Date: 2026-04-11
-- Issue: #80
-- Spec: docs/specs/supabase-schema.spec.md
--
-- Inserts the 2 initial trainers for the MVP.
--
-- NOTE: user_id is NULL initially. Once each trainer creates their Supabase
-- Auth account, run:
--   UPDATE public.trainers SET user_id = '<auth.users.id>' WHERE email = '<email>';
-- and add the corresponding user_profiles row.
-- =============================================================================

INSERT INTO public.trainers (id, user_id, name, email, specialization, is_active)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'Carlos Rodríguez',
    'carlos@nivelgym.com',
    'Entrenamiento Funcional y Fuerza',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'María González',
    'maria@nivelgym.com',
    'Yoga y Pilates',
    true
  )
ON CONFLICT (email) DO NOTHING;
