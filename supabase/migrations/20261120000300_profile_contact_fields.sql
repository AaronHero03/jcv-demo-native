-- Campos de perfil adicionales para registro seguro (nombres, apellidos, teléfono).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Sincroniza metadatos de auth.users al crear usuario en Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(coalesce(NEW.email, ''));
  v_is_tec BOOLEAN := v_email LIKE '%@tec.mx';
BEGIN
  INSERT INTO public.profiles (id, email, role, is_tec_verified, first_name, last_name, phone)
  VALUES (
    NEW.id,
    v_email,
    CASE WHEN v_is_tec THEN 'tec_verified' ELSE 'user' END,
    v_is_tec,
    nullif(btrim(NEW.raw_user_meta_data ->> 'first_name'), ''),
    nullif(btrim(NEW.raw_user_meta_data ->> 'last_name'), ''),
    nullif(btrim(NEW.raw_user_meta_data ->> 'phone'), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = coalesce(EXCLUDED.first_name, public.profiles.first_name),
    last_name = coalesce(EXCLUDED.last_name, public.profiles.last_name),
    phone = coalesce(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
