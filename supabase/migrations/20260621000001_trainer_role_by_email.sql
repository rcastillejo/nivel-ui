-- ============================================================
-- Fix handle_new_user trigger to assign trainer role when
-- the new user's email is registered in the trainers table.
--
-- Without this, Google OAuth sign-ins always default to
-- role='client' even for known trainers.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  derived_role TEXT;
BEGIN
  -- If the email matches an active trainer, assign trainer role.
  -- This covers OAuth sign-ins where raw_user_meta_data has no role.
  SELECT 'trainer' INTO derived_role
  FROM public.trainers
  WHERE email = NEW.email AND is_active = true
  LIMIT 1;

  -- Fall back to explicit metadata role (email/password registration) or 'client'.
  derived_role := COALESCE(derived_role, NEW.raw_user_meta_data->>'role', 'client');

  INSERT INTO public.user_profiles (id, role, email, full_name)
  VALUES (
    NEW.id,
    derived_role,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
