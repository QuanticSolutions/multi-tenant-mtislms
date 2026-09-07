-- =====================================================================
-- MADINA TUL ILM — MASTER MIGRATION
-- Run this once against a fresh Supabase project (SQL Editor).
-- Contains: enums, tables, functions, triggers, grants, RLS policies,
-- storage bucket + policies, and the admin bootstrap.
-- =====================================================================

BEGIN;

-- Functions are declared before their tables in this dump, so skip body
-- validation while the script runs (bodies are re-checked at execution time).
SET LOCAL check_function_bodies = false;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: admission_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.admission_status AS ENUM (
    'new',
    'screening',
    'interview',
    'offered',
    'accepted',
    'rejected',
    'withdrawn'
);


--
-- Name: announcement_audience; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.announcement_audience AS ENUM (
    'all',
    'teachers',
    'parents',
    'class'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'teacher',
    'student',
    'parent',
    'librarian',
    'accountant'
);


--
-- Name: attendance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'excused'
);


--
-- Name: book_issue_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.book_issue_status AS ENUM (
    'issued',
    'returned',
    'overdue',
    'lost'
);


--
-- Name: calc_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.calc_type AS ENUM (
    'flat',
    'percent'
);


--
-- Name: challan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.challan_status AS ENUM (
    'unpaid',
    'pending_review',
    'approved',
    'rejected'
);


--
-- Name: discount_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.discount_type AS ENUM (
    'flat',
    'percent'
);


--
-- Name: donation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.donation_status AS ENUM (
    'pledged',
    'received',
    'cancelled'
);


--
-- Name: employment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employment_status AS ENUM (
    'new',
    'screening',
    'interview',
    'offered',
    'hired',
    'rejected'
);


--
-- Name: event_audience; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_audience AS ENUM (
    'all',
    'students',
    'teachers',
    'parents',
    'staff'
);


--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'holiday',
    'exam',
    'ptm',
    'activity',
    'announcement',
    'other'
);


--
-- Name: exam_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.exam_status AS ENUM (
    'scheduled',
    'ongoing',
    'completed',
    'cancelled'
);


--
-- Name: fee_frequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fee_frequency AS ENUM (
    'one_time',
    'monthly',
    'quarterly',
    'annual'
);


--
-- Name: homework_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.homework_status AS ENUM (
    'draft',
    'assigned',
    'closed'
);


--
-- Name: interview_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.interview_mode AS ENUM (
    'in_person',
    'online',
    'phone'
);


--
-- Name: interview_outcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.interview_outcome AS ENUM (
    'pending',
    'pass',
    'fail',
    'hold'
);


--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_status AS ENUM (
    'pending',
    'paid',
    'partial',
    'overdue',
    'cancelled'
);


--
-- Name: message_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_channel AS ENUM (
    'email',
    'sms',
    'whatsapp',
    'in_app'
);


--
-- Name: message_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_status AS ENUM (
    'draft',
    'queued',
    'sent',
    'failed'
);


--
-- Name: notification_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_channel AS ENUM (
    'email',
    'sms',
    'push',
    'in_app'
);


--
-- Name: notification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_status AS ENUM (
    'queued',
    'sent',
    'failed',
    'delivered'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'bank_transfer',
    'card',
    'cheque',
    'online',
    'other'
);


--
-- Name: payroll_line_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payroll_line_type AS ENUM (
    'earning',
    'deduction',
    'bonus'
);


--
-- Name: payroll_run_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payroll_run_status AS ENUM (
    'draft',
    'finalized',
    'paid'
);


--
-- Name: staff_attendance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.staff_attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'half_day',
    'leave'
);


--
-- Name: student_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.student_status AS ENUM (
    'active',
    'inactive',
    'graduated',
    'transferred',
    'terminated'
);


--
-- Name: submission_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.submission_status AS ENUM (
    'pending',
    'submitted',
    'late',
    'graded'
);


--
-- Name: teacher_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.teacher_status AS ENUM (
    'active',
    'on_leave',
    'inactive',
    'resigned',
    'probation'
);


--
-- Name: apply_inventory_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_inventory_transaction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE delta numeric;
BEGIN
  IF NEW.txn_type = 'in' THEN delta := NEW.quantity;
  ELSIF NEW.txn_type = 'out' THEN delta := -NEW.quantity;
  ELSE delta := NEW.quantity; END IF;
  UPDATE public.inventory_items SET quantity = quantity + delta WHERE id = NEW.item_id;
  RETURN NEW;
END; $$;


--
-- Name: handle_book_issue_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_book_issue_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_avail INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT available_copies INTO v_avail FROM public.books WHERE id = NEW.book_id FOR UPDATE;
    IF v_avail IS NULL OR v_avail < 1 THEN
      RAISE EXCEPTION 'No copies available for this book';
    END IF;
    IF NEW.status = 'issued' AND NEW.due_date < CURRENT_DATE THEN
      NEW.status := 'overdue';
    END IF;
    UPDATE public.books SET available_copies = available_copies - 1 WHERE id = NEW.book_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- returning a previously open issue
    IF OLD.status IN ('issued','overdue') AND NEW.status IN ('returned','lost') THEN
      IF NEW.status = 'returned' THEN
        UPDATE public.books SET available_copies = available_copies + 1 WHERE id = NEW.book_id;
        IF NEW.return_date IS NULL THEN NEW.return_date := CURRENT_DATE; END IF;
      END IF;
      -- 'lost' keeps available_copies lower; optionally reduce total
    ELSIF OLD.status IN ('returned','lost') AND NEW.status IN ('issued','overdue') THEN
      UPDATE public.books SET available_copies = available_copies - 1 WHERE id = NEW.book_id;
    END IF;
    IF NEW.status = 'issued' AND NEW.due_date < CURRENT_DATE THEN
      NEW.status := 'overdue';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('issued','overdue') THEN
      UPDATE public.books SET available_copies = available_copies + 1 WHERE id = OLD.book_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- First user in the system becomes admin automatically
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;


--
-- Name: recompute_invoice_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recompute_invoice_totals() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_invoice_id UUID;
  v_paid NUMERIC(12,2);
  v_amount NUMERIC(12,2);
  v_discount NUMERIC(12,2);
  v_due DATE;
  v_status public.invoice_status;
  v_current public.invoice_status;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payments WHERE invoice_id = v_invoice_id;
  SELECT amount, discount, due_date, status INTO v_amount, v_discount, v_due, v_current FROM public.invoices WHERE id = v_invoice_id;
  IF v_current = 'cancelled' THEN
    UPDATE public.invoices SET amount_paid = v_paid WHERE id = v_invoice_id;
    RETURN NEW;
  END IF;
  IF v_paid >= (v_amount - v_discount) AND v_paid > 0 THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSIF v_due < CURRENT_DATE THEN
    v_status := 'overdue';
  ELSE
    v_status := 'pending';
  END IF;
  UPDATE public.invoices SET amount_paid = v_paid, status = v_status WHERE id = v_invoice_id;
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;




--
-- Name: admission_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_no text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    gender text,
    date_of_birth date,
    applying_for_class_id uuid,
    previous_school text,
    guardian_name text NOT NULL,
    guardian_phone text NOT NULL,
    guardian_email text,
    address text,
    status public.admission_status DEFAULT 'new'::public.admission_status NOT NULL,
    application_fee numeric(10,2) DEFAULT 0 NOT NULL,
    fee_paid boolean DEFAULT false NOT NULL,
    offer_date date,
    decision_date date,
    decision_notes text,
    source text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admission_interviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    mode public.interview_mode DEFAULT 'in_person'::public.interview_mode NOT NULL,
    interviewer_id uuid,
    interviewer_name text,
    score numeric(5,2),
    outcome public.interview_outcome DEFAULT 'pending'::public.interview_outcome NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    audience public.announcement_audience DEFAULT 'all'::public.announcement_audience NOT NULL,
    class_id uuid,
    pinned boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    student_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    status public.attendance_status DEFAULT 'present'::public.attendance_status NOT NULL,
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attendance_deduction_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_deduction_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT 'Absence deduction'::text NOT NULL,
    per_n_absences integer DEFAULT 1 NOT NULL,
    step_type public.calc_type DEFAULT 'percent'::public.calc_type NOT NULL,
    step_value numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_email text,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: book_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid NOT NULL,
    student_id uuid NOT NULL,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    return_date date,
    status public.book_issue_status DEFAULT 'issued'::public.book_issue_status NOT NULL,
    fine_amount numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    issued_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT book_issues_fine_amount_check CHECK ((fine_amount >= (0)::numeric))
);


--
-- Name: books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    author text NOT NULL,
    isbn text,
    category text,
    publisher text,
    publication_year integer,
    total_copies integer DEFAULT 1 NOT NULL,
    available_copies integer DEFAULT 1 NOT NULL,
    shelf_location text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT books_available_copies_check CHECK ((available_copies >= 0)),
    CONSTRAINT books_total_copies_check CHECK ((total_copies >= 0))
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    section text,
    grade_level integer,
    academic_year text DEFAULT '2025-26'::text NOT NULL,
    capacity integer DEFAULT 40 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    class_teacher_id uuid
);


--
-- Name: deduction_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deduction_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    calc_type public.calc_type DEFAULT 'flat'::public.calc_type NOT NULL,
    value numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_teaching boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: donations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_name text NOT NULL,
    donor_phone text,
    donor_email text,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    purpose text,
    method public.payment_method DEFAULT 'cash'::public.payment_method NOT NULL,
    reference text,
    donation_date date DEFAULT CURRENT_DATE NOT NULL,
    status public.donation_status DEFAULT 'pledged'::public.donation_status NOT NULL,
    notes text,
    source text DEFAULT 'admin'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    phone text,
    cnic text,
    licence_no text,
    vehicle_registration text,
    vehicle_model text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employment_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employment_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    "position" text NOT NULL,
    qualification text,
    experience_years numeric(4,1),
    cv_url text,
    expected_salary numeric(12,2),
    status public.employment_status DEFAULT 'new'::public.employment_status NOT NULL,
    notes text,
    source text DEFAULT 'admin'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    event_type public.event_type DEFAULT 'other'::public.event_type NOT NULL,
    audience public.event_audience DEFAULT 'all'::public.event_audience NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    location text,
    class_id uuid,
    is_holiday boolean DEFAULT false NOT NULL,
    color text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT events_date_range CHECK ((end_date >= start_date))
);


--
-- Name: exam_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    marks_obtained numeric(6,2),
    is_absent boolean DEFAULT false NOT NULL,
    remarks text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    title text NOT NULL,
    subject text NOT NULL,
    exam_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    total_marks numeric(6,2) DEFAULT 100 NOT NULL,
    passing_marks numeric(6,2) DEFAULT 35 NOT NULL,
    status public.exam_status DEFAULT 'scheduled'::public.exam_status NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fee_challans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_challans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    group_id uuid,
    period text NOT NULL,
    constituent_breakdown jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount_applied numeric(12,2) DEFAULT 0 NOT NULL,
    total_due numeric(12,2) DEFAULT 0 NOT NULL,
    status public.challan_status DEFAULT 'unpaid'::public.challan_status NOT NULL,
    uploaded_proof_url text,
    rejection_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fee_constituents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_constituents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fee_group_constituents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_group_constituents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    constituent_id uuid NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fee_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    class_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fee_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_structures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    amount numeric(12,2) NOT NULL,
    frequency public.fee_frequency DEFAULT 'monthly'::public.fee_frequency NOT NULL,
    due_day integer,
    academic_year text DEFAULT '2025-26'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fee_structures_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT fee_structures_due_day_check CHECK (((due_day >= 1) AND (due_day <= 31)))
);


--
-- Name: grading_scales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grading_scales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_default boolean DEFAULT false NOT NULL,
    bands jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: homework; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homework (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    subject text NOT NULL,
    title text NOT NULL,
    description text,
    assigned_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    max_marks integer DEFAULT 10 NOT NULL,
    status public.homework_status DEFAULT 'assigned'::public.homework_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: homework_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homework_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    homework_id uuid NOT NULL,
    student_id uuid NOT NULL,
    submitted_date date,
    status public.submission_status DEFAULT 'pending'::public.submission_status NOT NULL,
    marks numeric(6,2),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: import_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_key text NOT NULL,
    name text NOT NULL,
    mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sku text,
    category_id uuid,
    description text,
    unit text DEFAULT 'piece'::text NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    reorder_level numeric DEFAULT 0 NOT NULL,
    unit_cost numeric DEFAULT 0 NOT NULL,
    location text,
    supplier text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    txn_type text NOT NULL,
    quantity numeric NOT NULL,
    unit_cost numeric,
    reference text,
    notes text,
    issued_to text,
    txn_date date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_transactions_txn_type_check CHECK ((txn_type = ANY (ARRAY['in'::text, 'out'::text, 'adjust'::text])))
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_no text NOT NULL,
    student_id uuid NOT NULL,
    fee_structure_id uuid,
    title text NOT NULL,
    amount numeric(12,2) NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    amount_paid numeric(12,2) DEFAULT 0 NOT NULL,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    status public.invoice_status DEFAULT 'pending'::public.invoice_status NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoices_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT invoices_amount_paid_check CHECK ((amount_paid >= (0)::numeric)),
    CONSTRAINT invoices_discount_check CHECK ((discount >= (0)::numeric))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_contact_id uuid,
    student_id uuid,
    subject text,
    body text NOT NULL,
    channel public.message_channel DEFAULT 'in_app'::public.message_channel NOT NULL,
    status public.message_status DEFAULT 'sent'::public.message_status NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel public.notification_channel NOT NULL,
    recipient text NOT NULL,
    recipient_name text,
    subject text,
    body text NOT NULL,
    status public.notification_status DEFAULT 'queued'::public.notification_status NOT NULL,
    related_module text,
    related_id uuid,
    error_message text,
    sent_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: parent_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parent_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    full_name text NOT NULL,
    relation text DEFAULT 'parent'::text NOT NULL,
    phone text,
    email text,
    is_primary boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: parents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    full_name text NOT NULL,
    email text,
    phone text,
    cnic text,
    profession text,
    employer text,
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    method public.payment_method DEFAULT 'cash'::public.payment_method NOT NULL,
    reference text,
    paid_on date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: payroll_item_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_item_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_item_id uuid NOT NULL,
    label text NOT NULL,
    type public.payroll_line_type NOT NULL,
    source text,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payroll_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    basic_salary numeric(12,2) DEFAULT 0 NOT NULL,
    allowances numeric(12,2) DEFAULT 0 NOT NULL,
    deductions numeric(12,2) DEFAULT 0 NOT NULL,
    bonus numeric(12,2) DEFAULT 0 NOT NULL,
    net_pay numeric(12,2) DEFAULT 0 NOT NULL,
    working_days smallint,
    present_days smallint,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payroll_run_bonus_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_run_bonus_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_run_id uuid NOT NULL,
    employee_id uuid,
    name text NOT NULL,
    calc_type public.calc_type DEFAULT 'flat'::public.calc_type NOT NULL,
    value numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payroll_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    period_month smallint NOT NULL,
    period_year smallint NOT NULL,
    status public.payroll_run_status DEFAULT 'draft'::public.payroll_run_status NOT NULL,
    notes text,
    processed_by uuid,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payroll_runs_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT payroll_runs_period_year_check CHECK (((period_year >= 2000) AND (period_year <= 2100)))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role_id uuid
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    module text NOT NULL,
    can_read boolean DEFAULT false NOT NULL,
    can_write boolean DEFAULT false NOT NULL,
    can_update boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: school_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_name text DEFAULT 'Madina Tul Ilm'::text NOT NULL,
    tagline text,
    address text,
    city text,
    phone text,
    email text,
    website text,
    logo_url text,
    current_session text DEFAULT '2025-26'::text NOT NULL,
    session_start_date date,
    session_end_date date,
    timezone text DEFAULT 'Asia/Karachi'::text NOT NULL,
    currency text DEFAULT 'PKR'::text NOT NULL,
    academic_terms jsonb DEFAULT '[]'::jsonb,
    singleton boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    date date NOT NULL,
    status public.staff_attendance_status DEFAULT 'present'::public.staff_attendance_status NOT NULL,
    check_in time without time zone,
    check_out time without time zone,
    hours_worked numeric(5,2),
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_parents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_parents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    relation text DEFAULT 'guardian'::text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_no text NOT NULL,
    full_name text NOT NULL,
    gender text,
    date_of_birth date,
    guardian_name text,
    guardian_phone text,
    guardian_email text,
    address text,
    class_id uuid,
    status public.student_status DEFAULT 'active'::public.student_status NOT NULL,
    enrollment_date date DEFAULT CURRENT_DATE NOT NULL,
    photo_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    driver_id uuid,
    discount_type public.discount_type,
    discount_value numeric(12,2) DEFAULT 0 NOT NULL,
    discount_reason text
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    name text NOT NULL,
    code text,
    teacher_id uuid,
    credit_hours numeric(4,1),
    is_optional boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_no text NOT NULL,
    full_name text NOT NULL,
    email text,
    phone text,
    gender text,
    date_of_birth date,
    qualification text,
    specialization text,
    date_of_joining date DEFAULT CURRENT_DATE NOT NULL,
    status public.teacher_status DEFAULT 'active'::public.teacher_status NOT NULL,
    address text,
    photo_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    department_id uuid,
    subject_id uuid,
    fee_group_id uuid,
    designation text,
    base_salary numeric(12,2) DEFAULT 0 NOT NULL
);


--
-- Name: timetable_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    teacher_id uuid,
    subject text NOT NULL,
    day_of_week smallint NOT NULL,
    period_no smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    room text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT timetable_end_after_start CHECK ((end_time > start_time)),
    CONSTRAINT timetable_slots_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT timetable_slots_period_no_check CHECK (((period_no >= 1) AND (period_no <= 12)))
);


--
-- Name: transport_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    route_id uuid NOT NULL,
    pickup_stop text,
    monthly_fare numeric(10,2) DEFAULT 0 NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transport_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    driver_name text,
    driver_phone text,
    stops text,
    monthly_fare numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transport_vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_no text NOT NULL,
    model text,
    capacity integer DEFAULT 0 NOT NULL,
    route_id uuid,
    driver_name text,
    driver_phone text,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admission_applications admission_applications_application_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT admission_applications_application_no_key UNIQUE (application_no);


--
-- Name: admission_applications admission_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT admission_applications_pkey PRIMARY KEY (id);


--
-- Name: admission_interviews admission_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_interviews
    ADD CONSTRAINT admission_interviews_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_class_id_student_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_class_id_student_id_date_key UNIQUE (class_id, student_id, date);


--
-- Name: attendance_deduction_rules attendance_deduction_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_deduction_rules
    ADD CONSTRAINT attendance_deduction_rules_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: book_issues book_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_issues
    ADD CONSTRAINT book_issues_pkey PRIMARY KEY (id);


--
-- Name: books books_isbn_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_isbn_key UNIQUE (isbn);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: deduction_components deduction_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deduction_components
    ADD CONSTRAINT deduction_components_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: donations donations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: employment_applications employment_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employment_applications
    ADD CONSTRAINT employment_applications_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: exam_results exam_results_exam_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_exam_id_student_id_key UNIQUE (exam_id, student_id);


--
-- Name: exam_results exam_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: fee_challans fee_challans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_challans
    ADD CONSTRAINT fee_challans_pkey PRIMARY KEY (id);


--
-- Name: fee_challans fee_challans_student_id_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_challans
    ADD CONSTRAINT fee_challans_student_id_period_key UNIQUE (student_id, period);


--
-- Name: fee_constituents fee_constituents_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_constituents
    ADD CONSTRAINT fee_constituents_name_key UNIQUE (name);


--
-- Name: fee_constituents fee_constituents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_constituents
    ADD CONSTRAINT fee_constituents_pkey PRIMARY KEY (id);


--
-- Name: fee_group_constituents fee_group_constituents_group_id_constituent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_group_constituents
    ADD CONSTRAINT fee_group_constituents_group_id_constituent_id_key UNIQUE (group_id, constituent_id);


--
-- Name: fee_group_constituents fee_group_constituents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_group_constituents
    ADD CONSTRAINT fee_group_constituents_pkey PRIMARY KEY (id);


--
-- Name: fee_groups fee_groups_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_groups
    ADD CONSTRAINT fee_groups_name_key UNIQUE (name);


--
-- Name: fee_groups fee_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_groups
    ADD CONSTRAINT fee_groups_pkey PRIMARY KEY (id);


--
-- Name: fee_structures fee_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_pkey PRIMARY KEY (id);


--
-- Name: grading_scales grading_scales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_scales
    ADD CONSTRAINT grading_scales_pkey PRIMARY KEY (id);


--
-- Name: homework homework_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_pkey PRIMARY KEY (id);


--
-- Name: homework_submissions homework_submissions_homework_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_homework_id_student_id_key UNIQUE (homework_id, student_id);


--
-- Name: homework_submissions homework_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_pkey PRIMARY KEY (id);


--
-- Name: import_profiles import_profiles_entity_key_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_profiles
    ADD CONSTRAINT import_profiles_entity_key_name_key UNIQUE (entity_key, name);


--
-- Name: import_profiles import_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_profiles
    ADD CONSTRAINT import_profiles_pkey PRIMARY KEY (id);


--
-- Name: inventory_categories inventory_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_name_key UNIQUE (name);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_sku_key UNIQUE (sku);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_no_key UNIQUE (invoice_no);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: parent_contacts parent_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_contacts
    ADD CONSTRAINT parent_contacts_pkey PRIMARY KEY (id);


--
-- Name: parents parents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payroll_item_lines payroll_item_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_item_lines
    ADD CONSTRAINT payroll_item_lines_pkey PRIMARY KEY (id);


--
-- Name: payroll_items payroll_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_pkey PRIMARY KEY (id);


--
-- Name: payroll_items payroll_items_run_id_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_run_id_staff_id_key UNIQUE (run_id, staff_id);


--
-- Name: payroll_run_bonus_lines payroll_run_bonus_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_bonus_lines
    ADD CONSTRAINT payroll_run_bonus_lines_pkey PRIMARY KEY (id);


--
-- Name: payroll_runs payroll_runs_period_month_period_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_period_month_period_year_key UNIQUE (period_month, period_year);


--
-- Name: payroll_runs payroll_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_module_key UNIQUE (role_id, module);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: school_settings school_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_pkey PRIMARY KEY (id);


--
-- Name: school_settings school_settings_singleton_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_singleton_key UNIQUE (singleton);


--
-- Name: staff_attendance staff_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_pkey PRIMARY KEY (id);


--
-- Name: staff_attendance staff_attendance_staff_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_date_key UNIQUE (staff_id, date);


--
-- Name: student_parents student_parents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_parents
    ADD CONSTRAINT student_parents_pkey PRIMARY KEY (id);


--
-- Name: student_parents student_parents_student_id_parent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_parents
    ADD CONSTRAINT student_parents_student_id_parent_id_key UNIQUE (student_id, parent_id);


--
-- Name: students students_admission_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_admission_no_key UNIQUE (admission_no);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_class_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_class_id_name_key UNIQUE (class_id, name);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_employee_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_employee_no_key UNIQUE (employee_no);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: timetable_slots timetable_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_pkey PRIMARY KEY (id);


--
-- Name: timetable_slots timetable_unique_class_slot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_unique_class_slot UNIQUE (class_id, day_of_week, period_no);


--
-- Name: transport_assignments transport_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_assignments
    ADD CONSTRAINT transport_assignments_pkey PRIMARY KEY (id);


--
-- Name: transport_routes transport_routes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_routes
    ADD CONSTRAINT transport_routes_code_key UNIQUE (code);


--
-- Name: transport_routes transport_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_routes
    ADD CONSTRAINT transport_routes_pkey PRIMARY KEY (id);


--
-- Name: transport_vehicles transport_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_vehicles
    ADD CONSTRAINT transport_vehicles_pkey PRIMARY KEY (id);


--
-- Name: transport_vehicles transport_vehicles_registration_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_vehicles
    ADD CONSTRAINT transport_vehicles_registration_no_key UNIQUE (registration_no);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: attendance_class_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_class_date_idx ON public.attendance USING btree (class_id, date);


--
-- Name: attendance_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_student_idx ON public.attendance USING btree (student_id);


--
-- Name: events_start_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_start_date_idx ON public.events USING btree (start_date);


--
-- Name: events_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_type_idx ON public.events USING btree (event_type);


--
-- Name: exams_class_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exams_class_date_idx ON public.exams USING btree (class_id, exam_date DESC);


--
-- Name: idx_admission_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admission_applications_status ON public.admission_applications USING btree (status);


--
-- Name: idx_admission_interviews_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admission_interviews_app ON public.admission_interviews USING btree (application_id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_book_issues_book; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_book_issues_book ON public.book_issues USING btree (book_id);


--
-- Name: idx_book_issues_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_book_issues_status ON public.book_issues USING btree (status);


--
-- Name: idx_book_issues_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_book_issues_student ON public.book_issues USING btree (student_id);


--
-- Name: idx_inv_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_items_category ON public.inventory_items USING btree (category_id);


--
-- Name: idx_inv_txn_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_txn_date ON public.inventory_transactions USING btree (txn_date);


--
-- Name: idx_inv_txn_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_txn_item ON public.inventory_transactions USING btree (item_id);


--
-- Name: idx_messages_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_contact ON public.messages USING btree (parent_contact_id);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_status ON public.notifications USING btree (status);


--
-- Name: idx_parent_contacts_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parent_contacts_student ON public.parent_contacts USING btree (student_id);


--
-- Name: idx_payroll_items_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_items_run ON public.payroll_items USING btree (run_id);


--
-- Name: idx_payroll_items_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_items_staff ON public.payroll_items USING btree (staff_id);


--
-- Name: idx_staff_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_date ON public.staff_attendance USING btree (date);


--
-- Name: idx_staff_attendance_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_staff ON public.staff_attendance USING btree (staff_id);


--
-- Name: idx_student_parents_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_parents_parent ON public.student_parents USING btree (parent_id);


--
-- Name: idx_student_parents_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_parents_student ON public.student_parents USING btree (student_id);


--
-- Name: idx_subjects_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_class ON public.subjects USING btree (class_id);


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: invoices_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_student_idx ON public.invoices USING btree (student_id);


--
-- Name: payments_invoice_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_invoice_idx ON public.payments USING btree (invoice_id);


--
-- Name: students_class_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_class_id_idx ON public.students USING btree (class_id);


--
-- Name: students_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_status_idx ON public.students USING btree (status);


--
-- Name: students_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX students_user_id_key ON public.students USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: teachers_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX teachers_user_id_key ON public.teachers USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: timetable_slots_class_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX timetable_slots_class_idx ON public.timetable_slots USING btree (class_id, day_of_week, period_no);


--
-- Name: timetable_slots_teacher_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX timetable_slots_teacher_idx ON public.timetable_slots USING btree (teacher_id, day_of_week, period_no);


--
-- Name: timetable_unique_teacher_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX timetable_unique_teacher_slot ON public.timetable_slots USING btree (teacher_id, day_of_week, period_no) WHERE (teacher_id IS NOT NULL);


--
-- Name: transport_assignments_route_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transport_assignments_route_idx ON public.transport_assignments USING btree (route_id);


--
-- Name: transport_assignments_unique_active_student; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX transport_assignments_unique_active_student ON public.transport_assignments USING btree (student_id) WHERE (is_active = true);


--
-- Name: admission_applications admission_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER admission_applications_updated_at BEFORE UPDATE ON public.admission_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: admission_interviews admission_interviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER admission_interviews_updated_at BEFORE UPDATE ON public.admission_interviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: attendance_deduction_rules adr_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER adr_updated_at BEFORE UPDATE ON public.attendance_deduction_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: attendance attendance_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER attendance_set_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: classes classes_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER classes_set_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: deduction_components deduction_components_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER deduction_components_updated_at BEFORE UPDATE ON public.deduction_components FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: departments departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: donations donations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER donations_updated_at BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: drivers drivers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: employment_applications employment_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER employment_applications_updated_at BEFORE UPDATE ON public.employment_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: events events_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: exam_results exam_results_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER exam_results_set_updated_at BEFORE UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: exams exams_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER exams_set_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: fee_challans fee_challans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER fee_challans_updated_at BEFORE UPDATE ON public.fee_challans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: fee_constituents fee_constituents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER fee_constituents_updated_at BEFORE UPDATE ON public.fee_constituents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: fee_groups fee_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER fee_groups_updated_at BEFORE UPDATE ON public.fee_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: fee_structures fee_structures_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER fee_structures_set_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: fee_group_constituents fgc_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER fgc_updated_at BEFORE UPDATE ON public.fee_group_constituents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: grading_scales grading_scales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER grading_scales_updated_at BEFORE UPDATE ON public.grading_scales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: invoices invoices_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notifications notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: parents parents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER parents_updated_at BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payments payments_recompute_invoice; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payments_recompute_invoice AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.recompute_invoice_totals();


--
-- Name: payments payments_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payroll_item_lines payroll_item_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payroll_item_lines_updated_at BEFORE UPDATE ON public.payroll_item_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payroll_run_bonus_lines prbl_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prbl_updated_at BEFORE UPDATE ON public.payroll_run_bonus_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: role_permissions role_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: roles roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: school_settings school_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: import_profiles set_import_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_import_profiles_updated_at BEFORE UPDATE ON public.import_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: students students_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subjects subjects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: teachers teachers_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER teachers_set_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: timetable_slots timetable_slots_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER timetable_slots_set_updated_at BEFORE UPDATE ON public.timetable_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: announcements trg_announcements_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: book_issues trg_book_issues_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_book_issues_changes BEFORE INSERT OR DELETE OR UPDATE ON public.book_issues FOR EACH ROW EXECUTE FUNCTION public.handle_book_issue_change();


--
-- Name: book_issues trg_book_issues_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_book_issues_updated BEFORE UPDATE ON public.book_issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: books trg_books_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_books_updated BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: homework trg_homework_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_homework_updated BEFORE UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: homework_submissions trg_hw_submissions_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hw_submissions_updated BEFORE UPDATE ON public.homework_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: inventory_transactions trg_inv_apply_txn; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_apply_txn AFTER INSERT ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_transaction();


--
-- Name: inventory_categories trg_inv_categories_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_categories_updated BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: inventory_items trg_inv_items_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_items_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: inventory_transactions trg_inv_txn_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_txn_updated BEFORE UPDATE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: messages trg_messages_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: parent_contacts trg_parent_contacts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_parent_contacts_updated BEFORE UPDATE ON public.parent_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payroll_items trg_payroll_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payroll_items_updated_at BEFORE UPDATE ON public.payroll_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payroll_runs trg_payroll_runs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: staff_attendance trg_staff_attendance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_staff_attendance_updated_at BEFORE UPDATE ON public.staff_attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: transport_assignments trg_transport_assignments_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_transport_assignments_updated BEFORE UPDATE ON public.transport_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: transport_routes trg_transport_routes_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_transport_routes_updated BEFORE UPDATE ON public.transport_routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: transport_vehicles trg_transport_vehicles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_transport_vehicles_updated BEFORE UPDATE ON public.transport_vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: admission_applications admission_applications_applying_for_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_applications
    ADD CONSTRAINT admission_applications_applying_for_class_id_fkey FOREIGN KEY (applying_for_class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- Name: admission_interviews admission_interviews_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_interviews
    ADD CONSTRAINT admission_interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admission_applications(id) ON DELETE CASCADE;


--
-- Name: admission_interviews admission_interviews_interviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_interviews
    ADD CONSTRAINT admission_interviews_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES public.teachers(id) ON DELETE SET NULL;


--
-- Name: announcements announcements_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: attendance attendance_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: attendance attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: book_issues book_issues_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_issues
    ADD CONSTRAINT book_issues_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE RESTRICT;


--
-- Name: book_issues book_issues_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_issues
    ADD CONSTRAINT book_issues_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES auth.users(id);


--
-- Name: book_issues book_issues_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_issues
    ADD CONSTRAINT book_issues_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;


--
-- Name: classes classes_class_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_class_teacher_id_fkey FOREIGN KEY (class_teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;


--
-- Name: events events_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: exam_results exam_results_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_results exam_results_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: exam_results exam_results_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: exams exams_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: exams exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: fee_challans fee_challans_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_challans
    ADD CONSTRAINT fee_challans_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.fee_groups(id) ON DELETE SET NULL;


--
-- Name: fee_challans fee_challans_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_challans
    ADD CONSTRAINT fee_challans_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: fee_challans fee_challans_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_challans
    ADD CONSTRAINT fee_challans_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: fee_group_constituents fee_group_constituents_constituent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_group_constituents
    ADD CONSTRAINT fee_group_constituents_constituent_id_fkey FOREIGN KEY (constituent_id) REFERENCES public.fee_constituents(id) ON DELETE RESTRICT;


--
-- Name: fee_group_constituents fee_group_constituents_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_group_constituents
    ADD CONSTRAINT fee_group_constituents_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.fee_groups(id) ON DELETE CASCADE;


--
-- Name: fee_structures fee_structures_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: homework homework_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: homework homework_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: homework_submissions homework_submissions_homework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_homework_id_fkey FOREIGN KEY (homework_id) REFERENCES public.homework(id) ON DELETE CASCADE;


--
-- Name: homework_submissions homework_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: import_profiles import_profiles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_profiles
    ADD CONSTRAINT import_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: inventory_items inventory_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id) ON DELETE SET NULL;


--
-- Name: inventory_transactions inventory_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: inventory_transactions inventory_transactions_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_fee_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: messages messages_parent_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_contact_id_fkey FOREIGN KEY (parent_contact_id) REFERENCES public.parent_contacts(id) ON DELETE SET NULL;


--
-- Name: messages messages_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: messages messages_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: parent_contacts parent_contacts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_contacts
    ADD CONSTRAINT parent_contacts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: parents parents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: payroll_item_lines payroll_item_lines_payroll_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_item_lines
    ADD CONSTRAINT payroll_item_lines_payroll_item_id_fkey FOREIGN KEY (payroll_item_id) REFERENCES public.payroll_items(id) ON DELETE CASCADE;


--
-- Name: payroll_items payroll_items_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.payroll_runs(id) ON DELETE CASCADE;


--
-- Name: payroll_items payroll_items_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: payroll_run_bonus_lines payroll_run_bonus_lines_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_bonus_lines
    ADD CONSTRAINT payroll_run_bonus_lines_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: payroll_run_bonus_lines payroll_run_bonus_lines_payroll_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_run_bonus_lines
    ADD CONSTRAINT payroll_run_bonus_lines_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.payroll_runs(id) ON DELETE CASCADE;


--
-- Name: payroll_runs payroll_runs_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: staff_attendance staff_attendance_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: staff_attendance staff_attendance_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: student_parents student_parents_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_parents
    ADD CONSTRAINT student_parents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE;


--
-- Name: student_parents student_parents_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_parents
    ADD CONSTRAINT student_parents_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- Name: students students_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: subjects subjects_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;


--
-- Name: teachers teachers_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;


--
-- Name: teachers teachers_fee_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_fee_group_id_fkey FOREIGN KEY (fee_group_id) REFERENCES public.fee_groups(id) ON DELETE SET NULL;


--
-- Name: teachers teachers_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;


--
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: timetable_slots timetable_slots_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: timetable_slots timetable_slots_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;


--
-- Name: transport_assignments transport_assignments_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_assignments
    ADD CONSTRAINT transport_assignments_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.transport_routes(id) ON DELETE CASCADE;


--
-- Name: transport_assignments transport_assignments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_assignments
    ADD CONSTRAINT transport_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: transport_vehicles transport_vehicles_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_vehicles
    ADD CONSTRAINT transport_vehicles_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.transport_routes(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: invoices Accountants manage invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants manage invoices" ON public.invoices TO authenticated USING (public.has_role(auth.uid(), 'accountant'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'accountant'::public.app_role));


--
-- Name: payments Accountants manage payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Accountants manage payments" ON public.payments TO authenticated USING (public.has_role(auth.uid(), 'accountant'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'accountant'::public.app_role));


--
-- Name: grading_scales Admin manage scales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manage scales" ON public.grading_scales TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: school_settings Admin manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manage settings" ON public.school_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admin view audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin view audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can read all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can read all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: announcements Admins manage announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage announcements" ON public.announcements TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admission_applications Admins manage applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage applications" ON public.admission_applications TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: transport_assignments Admins manage assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage assignments" ON public.transport_assignments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: attendance Admins manage attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage attendance" ON public.attendance TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: books Admins manage books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage books" ON public.books TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: classes Admins manage classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage classes" ON public.classes TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: donations Admins manage donations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage donations" ON public.donations TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: drivers Admins manage drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage drivers" ON public.drivers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employment_applications Admins manage employment applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage employment applications" ON public.employment_applications TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: events Admins manage events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage events" ON public.events TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: exam_results Admins manage exam results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage exam results" ON public.exam_results TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: exams Admins manage exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage exams" ON public.exams TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: fee_structures Admins manage fee structures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage fee structures" ON public.fee_structures TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: homework Admins manage homework; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage homework" ON public.homework TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: import_profiles Admins manage import profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage import profiles" ON public.import_profiles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admission_interviews Admins manage interviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage interviews" ON public.admission_interviews TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inventory_categories Admins manage inventory categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage inventory categories" ON public.inventory_categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inventory_items Admins manage inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage inventory items" ON public.inventory_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inventory_transactions Admins manage inventory transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage inventory transactions" ON public.inventory_transactions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invoices Admins manage invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage invoices" ON public.invoices TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: book_issues Admins manage issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage issues" ON public.book_issues TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: messages Admins manage messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage messages" ON public.messages TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins manage notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage notifications" ON public.notifications TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: parent_contacts Admins manage parent contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage parent contacts" ON public.parent_contacts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payments Admins manage payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage payments" ON public.payments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payroll_items Admins manage payroll items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage payroll items" ON public.payroll_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payroll_runs Admins manage payroll runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage payroll runs" ON public.payroll_runs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: transport_routes Admins manage routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage routes" ON public.transport_routes TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: staff_attendance Admins manage staff attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage staff attendance" ON public.staff_attendance TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: students Admins manage students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage students" ON public.students TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: homework_submissions Admins manage submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage submissions" ON public.homework_submissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: teachers Admins manage teachers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage teachers" ON public.teachers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: timetable_slots Admins manage timetable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage timetable" ON public.timetable_slots TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: transport_vehicles Admins manage vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage vehicles" ON public.transport_vehicles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: parents Admins read parents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read parents" ON public.parents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: student_parents Admins read student_parents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read student_parents" ON public.student_parents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admission_applications Admins view applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view applications" ON public.admission_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admission_interviews Admins view interviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view interviews" ON public.admission_interviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins view notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view notifications" ON public.notifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: grading_scales Admins view scales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view scales" ON public.grading_scales FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: school_settings Admins view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view settings" ON public.school_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: events Anyone can view events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view events" ON public.events FOR SELECT TO anon USING (true);


--
-- Name: audit_logs Anyone insert audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: import_profiles Authenticated can view import profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view import profiles" ON public.import_profiles FOR SELECT TO authenticated USING (true);


--
-- Name: user_roles Only admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admission_applications Public can submit admission applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can submit admission applications" ON public.admission_applications FOR INSERT TO anon WITH CHECK (true);


--
-- Name: donations Public can submit donations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can submit donations" ON public.donations FOR INSERT TO anon WITH CHECK (true);


--
-- Name: employment_applications Public can submit employment applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can submit employment applications" ON public.employment_applications FOR INSERT TO anon WITH CHECK (true);


--
-- Name: events Signed-in users can view events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Signed-in users can view events" ON public.events FOR SELECT TO authenticated USING (true);


--
-- Name: staff_attendance Staff attendance viewable by staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff attendance viewable by staff" ON public.staff_attendance FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: drivers Staff can view drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view drivers" ON public.drivers FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: parents Staff manage parents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff manage parents" ON public.parents TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: student_parents Staff manage student_parents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff manage student_parents" ON public.student_parents TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subjects Staff manage subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff manage subjects" ON public.subjects TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: announcements Staff read announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read announcements" ON public.announcements FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: fee_structures Staff read fee structures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read fee structures" ON public.fee_structures FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: inventory_categories Staff read inventory categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read inventory categories" ON public.inventory_categories FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: inventory_items Staff read inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read inventory items" ON public.inventory_items FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: inventory_transactions Staff read inventory transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read inventory transactions" ON public.inventory_transactions FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: subjects Staff read subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read subjects" ON public.subjects FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: timetable_slots Staff view timetable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff view timetable" ON public.timetable_slots FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: announcements Students read announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students read announcements" ON public.announcements FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'student'::public.app_role) AND (published_at IS NOT NULL) AND ((audience = ANY (ARRAY['all'::public.announcement_audience, 'parents'::public.announcement_audience])) OR ((audience = 'class'::public.announcement_audience) AND (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.user_id = auth.uid()) AND (s.class_id = announcements.class_id))))))));


--
-- Name: classes Students read own class; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students read own class" ON public.classes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.user_id = auth.uid()) AND (s.class_id = classes.id)))));


--
-- Name: timetable_slots Students read own class timetable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students read own class timetable" ON public.timetable_slots FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.user_id = auth.uid()) AND (s.class_id = timetable_slots.class_id)))));


--
-- Name: students Students read own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students read own record" ON public.students FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: attendance Teachers insert attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: exam_results Teachers insert exam results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers insert exam results" ON public.exam_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: homework Teachers manage homework; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers manage homework" ON public.homework TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: book_issues Teachers manage issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers manage issues" ON public.book_issues TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: messages Teachers manage messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers manage messages" ON public.messages TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: homework_submissions Teachers manage submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers manage submissions" ON public.homework_submissions TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: transport_assignments Teachers read assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read assignments" ON public.transport_assignments FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: attendance Teachers read attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read attendance" ON public.attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: classes Teachers read classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read classes" ON public.classes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: events Teachers read events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read events" ON public.events FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: teachers Teachers read own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read own record" ON public.teachers FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: parent_contacts Teachers read parent contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read parent contacts" ON public.parent_contacts FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: transport_routes Teachers read routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read routes" ON public.transport_routes FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: students Teachers read students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read students" ON public.students FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: teachers Teachers read teachers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read teachers" ON public.teachers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: transport_vehicles Teachers read vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers read vehicles" ON public.transport_vehicles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: attendance Teachers update attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers update attendance" ON public.attendance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: exam_results Teachers update exam results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers update exam results" ON public.exam_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: books Teachers view books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers view books" ON public.books FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: exam_results Teachers view exam results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers view exam results" ON public.exam_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: exams Teachers view exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers view exams" ON public.exams FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users can read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: admission_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_interviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_interviews ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_deduction_rules adr admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "adr admin" ON public.attendance_deduction_rules TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_deduction_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_deduction_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: book_issues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;

--
-- Name: books; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_challans challans admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "challans admin" ON public.fee_challans TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: fee_challans challans own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "challans own read" ON public.fee_challans FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = fee_challans.student_id) AND (s.user_id = auth.uid())))));


--
-- Name: fee_challans challans own upload; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "challans own upload" ON public.fee_challans FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = fee_challans.student_id) AND (s.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = fee_challans.student_id) AND (s.user_id = auth.uid())))));


--
-- Name: fee_challans challans staff read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "challans staff read" ON public.fee_challans FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));


--
-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

--
-- Name: deduction_components; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deduction_components ENABLE ROW LEVEL SECURITY;

--
-- Name: deduction_components deduction_components admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deduction_components admin" ON public.deduction_components TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: departments departments admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "departments admin" ON public.departments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: departments departments read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "departments read" ON public.departments FOR SELECT TO authenticated USING (true);


--
-- Name: donations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

--
-- Name: drivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

--
-- Name: employment_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employment_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

--
-- Name: exams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_challans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_challans ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_constituents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_constituents ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_constituents fee_constituents admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fee_constituents admin" ON public.fee_constituents TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: fee_constituents fee_constituents read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fee_constituents read" ON public.fee_constituents FOR SELECT TO authenticated USING (true);


--
-- Name: fee_group_constituents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_group_constituents ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_groups fee_groups admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fee_groups admin" ON public.fee_groups TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: fee_groups fee_groups read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fee_groups read" ON public.fee_groups FOR SELECT TO authenticated USING (true);


--
-- Name: fee_structures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_group_constituents fgc admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fgc admin" ON public.fee_group_constituents TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: fee_group_constituents fgc read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fgc read" ON public.fee_group_constituents FOR SELECT TO authenticated USING (true);


--
-- Name: grading_scales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;

--
-- Name: homework; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

--
-- Name: homework_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: import_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: parent_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parent_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: parents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_item_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_item_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_item_lines payroll_item_lines admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "payroll_item_lines admin" ON public.payroll_item_lines TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payroll_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_run_bonus_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_run_bonus_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_run_bonus_lines prbl admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "prbl admin" ON public.payroll_run_bonus_lines TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions role_permissions admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "role_permissions admin" ON public.role_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: role_permissions role_permissions read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "role_permissions read" ON public.role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: roles roles admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "roles admin" ON public.roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: roles roles read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "roles read" ON public.roles FOR SELECT TO authenticated USING (true);


--
-- Name: school_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: student_parents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: teachers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

--
-- Name: timetable_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: transport_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: transport_routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: transport_vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION apply_inventory_transaction(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.apply_inventory_transaction() TO anon;
GRANT ALL ON FUNCTION public.apply_inventory_transaction() TO authenticated;
GRANT ALL ON FUNCTION public.apply_inventory_transaction() TO service_role;


--
-- Name: FUNCTION handle_book_issue_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_book_issue_change() TO anon;
GRANT ALL ON FUNCTION public.handle_book_issue_change() TO authenticated;
GRANT ALL ON FUNCTION public.handle_book_issue_change() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;


--
-- Name: FUNCTION recompute_invoice_totals(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.recompute_invoice_totals() TO anon;
GRANT ALL ON FUNCTION public.recompute_invoice_totals() TO authenticated;
GRANT ALL ON FUNCTION public.recompute_invoice_totals() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: TABLE admission_applications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admission_applications TO anon;
GRANT ALL ON TABLE public.admission_applications TO authenticated;
GRANT ALL ON TABLE public.admission_applications TO service_role;


--
-- Name: TABLE admission_interviews; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admission_interviews TO anon;
GRANT ALL ON TABLE public.admission_interviews TO authenticated;
GRANT ALL ON TABLE public.admission_interviews TO service_role;


--
-- Name: TABLE announcements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.announcements TO anon;
GRANT ALL ON TABLE public.announcements TO authenticated;
GRANT ALL ON TABLE public.announcements TO service_role;


--
-- Name: TABLE attendance; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.attendance TO anon;
GRANT ALL ON TABLE public.attendance TO authenticated;
GRANT ALL ON TABLE public.attendance TO service_role;


--
-- Name: TABLE attendance_deduction_rules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.attendance_deduction_rules TO anon;
GRANT ALL ON TABLE public.attendance_deduction_rules TO authenticated;
GRANT ALL ON TABLE public.attendance_deduction_rules TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE book_issues; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.book_issues TO anon;
GRANT ALL ON TABLE public.book_issues TO authenticated;
GRANT ALL ON TABLE public.book_issues TO service_role;


--
-- Name: TABLE books; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.books TO anon;
GRANT ALL ON TABLE public.books TO authenticated;
GRANT ALL ON TABLE public.books TO service_role;


--
-- Name: TABLE classes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.classes TO anon;
GRANT ALL ON TABLE public.classes TO authenticated;
GRANT ALL ON TABLE public.classes TO service_role;


--
-- Name: TABLE deduction_components; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deduction_components TO anon;
GRANT ALL ON TABLE public.deduction_components TO authenticated;
GRANT ALL ON TABLE public.deduction_components TO service_role;


--
-- Name: TABLE departments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.departments TO anon;
GRANT ALL ON TABLE public.departments TO authenticated;
GRANT ALL ON TABLE public.departments TO service_role;


--
-- Name: TABLE donations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.donations TO anon;
GRANT ALL ON TABLE public.donations TO authenticated;
GRANT ALL ON TABLE public.donations TO service_role;


--
-- Name: TABLE drivers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.drivers TO anon;
GRANT ALL ON TABLE public.drivers TO authenticated;
GRANT ALL ON TABLE public.drivers TO service_role;


--
-- Name: TABLE employment_applications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.employment_applications TO anon;
GRANT ALL ON TABLE public.employment_applications TO authenticated;
GRANT ALL ON TABLE public.employment_applications TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


--
-- Name: TABLE exam_results; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.exam_results TO anon;
GRANT ALL ON TABLE public.exam_results TO authenticated;
GRANT ALL ON TABLE public.exam_results TO service_role;


--
-- Name: TABLE exams; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.exams TO anon;
GRANT ALL ON TABLE public.exams TO authenticated;
GRANT ALL ON TABLE public.exams TO service_role;


--
-- Name: TABLE fee_challans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fee_challans TO anon;
GRANT ALL ON TABLE public.fee_challans TO authenticated;
GRANT ALL ON TABLE public.fee_challans TO service_role;


--
-- Name: TABLE fee_constituents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fee_constituents TO anon;
GRANT ALL ON TABLE public.fee_constituents TO authenticated;
GRANT ALL ON TABLE public.fee_constituents TO service_role;


--
-- Name: TABLE fee_group_constituents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fee_group_constituents TO anon;
GRANT ALL ON TABLE public.fee_group_constituents TO authenticated;
GRANT ALL ON TABLE public.fee_group_constituents TO service_role;


--
-- Name: TABLE fee_groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fee_groups TO anon;
GRANT ALL ON TABLE public.fee_groups TO authenticated;
GRANT ALL ON TABLE public.fee_groups TO service_role;


--
-- Name: TABLE fee_structures; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fee_structures TO anon;
GRANT ALL ON TABLE public.fee_structures TO authenticated;
GRANT ALL ON TABLE public.fee_structures TO service_role;


--
-- Name: TABLE grading_scales; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.grading_scales TO anon;
GRANT ALL ON TABLE public.grading_scales TO authenticated;
GRANT ALL ON TABLE public.grading_scales TO service_role;


--
-- Name: TABLE homework; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.homework TO anon;
GRANT ALL ON TABLE public.homework TO authenticated;
GRANT ALL ON TABLE public.homework TO service_role;


--
-- Name: TABLE homework_submissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.homework_submissions TO anon;
GRANT ALL ON TABLE public.homework_submissions TO authenticated;
GRANT ALL ON TABLE public.homework_submissions TO service_role;


--
-- Name: TABLE import_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.import_profiles TO anon;
GRANT ALL ON TABLE public.import_profiles TO authenticated;
GRANT ALL ON TABLE public.import_profiles TO service_role;


--
-- Name: TABLE inventory_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_categories TO anon;
GRANT ALL ON TABLE public.inventory_categories TO authenticated;
GRANT ALL ON TABLE public.inventory_categories TO service_role;


--
-- Name: TABLE inventory_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_items TO anon;
GRANT ALL ON TABLE public.inventory_items TO authenticated;
GRANT ALL ON TABLE public.inventory_items TO service_role;


--
-- Name: TABLE inventory_transactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_transactions TO anon;
GRANT ALL ON TABLE public.inventory_transactions TO authenticated;
GRANT ALL ON TABLE public.inventory_transactions TO service_role;


--
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invoices TO anon;
GRANT ALL ON TABLE public.invoices TO authenticated;
GRANT ALL ON TABLE public.invoices TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE parent_contacts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.parent_contacts TO anon;
GRANT ALL ON TABLE public.parent_contacts TO authenticated;
GRANT ALL ON TABLE public.parent_contacts TO service_role;


--
-- Name: TABLE parents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.parents TO anon;
GRANT ALL ON TABLE public.parents TO authenticated;
GRANT ALL ON TABLE public.parents TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;


--
-- Name: TABLE payroll_item_lines; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payroll_item_lines TO anon;
GRANT ALL ON TABLE public.payroll_item_lines TO authenticated;
GRANT ALL ON TABLE public.payroll_item_lines TO service_role;


--
-- Name: TABLE payroll_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payroll_items TO anon;
GRANT ALL ON TABLE public.payroll_items TO authenticated;
GRANT ALL ON TABLE public.payroll_items TO service_role;


--
-- Name: TABLE payroll_run_bonus_lines; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payroll_run_bonus_lines TO anon;
GRANT ALL ON TABLE public.payroll_run_bonus_lines TO authenticated;
GRANT ALL ON TABLE public.payroll_run_bonus_lines TO service_role;


--
-- Name: TABLE payroll_runs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payroll_runs TO anon;
GRANT ALL ON TABLE public.payroll_runs TO authenticated;
GRANT ALL ON TABLE public.payroll_runs TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.role_permissions TO anon;
GRANT ALL ON TABLE public.role_permissions TO authenticated;
GRANT ALL ON TABLE public.role_permissions TO service_role;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.roles TO anon;
GRANT ALL ON TABLE public.roles TO authenticated;
GRANT ALL ON TABLE public.roles TO service_role;


--
-- Name: TABLE school_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.school_settings TO anon;
GRANT ALL ON TABLE public.school_settings TO authenticated;
GRANT ALL ON TABLE public.school_settings TO service_role;


--
-- Name: TABLE staff_attendance; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_attendance TO anon;
GRANT ALL ON TABLE public.staff_attendance TO authenticated;
GRANT ALL ON TABLE public.staff_attendance TO service_role;


--
-- Name: TABLE student_parents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.student_parents TO anon;
GRANT ALL ON TABLE public.student_parents TO authenticated;
GRANT ALL ON TABLE public.student_parents TO service_role;


--
-- Name: TABLE students; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.students TO anon;
GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.students TO service_role;


--
-- Name: TABLE subjects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subjects TO anon;
GRANT ALL ON TABLE public.subjects TO authenticated;
GRANT ALL ON TABLE public.subjects TO service_role;


--
-- Name: TABLE teachers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.teachers TO anon;
GRANT ALL ON TABLE public.teachers TO authenticated;
GRANT ALL ON TABLE public.teachers TO service_role;


--
-- Name: TABLE timetable_slots; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.timetable_slots TO anon;
GRANT ALL ON TABLE public.timetable_slots TO authenticated;
GRANT ALL ON TABLE public.timetable_slots TO service_role;


--
-- Name: TABLE transport_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transport_assignments TO anon;
GRANT ALL ON TABLE public.transport_assignments TO authenticated;
GRANT ALL ON TABLE public.transport_assignments TO service_role;


--
-- Name: TABLE transport_routes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transport_routes TO anon;
GRANT ALL ON TABLE public.transport_routes TO authenticated;
GRANT ALL ON TABLE public.transport_routes TO service_role;


--
-- Name: TABLE transport_vehicles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transport_vehicles TO anon;
GRANT ALL ON TABLE public.transport_vehicles TO authenticated;
GRANT ALL ON TABLE public.transport_vehicles TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


-- =====================================================================
-- AUTH: auto-create a profile on sign-up; first ever user becomes admin
-- =====================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- STORAGE: private bucket for payment proofs
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "proofs upload" ON storage.objects;
CREATE POLICY "proofs upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "proofs own read" ON storage.objects;
CREATE POLICY "proofs own read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "proofs admin delete" ON storage.objects;
CREATE POLICY "proofs admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

COMMIT;

-- =====================================================================
-- ADMIN USER CREATION
-- Preferred: sign up through the app's /auth page. The FIRST account
-- created in a fresh project automatically becomes admin (see the
-- handle_new_user trigger above).
--
-- To promote an existing account to admin, run:
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com'
--   ON CONFLICT DO NOTHING;
--
--   INSERT INTO public.profiles (id, full_name, email)
--   SELECT id, COALESCE(raw_user_meta_data->>'full_name', split_part(email,'@',1)), email
--   FROM auth.users WHERE email = 'you@example.com'
--   ON CONFLICT (id) DO NOTHING;
-- =====================================================================
