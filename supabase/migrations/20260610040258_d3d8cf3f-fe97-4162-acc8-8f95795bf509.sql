CREATE TYPE public.teacher_status AS ENUM ('active','on_leave','inactive','resigned');

CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_no text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text,
  phone text,
  gender text,
  date_of_birth date,
  qualification text,
  specialization text,
  date_of_joining date NOT NULL DEFAULT CURRENT_DATE,
  status public.teacher_status NOT NULL DEFAULT 'active',
  address text,
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers read teachers" ON public.teachers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER teachers_set_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();