-- ============================================================
-- nivel-ui — Seed Data (desarrollo local y QA)
--
-- Crea 2 entrenadores + 9 clientes coherentes con el
-- initialData de LocalStorageDataService. Incluye horarios
-- dinámicos (próximas 4 semanas) y reservas de muestra.
--
-- USO:
--   supabase db reset   → aplica migraciones + seed desde cero
--   supabase db seed    → solo seed (asume tablas existentes)
--
-- PRODUCCIÓN: NO ejecutar. Los usuarios se crean via
--   Supabase Dashboard → Authentication → Users.
--
-- UUIDs de referencia:
--   Trainers auth : aaaaaaaa-0000-0000-0000-00000000000{1,2}
--   Trainers table: bbbbbbbb-0000-0000-0000-00000000000{1,2}
--   Clients auth  : cccccccc-0000-0000-0000-00000000000{1..9}
-- ============================================================

-- ============================================================
-- 1. Auth users — Entrenadores
--
-- GoTrue requires '' (not NULL) for token string columns
-- (email_change, confirmation_token, recovery_token, etc.).
-- phone/phone_change/phone_change_token have a UNIQUE constraint
-- so they must remain NULL (GoTrue scans them as *string).
-- ============================================================
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  reauthentication_token
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'diego@nivel.gym', crypt('gym2026!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"trainer","full_name":"Diego Lamas"}',
    FALSE,
    '', '',
    '', '', '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'jeanpierre@nivel.gym', crypt('gym2026!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"trainer","full_name":"Jeanpierre Casas"}',
    FALSE,
    '', '',
    '', '', '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Auth users — Clientes (mismos del initialData localStorage)
-- ============================================================
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  reauthentication_token
)
VALUES
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000001','authenticated','authenticated','maria.gonzalez@email.com', crypt('gym2026!', gen_salt('bf')),NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{"role":"client","full_name":"María González"}',  FALSE,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000002','authenticated','authenticated','carlos.ruiz@email.com',     crypt('gym2026!', gen_salt('bf')),NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{"role":"client","full_name":"Carlos Ruiz"}',      FALSE,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000003','authenticated','authenticated','ana.martin@email.com',      crypt('gym2026!', gen_salt('bf')),NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{"role":"client","full_name":"Ana Martín"}',       FALSE,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000004','authenticated','authenticated','luis.torres@email.com',     crypt('gym2026!', gen_salt('bf')),NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{"role":"client","full_name":"Luis Torres"}',      FALSE,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000005','authenticated','authenticated','patricia.vega@email.com',   crypt('gym2026!', gen_salt('bf')),NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{"role":"client","full_name":"Patricia Vega"}',    FALSE,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000006','authenticated','authenticated','roberto.silva@email.com',   crypt('gym2026!', gen_salt('bf')),NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{"role":"client","full_name":"Roberto Silva"}',    FALSE,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000007','authenticated','authenticated','laura.mendoza@email.com',   crypt('gym2026!', gen_salt('bf')),NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{"role":"client","full_name":"Laura Mendoza"}',    FALSE,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000008','authenticated','authenticated','diego.castro@email.com',    crypt('gym2026!', gen_salt('bf')),NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{"role":"client","full_name":"Diego Castro"}',     FALSE,'','','','','',''),
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-000000000009','authenticated','authenticated','luis.castillejo@email.com', crypt('gym2026!', gen_salt('bf')),NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{"role":"client","full_name":"Luis Castillejo"}',  FALSE,'','','','','','')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. user_profiles
-- El trigger on_auth_user_created los crea automáticamente;
-- estos INSERTs son idempotentes por si el trigger no dispara
-- en entornos locales.
-- ============================================================
INSERT INTO public.user_profiles (id, role, email, full_name)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','trainer','diego@nivel.gym',           'Diego Lamas'),
  ('aaaaaaaa-0000-0000-0000-000000000002','trainer','jeanpierre@nivel.gym',      'Jeanpierre Casas'),
  ('cccccccc-0000-0000-0000-000000000001','client', 'maria.gonzalez@email.com',  'María González'),
  ('cccccccc-0000-0000-0000-000000000002','client', 'carlos.ruiz@email.com',     'Carlos Ruiz'),
  ('cccccccc-0000-0000-0000-000000000003','client', 'ana.martin@email.com',      'Ana Martín'),
  ('cccccccc-0000-0000-0000-000000000004','client', 'luis.torres@email.com',     'Luis Torres'),
  ('cccccccc-0000-0000-0000-000000000005','client', 'patricia.vega@email.com',   'Patricia Vega'),
  ('cccccccc-0000-0000-0000-000000000006','client', 'roberto.silva@email.com',   'Roberto Silva'),
  ('cccccccc-0000-0000-0000-000000000007','client', 'laura.mendoza@email.com',   'Laura Mendoza'),
  ('cccccccc-0000-0000-0000-000000000008','client', 'diego.castro@email.com',    'Diego Castro'),
  ('cccccccc-0000-0000-0000-000000000009','client', 'luis.castillejo@email.com', 'Luis Castillejo')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Trainers
-- ============================================================
INSERT INTO public.trainers (id, user_id, name, email, specialization, is_active)
VALUES
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Diego Lamas', 'diego@nivel.gym', 'Fitness y Musculación', true
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'Jeanpierre Casas', 'jeanpierre@nivel.gym', 'Entrenamiento Funcional', true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Trainer schedules — próximas 4 semanas (dinámico)
--
-- Slots coherentes con LocalStorageDataService.initialData:
--   Diego Lamas      Lun–Vie: 09:00 10:00 11:00 16:00 17:00 18:00
--                    Sábado : 09:00 10:00 11:00
--   Jeanpierre Casas Lun–Vie: 08:00 09:00 15:00 16:00 19:00 20:00
--                    Sábado : 08:00 09:00
-- ============================================================
DO $$
DECLARE
  d          DATE := CURRENT_DATE + 1;
  end_date   DATE := CURRENT_DATE + 29;
  dow        INT;
  diego_id   UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
  jp_id      UUID := 'bbbbbbbb-0000-0000-0000-000000000002';
  d_slots    TEXT[];
  j_slots    TEXT[];
  slot       TEXT;
BEGIN
  WHILE d <= end_date LOOP
    dow := EXTRACT(DOW FROM d)::INT; -- 0=Dom 1=Lun … 6=Sáb

    IF dow != 0 THEN
      IF dow = 6 THEN
        d_slots := ARRAY['09:00','10:00','11:00'];
        j_slots := ARRAY['08:00','09:00'];
      ELSE
        d_slots := ARRAY['09:00','10:00','11:00','16:00','17:00','18:00'];
        j_slots := ARRAY['08:00','09:00','15:00','16:00','19:00','20:00'];
      END IF;

      FOREACH slot IN ARRAY d_slots LOOP
        INSERT INTO public.trainer_schedules (trainer_id, date, time_slot, is_available)
        VALUES (diego_id, d, slot, true)
        ON CONFLICT (trainer_id, date, time_slot) DO NOTHING;
      END LOOP;

      FOREACH slot IN ARRAY j_slots LOOP
        INSERT INTO public.trainer_schedules (trainer_id, date, time_slot, is_available)
        VALUES (jp_id, d, slot, true)
        ON CONFLICT (trainer_id, date, time_slot) DO NOTHING;
      END LOOP;
    END IF;

    d := d + 1;
  END LOOP;
END $$;

-- ============================================================
-- 6. Bookings de muestra — próxima semana (siempre futuras)
-- ============================================================
DO $$
DECLARE
  monday DATE := CURRENT_DATE + 1;
BEGIN
  WHILE EXTRACT(DOW FROM monday) != 1 LOOP
    monday := monday + 1;
  END LOOP;

  INSERT INTO public.bookings
    (client_id, trainer_id, trainer_name, date, time_slot, duration_minutes, zone, status)
  VALUES
    ('cccccccc-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','Diego Lamas',      monday,     '09:00', 60, 'gym',      'confirmed'),
    ('cccccccc-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000001','Diego Lamas',      monday,     '11:00', 60, 'gym',      'confirmed'),
    ('cccccccc-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000002','Jeanpierre Casas', monday,     '09:00', 60, 'gabinete', 'confirmed'),
    ('cccccccc-0000-0000-0000-000000000004','bbbbbbbb-0000-0000-0000-000000000001','Diego Lamas',      monday + 1, '10:00', 60, 'gym',      'confirmed'),
    ('cccccccc-0000-0000-0000-000000000005','bbbbbbbb-0000-0000-0000-000000000002','Jeanpierre Casas', monday + 1, '16:00', 60, 'gym',      'confirmed'),
    ('cccccccc-0000-0000-0000-000000000006','bbbbbbbb-0000-0000-0000-000000000001','Diego Lamas',      monday + 2, '16:00', 60, 'gym',      'confirmed'),
    ('cccccccc-0000-0000-0000-000000000007','bbbbbbbb-0000-0000-0000-000000000002','Jeanpierre Casas', monday + 2, '09:00', 60, 'gym',      'confirmed'),
    ('cccccccc-0000-0000-0000-000000000008','bbbbbbbb-0000-0000-0000-000000000001','Diego Lamas',      monday + 3, '09:00', 60, 'gym',      'confirmed'),
    ('cccccccc-0000-0000-0000-000000000009','bbbbbbbb-0000-0000-0000-000000000002','Jeanpierre Casas', monday + 3, '08:00', 60, 'gabinete', 'cancelled')
  ;
END $$;
