/*
# Teacher & Student Portal Schema

1. Extended Tables
- homework: + instructions_file_url, allow_late, max_attempts
- homework_submissions: + submission_text, submission_file_url, attempt_number, graded_by, graded_at

2. New Tables
- question_bank: reusable questions (mcq/short_answer/long_answer) with options, correct answer, marks, difficulty, tags, is_shared
- quizzes: timed online quizzes with availability window, status (draft/published/closed)
- quiz_questions: links quiz to question_bank entries with order and optional marks override
- quiz_attempts: student attempt with start/submit times, status, score
- quiz_attempt_answers: per-question answers with auto-grading results
- generated_papers: printable test paper metadata (question_ids array, total_marks)

3. New Enums
- question_type: mcq | short_answer | long_answer
- question_difficulty: easy | medium | hard
- quiz_status: draft | published | closed
- quiz_attempt_status: in_progress | submitted | auto_submitted | graded

4. Storage
- assignments bucket for student submission files and teacher instruction files

5. Server-side Functions
- submit_quiz_attempt(p_attempt_id): enforces timing server-side, auto-grades MCQ, returns score
*/

-- ── Enums ──────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.question_type AS ENUM ('mcq', 'short_answer', 'long_answer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.question_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quiz_status AS ENUM ('draft', 'published', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quiz_attempt_status AS ENUM ('in_progress', 'submitted', 'auto_submitted', 'graded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Extend homework ────────────────────────────────────────────────

ALTER TABLE public.homework
  ADD COLUMN IF NOT EXISTS instructions_file_url text,
  ADD COLUMN IF NOT EXISTS allow_late boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_attempts int NOT NULL DEFAULT 1;

-- ── Extend homework_submissions ────────────────────────────────────

ALTER TABLE public.homework_submissions
  ADD COLUMN IF NOT EXISTS submission_text text,
  ADD COLUMN IF NOT EXISTS submission_file_url text,
  ADD COLUMN IF NOT EXISTS attempt_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS graded_at timestamptz;

-- ── question_bank ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  subject text NOT NULL,
  question_type public.question_type NOT NULL,
  question_text text NOT NULL,
  options jsonb,
  correct_option_id text,
  marks numeric NOT NULL DEFAULT 1,
  difficulty public.question_difficulty DEFAULT 'medium',
  tags text[] DEFAULT '{}',
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qb_class_subject ON public.question_bank(class_id, subject);
CREATE INDEX IF NOT EXISTS idx_qb_created_by ON public.question_bank(created_by);
CREATE INDEX IF NOT EXISTS idx_qb_shared ON public.question_bank(is_shared) WHERE is_shared = true;

-- ── quizzes ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject text NOT NULL,
  title text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 30,
  available_from timestamptz,
  available_until timestamptz,
  shuffle_questions boolean DEFAULT true,
  status public.quiz_status DEFAULT 'draft',
  total_marks numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quizzes_class ON public.quizzes(class_id);

-- ── quiz_questions ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_bank_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  marks_override numeric,
  UNIQUE(quiz_id, question_bank_id)
);

CREATE INDEX IF NOT EXISTS idx_qq_quiz ON public.quiz_questions(quiz_id);

-- ── quiz_attempts ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now() NOT NULL,
  submitted_at timestamptz,
  status public.quiz_attempt_status DEFAULT 'in_progress',
  score numeric,
  max_score numeric,
  UNIQUE(quiz_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_qa_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_qa_student ON public.quiz_attempts(student_id);

-- ── quiz_attempt_answers ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  selected_option_id text,
  answer_text text,
  is_correct boolean,
  marks_awarded numeric,
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_qaa_attempt ON public.quiz_attempt_answers(attempt_id);

-- ── generated_papers ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.generated_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  subject text NOT NULL,
  title text NOT NULL,
  question_ids uuid[] NOT NULL DEFAULT '{}',
  total_marks numeric,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gp_created_by ON public.generated_papers(created_by);

-- ── Storage bucket for assignments ─────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', false)
ON CONFLICT (id) DO NOTHING;

-- ── submit_quiz_attempt function ───────────────────────────────────
-- Enforces timing server-side; auto-grades MCQ; returns score.

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_attempt record;
  v_quiz record;
  v_is_auto boolean;
  v_score numeric := 0;
  v_max numeric := 0;
  v_all_mcq boolean := true;
  v_answer record;
  v_qb record;
  v_marks numeric;
BEGIN
  SELECT * INTO v_attempt FROM quiz_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Attempt not found'); END IF;
  IF v_attempt.status NOT IN ('in_progress') THEN
    RETURN jsonb_build_object('error', 'Already submitted', 'status', v_attempt.status);
  END IF;

  SELECT * INTO v_quiz FROM quizzes WHERE id = v_attempt.quiz_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Quiz not found'); END IF;

  -- Server-side timing enforcement
  v_is_auto := (now() > v_attempt.started_at + (v_quiz.duration_minutes || ' minutes')::interval);

  -- Auto-grade MCQ answers
  FOR v_answer IN
    SELECT qaa.*, qb.question_type, qb.correct_option_id, qb.marks AS qb_marks,
           COALESCE(qq.marks_override, qb.marks) AS eff_marks
    FROM quiz_attempt_answers qaa
    JOIN quiz_questions qq ON qq.quiz_id = v_attempt.quiz_id AND qq.question_bank_id = qaa.question_id
    JOIN question_bank qb ON qb.id = qaa.question_id
    WHERE qaa.attempt_id = p_attempt_id
  LOOP
    v_max := v_max + v_answer.eff_marks;
    IF v_answer.question_type = 'mcq' THEN
      IF v_answer.selected_option_id IS NOT NULL AND v_answer.selected_option_id = v_answer.correct_option_id THEN
        UPDATE quiz_attempt_answers SET is_correct = true, marks_awarded = v_answer.eff_marks
        WHERE id = v_answer.id;
        v_score := v_score + v_answer.eff_marks;
      ELSE
        UPDATE quiz_attempt_answers SET is_correct = false, marks_awarded = 0
        WHERE id = v_answer.id;
      END IF;
    ELSE
      -- short_answer / long_answer: leave for teacher review
      v_all_mcq := false;
      UPDATE quiz_attempt_answers SET marks_awarded = NULL WHERE id = v_answer.id;
    END IF;
  END LOOP;

  -- Set attempt status
  IF v_all_mcq THEN
    UPDATE quiz_attempts
    SET submitted_at = now(), status = 'graded', score = v_score, max_score = v_max
    WHERE id = p_attempt_id;
  ELSE
    UPDATE quiz_attempts
    SET submitted_at = now(),
        status = CASE WHEN v_is_auto THEN 'auto_submitted' ELSE 'submitted' END,
        score = v_score, max_score = v_max
    WHERE id = p_attempt_id;
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'max_score', v_max,
    'status', CASE WHEN v_all_mcq THEN 'graded' ELSE CASE WHEN v_is_auto THEN 'auto_submitted' ELSE 'submitted' END END,
    'auto_submitted', v_is_auto
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid) TO authenticated;

-- ── Helper: check if teacher is assigned to a class+subject ────────

CREATE OR REPLACE FUNCTION public.teaches_class_subject(_class_id uuid, _subject text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN true
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM timetable_slots ts
      WHERE ts.class_id = _class_id
        AND ts.subject = _subject
        AND ts.teacher_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = _class_id AND c.class_teacher_id = auth.uid()
    )
  END
$$;

GRANT EXECUTE ON FUNCTION public.teaches_class_subject(uuid, text) TO authenticated;
