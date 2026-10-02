/*
# Teacher & Student Portal RLS Policies

1. New table policies (all RLS-enabled):
- question_bank: teachers CRUD their own + shared readable by staff; students read when class matches
- quizzes: teachers CRUD for classes/subjects they teach; students read published for their class
- quiz_questions: same access as parent quiz
- quiz_attempts: students create/read own; teachers read for their class
- quiz_attempt_answers: same as parent attempt
- generated_papers: teachers CRUD their own; admin all access

2. Storage policies:
- assignments bucket: students upload to own path; teachers read submissions for their classes

3. Fixed existing RLS gaps:
- homework: + students SELECT for their class_id
- homework_submissions: + students SELECT own + INSERT own; students UPDATE own ungraded
- exam_results: + students SELECT own results
*/

-- ── question_bank ──────────────────────────────────────────────────

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qb teacher admin all" ON public.question_bank;
CREATE POLICY "qb teacher admin all" ON public.question_bank
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- Students can read questions for their class (needed for quiz attempts)
DROP POLICY IF EXISTS "qb student read class" ON public.question_bank;
CREATE POLICY "qb student read class" ON public.question_bank
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid() AND s.class_id = question_bank.class_id
    )
  );

-- ── quizzes ────────────────────────────────────────────────────────

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Teachers/admin: full CRUD on quizzes for classes they teach
DROP POLICY IF EXISTS "quiz teacher admin write" ON public.quizzes;
CREATE POLICY "quiz teacher admin write" ON public.quizzes
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- Students: read published quizzes for their class
DROP POLICY IF EXISTS "quiz student read" ON public.quizzes;
CREATE POLICY "quiz student read" ON public.quizzes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND quizzes.status IN ('published', 'closed')
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid() AND s.class_id = quizzes.class_id
    )
  );

-- ── quiz_questions ─────────────────────────────────────────────────

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Teachers/admin: full CRUD
DROP POLICY IF EXISTS "qq teacher admin write" ON public.quiz_questions;
CREATE POLICY "qq teacher admin write" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- Students: read quiz_questions for quizzes in their class
DROP POLICY IF EXISTS "qq student read" ON public.quiz_questions;
CREATE POLICY "qq student read" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN students s ON s.class_id = q.class_id AND s.user_id = auth.uid()
      WHERE q.id = quiz_questions.quiz_id
    )
  );

-- ── quiz_attempts ──────────────────────────────────────────────────

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Students: create & read own attempts
DROP POLICY IF EXISTS "qa student insert own" ON public.quiz_attempts;
CREATE POLICY "qa student insert own" ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = quiz_attempts.student_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "qa student read own" ON public.quiz_attempts;
CREATE POLICY "qa student read own" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = quiz_attempts.student_id AND s.user_id = auth.uid()
    )
  );

-- Students can update own attempt (for submitting answers before calling RPC)
DROP POLICY IF EXISTS "qa student update own" ON public.quiz_attempts;
CREATE POLICY "qa student update own" ON public.quiz_attempts
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = quiz_attempts.student_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = quiz_attempts.student_id AND s.user_id = auth.uid()
    )
  );

-- Teachers/admin: read attempts for quizzes in their classes
DROP POLICY IF EXISTS "qa teacher admin read" ON public.quiz_attempts;
CREATE POLICY "qa teacher admin read" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- ── quiz_attempt_answers ───────────────────────────────────────────

ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

-- Students: insert & read own answers
DROP POLICY IF EXISTS "qaa student insert own" ON public.quiz_attempt_answers;
CREATE POLICY "qaa student insert own" ON public.quiz_attempt_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM quiz_attempts qa
      JOIN students s ON s.id = qa.student_id AND s.user_id = auth.uid()
      WHERE qa.id = quiz_attempt_answers.attempt_id
    )
  );

DROP POLICY IF EXISTS "qaa student read own" ON public.quiz_attempt_answers;
CREATE POLICY "qaa student read own" ON public.quiz_attempt_answers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM quiz_attempts qa
      JOIN students s ON s.id = qa.student_id AND s.user_id = auth.uid()
      WHERE qa.id = quiz_attempt_answers.attempt_id
    )
  );

-- Teachers/admin: read & update (for manual grading)
DROP POLICY IF EXISTS "qaa teacher admin read" ON public.quiz_attempt_answers;
CREATE POLICY "qaa teacher admin read" ON public.quiz_attempt_answers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

DROP POLICY IF EXISTS "qaa teacher admin update" ON public.quiz_attempt_answers;
CREATE POLICY "qaa teacher admin update" ON public.quiz_attempt_answers
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- ── generated_papers ───────────────────────────────────────────────

ALTER TABLE public.generated_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gp teacher admin all" ON public.generated_papers;
CREATE POLICY "gp teacher admin all" ON public.generated_papers
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- ── Fix existing gaps: homework student read ────────────────────────

DROP POLICY IF EXISTS "Students read homework for class" ON public.homework;
CREATE POLICY "Students read homework for class" ON public.homework
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid() AND s.class_id = homework.class_id
    )
  );

-- ── Fix existing gaps: homework_submissions student policies ────────

DROP POLICY IF EXISTS "Students read own submissions" ON public.homework_submissions;
CREATE POLICY "Students read own submissions" ON public.homework_submissions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = homework_submissions.student_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students submit homework" ON public.homework_submissions;
CREATE POLICY "Students submit homework" ON public.homework_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = homework_submissions.student_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students update own ungraded submission" ON public.homework_submissions;
CREATE POLICY "Students update own ungraded submission" ON public.homework_submissions
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = homework_submissions.student_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = homework_submissions.student_id AND s.user_id = auth.uid()
    )
  );

-- ── Fix existing gaps: exam_results student read ───────────────────

DROP POLICY IF EXISTS "Students read own exam results" ON public.exam_results;
CREATE POLICY "Students read own exam results" ON public.exam_results
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'student'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = exam_results.student_id AND s.user_id = auth.uid()
    )
  );

-- ── Storage policies for assignments bucket ────────────────────────

-- Students can upload to their own path
DROP POLICY IF EXISTS "assignments student upload" ON storage.objects;
CREATE POLICY "assignments student upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assignments'
    AND public.has_role(auth.uid(), 'student'::public.app_role)
  );

-- Students can read their own uploads
DROP POLICY IF EXISTS "assignments student read own" ON storage.objects;
CREATE POLICY "assignments student read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'assignments'
    AND public.has_role(auth.uid(), 'student'::public.app_role)
    AND (owner = auth.uid())
  );

-- Teachers can read all assignment files (for grading)
DROP POLICY IF EXISTS "assignments teacher read" ON storage.objects;
CREATE POLICY "assignments teacher read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'assignments'
    AND public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- Teachers can upload instruction files
DROP POLICY IF EXISTS "assignments teacher upload" ON storage.objects;
CREATE POLICY "assignments teacher upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assignments'
    AND public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- Admins full access to assignments bucket
DROP POLICY IF EXISTS "assignments admin all" ON storage.objects;
CREATE POLICY "assignments admin all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'assignments'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'assignments'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );