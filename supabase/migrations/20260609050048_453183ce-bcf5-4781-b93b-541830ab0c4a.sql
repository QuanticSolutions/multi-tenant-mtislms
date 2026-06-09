
-- Classes
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  section text,
  grade_level int,
  academic_year text NOT NULL DEFAULT '2025-26',
  capacity int NOT NULL DEFAULT 40,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage classes" ON public.classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers read classes" ON public.classes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER classes_set_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Student status enum
CREATE TYPE public.student_status AS ENUM ('active', 'inactive', 'graduated', 'transferred', 'probation');

-- Students
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no text NOT NULL UNIQUE,
  full_name text NOT NULL,
  gender text,
  date_of_birth date,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  address text,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  status public.student_status NOT NULL DEFAULT 'active',
  enrollment_date date NOT NULL DEFAULT CURRENT_DATE,
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage students" ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers read students" ON public.students FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX students_class_id_idx ON public.students(class_id);
CREATE INDEX students_status_idx ON public.students(status);

-- Seed a few classes for the new system
INSERT INTO public.classes (name, section, grade_level, academic_year, capacity) VALUES
  ('Grade 1', 'A', 1, '2025-26', 30),
  ('Grade 5', 'A', 5, '2025-26', 35),
  ('Grade 8', 'A', 8, '2025-26', 40),
  ('Grade 10', 'A', 10, '2025-26', 40);
