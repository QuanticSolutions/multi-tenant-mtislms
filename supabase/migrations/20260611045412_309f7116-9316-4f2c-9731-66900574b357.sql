
CREATE TYPE public.exam_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');

CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  exam_date date NOT NULL,
  start_time time,
  end_time time,
  total_marks numeric(6,2) NOT NULL DEFAULT 100,
  passing_marks numeric(6,2) NOT NULL DEFAULT 35,
  status public.exam_status NOT NULL DEFAULT 'scheduled',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage exams" ON public.exams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view exams" ON public.exams FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER exams_set_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX exams_class_date_idx ON public.exams(class_id, exam_date DESC);

CREATE TABLE public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained numeric(6,2),
  is_absent boolean NOT NULL DEFAULT false,
  remarks text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_results TO authenticated;
GRANT ALL ON public.exam_results TO service_role;

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage exam results" ON public.exam_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view exam results" ON public.exam_results FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers insert exam results" ON public.exam_results FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers update exam results" ON public.exam_results FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher')) WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER exam_results_set_updated_at BEFORE UPDATE ON public.exam_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
