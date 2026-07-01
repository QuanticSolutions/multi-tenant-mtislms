
CREATE TABLE public.timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  period_no SMALLINT NOT NULL CHECK (period_no BETWEEN 1 AND 12),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT timetable_end_after_start CHECK (end_time > start_time),
  CONSTRAINT timetable_unique_class_slot UNIQUE (class_id, day_of_week, period_no)
);

-- Prevent same teacher being booked in two classes at same day+period
CREATE UNIQUE INDEX timetable_unique_teacher_slot
  ON public.timetable_slots (teacher_id, day_of_week, period_no)
  WHERE teacher_id IS NOT NULL;

CREATE INDEX timetable_slots_class_idx ON public.timetable_slots (class_id, day_of_week, period_no);
CREATE INDEX timetable_slots_teacher_idx ON public.timetable_slots (teacher_id, day_of_week, period_no);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_slots TO authenticated;
GRANT ALL ON public.timetable_slots TO service_role;

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage timetable"
  ON public.timetable_slots FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff view timetable"
  ON public.timetable_slots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER timetable_slots_set_updated_at
  BEFORE UPDATE ON public.timetable_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
