-- DRIVERS
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  cnic text,
  licence_no text,
  vehicle_registration text,
  vehicle_model text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view drivers" ON public.drivers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins manage drivers" ON public.drivers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.students ADD COLUMN driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;

-- DONATIONS
CREATE TYPE public.donation_status AS ENUM ('pledged','received','cancelled');
CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name text NOT NULL,
  donor_phone text,
  donor_email text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  purpose text,
  method public.payment_method NOT NULL DEFAULT 'cash',
  reference text,
  donation_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.donation_status NOT NULL DEFAULT 'pledged',
  notes text,
  source text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT INSERT ON public.donations TO anon;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage donations" ON public.donations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can submit donations" ON public.donations FOR INSERT TO anon WITH CHECK (true);
CREATE TRIGGER donations_updated_at BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EMPLOYMENT APPLICATIONS
CREATE TYPE public.employment_status AS ENUM ('new','screening','interview','offered','hired','rejected');
CREATE TABLE public.employment_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  position text NOT NULL,
  qualification text,
  experience_years numeric(4,1),
  cv_url text,
  expected_salary numeric(12,2),
  status public.employment_status NOT NULL DEFAULT 'new',
  notes text,
  source text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employment_applications TO authenticated;
GRANT INSERT ON public.employment_applications TO anon;
GRANT ALL ON public.employment_applications TO service_role;
ALTER TABLE public.employment_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage employment applications" ON public.employment_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can submit employment applications" ON public.employment_applications FOR INSERT TO anon WITH CHECK (true);
CREATE TRIGGER employment_applications_updated_at BEFORE UPDATE ON public.employment_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PUBLIC ADMISSION SUBMISSIONS
GRANT INSERT ON public.admission_applications TO anon;
CREATE POLICY "Public can submit admission applications" ON public.admission_applications FOR INSERT TO anon WITH CHECK (true);

-- PUBLIC EVENTS READ (embeddable calendar)
GRANT SELECT ON public.events TO anon;
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT TO anon USING (true);
CREATE POLICY "Signed-in users can view events" ON public.events FOR SELECT TO authenticated USING (true);