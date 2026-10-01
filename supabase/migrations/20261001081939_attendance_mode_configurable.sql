/*
# Configurable Attendance Mode (Per-Day vs Per-Course)

1. New Columns
- `school_settings.attendance_mode` — text, not null, default 'per_day', CHECK in ('per_day','per_course').
  School-wide switch: 'per_day' = class teacher marks once/day; 'per_course' = each subject teacher marks per period.
- `attendance.timetable_slot_id` — nullable uuid FK to timetable_slots(id).
  NULL = per_day row (one per student per day); non-NULL = per_course row (one per student per slot per day).

2. Unique Index
- `attendance_unique_per_day_or_slot` on (class_id, student_id, date, coalesce(timetable_slot_id, zero-uuid)).
  Replaces the implicit (class_id, student_id, date) uniqueness so both modes coexist.

3. RLS Changes
- Drop old teacher INSERT/UPDATE policies and replace with mode-aware ones:
  - per_day: teacher must be the class_teacher_id on classes for that class_id.
  - per_course: teacher must be the teacher_id on the timetable_slots row referenced by timetable_slot_id.
- Admins retain full access.
- Teachers retain SELECT (unchanged).

4. Helper Function
- `can_take_attendance(_class_id, _slot_id)` — returns true if the caller is allowed to record
  attendance for the given class/slot under the current school mode.
*/

ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS attendance_mode text NOT NULL DEFAULT 'per_day'
  CHECK (attendance_mode IN ('per_day', 'per_course'));

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS timetable_slot_id uuid REFERENCES public.timetable_slots(id) ON DELETE SET NULL;

-- Drop old unique constraint if it exists (named or unnamed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass
    AND contype = 'u'
    AND array_to_string(conkey, ',') = (
      SELECT array_to_string(array_agg(attnum), ',')
      FROM pg_attribute
      WHERE attrelid = 'public.attendance'::regclass
      AND attname IN ('class_id', 'student_id', 'date')
    )
  ) THEN
    ALTER TABLE public.attendance DROP CONSTRAINT attendance_class_id_student_id_date_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_per_day_or_slot
  ON public.attendance (
    class_id, student_id, date,
    coalesce(timetable_slot_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Helper: can the current user take attendance for this class/slot?
CREATE OR REPLACE FUNCTION public.can_take_attendance(
  _class_id uuid,
  _slot_id uuid
) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
  SELECT CASE
    -- Admins can always take attendance
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN true
    -- No session = no access
    WHEN auth.uid() IS NULL THEN false
    ELSE
      CASE
        -- per_day: must be the class teacher
        WHEN (
          SELECT COALESCE(ss.attendance_mode, 'per_day')
          FROM public.school_settings ss
          LIMIT 1
        ) = 'per_day'
        THEN EXISTS (
          SELECT 1 FROM public.classes c
          WHERE c.id = _class_id AND c.class_teacher_id = auth.uid()
        )
        -- per_course: must be the slot's teacher
        ELSE EXISTS (
          SELECT 1 FROM public.timetable_slots ts
          WHERE ts.id = _slot_id AND ts.teacher_id = auth.uid()
        )
      END
  END
$$;

GRANT EXECUTE ON FUNCTION public.can_take_attendance(uuid, uuid) TO authenticated;

-- Replace teacher INSERT policy with mode-aware check
DROP POLICY IF EXISTS "Teachers insert attendance" ON public.attendance;
CREATE POLICY "Teachers insert attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.can_take_attendance(class_id, timetable_slot_id));

-- Replace teacher UPDATE policy with mode-aware check
DROP POLICY IF EXISTS "Teachers update attendance" ON public.attendance;
CREATE POLICY "Teachers update attendance" ON public.attendance
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'::public.app_role))
  WITH CHECK (public.can_take_attendance(class_id, timetable_slot_id));