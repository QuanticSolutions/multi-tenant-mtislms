
CREATE TYPE public.admission_status AS ENUM ('new','screening','interview','offered','accepted','rejected','withdrawn');
CREATE TYPE public.interview_outcome AS ENUM ('pending','pass','fail','hold');
CREATE TYPE public.interview_mode AS ENUM ('in_person','online','phone');

CREATE TABLE public.admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  applying_for_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  previous_school TEXT,
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  guardian_email TEXT,
  address TEXT,
  status public.admission_status NOT NULL DEFAULT 'new',
  application_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  fee_paid BOOLEAN NOT NULL DEFAULT false,
  offer_date DATE,
  decision_date DATE,
  decision_notes TEXT,
  source TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admission_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  mode public.interview_mode NOT NULL DEFAULT 'in_person',
  interviewer_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  interviewer_name TEXT,
  score NUMERIC(5,2),
  outcome public.interview_outcome NOT NULL DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_applications TO authenticated;
GRANT ALL ON public.admission_applications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_interviews TO authenticated;
GRANT ALL ON public.admission_interviews TO service_role;

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view applications" ON public.admission_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage applications" ON public.admission_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Staff can view interviews" ON public.admission_interviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage interviews" ON public.admission_interviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER admission_applications_updated_at BEFORE UPDATE ON public.admission_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER admission_interviews_updated_at BEFORE UPDATE ON public.admission_interviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_admission_applications_status ON public.admission_applications(status);
CREATE INDEX idx_admission_interviews_app ON public.admission_interviews(application_id);
