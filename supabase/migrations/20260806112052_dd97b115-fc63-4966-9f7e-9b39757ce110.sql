ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS students_user_id_key ON public.students(user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS teachers_user_id_key ON public.teachers(user_id) WHERE user_id IS NOT NULL;

CREATE POLICY "Students read own record" ON public.students
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Teachers read own record" ON public.teachers
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Students read own class timetable" ON public.timetable_slots
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.user_id = auth.uid() AND s.class_id = timetable_slots.class_id
));

CREATE POLICY "Students read own class" ON public.classes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.user_id = auth.uid() AND s.class_id = classes.id
));

CREATE POLICY "Students read announcements" ON public.announcements
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'student'::app_role)
  AND published_at IS NOT NULL
  AND (
    audience IN ('all'::announcement_audience, 'parents'::announcement_audience)
    OR (audience = 'class'::announcement_audience AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = auth.uid() AND s.class_id = announcements.class_id
    ))
  )
);