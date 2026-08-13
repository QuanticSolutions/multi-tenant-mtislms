-- Students: replace 'probation' with 'terminated'
UPDATE public.students SET status = 'inactive' WHERE status = 'probation';

ALTER TYPE public.student_status RENAME TO student_status_old;
CREATE TYPE public.student_status AS ENUM ('active','inactive','graduated','transferred','terminated');

ALTER TABLE public.students ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.students
  ALTER COLUMN status TYPE public.student_status
  USING (status::text::public.student_status);
ALTER TABLE public.students ALTER COLUMN status SET DEFAULT 'active'::public.student_status;

DROP TYPE public.student_status_old;

-- Teachers: add probation
ALTER TYPE public.teacher_status ADD VALUE IF NOT EXISTS 'probation';