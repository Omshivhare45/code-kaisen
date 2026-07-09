
-- Expand app_role enum (safe to add values; used later at runtime, not in this tx)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dept_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Helper: privileged (any non-citizen role)
CREATE OR REPLACE FUNCTION public.is_privileged(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('officer','dept_admin','super_admin','admin')
  )
$$;

-- Updated signup handler: reads requested role + department from metadata,
-- but only allows citizen / officer / dept_admin to be self-assigned.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested text;
  safe_role public.app_role;
  dept text;
BEGIN
  requested := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'citizen');
  dept := NULLIF(NEW.raw_user_meta_data->>'department', '');

  IF requested IN ('officer', 'dept_admin') THEN
    safe_role := requested::public.app_role;
  ELSE
    safe_role := 'citizen'::public.app_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN safe_role <> 'citizen' THEN dept ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, safe_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
