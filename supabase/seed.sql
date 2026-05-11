-- ============================================================
-- nivel-ui — Seed Data (desarrollo local)
-- Crea los 2 entrenadores del MVP
--
-- USO:
--   supabase db reset        (aplica migraciones + seed)
--   supabase db seed         (solo seed, asume tablas existentes)
--
-- PRODUCCIÓN:
--   Crear usuarios en Supabase Dashboard → Authentication → Users
--   con los mismos emails y rol 'trainer' en raw_user_meta_data.
--   Los registros en trainers y user_profiles se crean automáticamente
--   via el trigger on_auth_user_created (ver migration 000001).
-- ============================================================

-- Trainer auth users (solo para entorno local de desarrollo)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'carlos@nivel.gym',
    crypt('gym2026!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "trainer", "full_name": "Carlos Rodríguez"}',
    FALSE, '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'maria@nivel.gym',
    crypt('gym2026!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "trainer", "full_name": "María López"}',
    FALSE, '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- user_profiles para los entrenadores
-- (normalmente el trigger on_auth_user_created los crea; aquí los insertamos
--  explícitamente por si el trigger no dispara en seeds locales)
INSERT INTO public.user_profiles (id, role, email, full_name)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'trainer', 'carlos@nivel.gym', 'Carlos Rodríguez'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'trainer', 'maria@nivel.gym',  'María López')
ON CONFLICT (id) DO NOTHING;

-- Trainers
INSERT INTO public.trainers (id, user_id, name, email, specialization, is_active)
VALUES
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Carlos Rodríguez',
    'carlos@nivel.gym',
    'Fitness y Musculación',
    true
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'María López',
    'maria@nivel.gym',
    'Yoga y Pilates',
    true
  )
ON CONFLICT (id) DO NOTHING;
