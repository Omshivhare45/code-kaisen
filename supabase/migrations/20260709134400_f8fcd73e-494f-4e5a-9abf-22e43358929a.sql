
-- ROLES
CREATE TYPE public.app_role AS ENUM ('citizen','officer','admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  department TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto profile + citizen role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'citizen');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ISSUE REPORTS
CREATE TABLE public.issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- pothole, blockage, pollution, garbage, waterlogging, streetlight
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  area TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  status TEXT NOT NULL DEFAULT 'open', -- open, assigned, in_progress, resolved
  assigned_department TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.issue_reports TO authenticated;
GRANT SELECT ON public.issue_reports TO anon;
GRANT ALL ON public.issue_reports TO service_role;
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports public read" ON public.issue_reports FOR SELECT USING (true);
CREATE POLICY "Citizens create reports" ON public.issue_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporter or officer updates" ON public.issue_reports FOR UPDATE TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'admin'));

-- DEPT WORKS (scheduled activities that can collide)
CREATE TABLE public.dept_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT NOT NULL, -- PWD, BMC, Traffic, Pollution Board, Electricity, Water
  title TEXT NOT NULL,
  description TEXT,
  area TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, ongoing, completed, delayed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.dept_works TO authenticated;
GRANT SELECT ON public.dept_works TO anon;
GRANT ALL ON public.dept_works TO service_role;
ALTER TABLE public.dept_works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Works public read" ON public.dept_works FOR SELECT USING (true);
CREATE POLICY "Officers create works" ON public.dept_works FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Officers update works" ON public.dept_works FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'officer') OR public.has_role(auth.uid(),'admin'));

-- Seed a few sample works & reports so the map is not empty at demo time
INSERT INTO public.dept_works (created_by, department, title, description, area, lat, lng, starts_on, ends_on, status)
SELECT '00000000-0000-0000-0000-000000000000'::uuid, d, t, ds, a, la, ln, s, e, st FROM (VALUES
  ('PWD','MP Nagar road resurfacing','Milling and repaving of Zone-1 main road','MP Nagar', 23.2330, 77.4340, CURRENT_DATE, CURRENT_DATE + 7, 'ongoing'),
  ('BMC','Storm drain cleaning','Pre-monsoon drain desilting','Arera Colony', 23.2200, 77.4260, CURRENT_DATE + 2, CURRENT_DATE + 10, 'scheduled'),
  ('Water','Pipeline replacement','24" main line replacement','New Market', 23.2360, 77.4020, CURRENT_DATE, CURRENT_DATE + 5, 'ongoing'),
  ('Electricity','Transformer upgrade','Load balancing works','Habibganj', 23.2255, 77.4360, CURRENT_DATE + 1, CURRENT_DATE + 3, 'scheduled')
) AS v(d,t,ds,a,la,ln,s,e,st)
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);
-- (seed insert only runs if any user exists; safe to skip on empty DB)
