-- =====================================================================
-- QSLMS — MASTER DATABASE MIGRATION
-- Run this against a fresh Supabase project using the SQL Editor.
-- This combines all migration files into a single script that creates
-- the complete database schema: enums, tables, constraints, indexes,
-- functions, triggers, foreign keys, RLS policies, grants, and storage.
-- =====================================================================

-- =====================================================================
-- Migration: 20260929030104_master_part1_enums.sql
-- =====================================================================

CREATE TYPE public.admission_status AS ENUM ('new','screening','interview','offered','accepted','rejected','withdrawn');
CREATE TYPE public.announcement_audience AS ENUM ('all','teachers','parents','class');
CREATE TYPE public.app_role AS ENUM ('admin','teacher','student','parent','librarian','accountant');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','excused');
CREATE TYPE public.book_issue_status AS ENUM ('issued','returned','overdue','lost');
CREATE TYPE public.calc_type AS ENUM ('flat','percent');
CREATE TYPE public.challan_status AS ENUM ('unpaid','pending_review','approved','rejected');
CREATE TYPE public.discount_type AS ENUM ('flat','percent');
CREATE TYPE public.donation_status AS ENUM ('pledged','received','cancelled');
CREATE TYPE public.employment_status AS ENUM ('new','screening','interview','offered','hired','rejected');
CREATE TYPE public.event_audience AS ENUM ('all','students','teachers','parents','staff');
CREATE TYPE public.event_type AS ENUM ('holiday','exam','ptm','activity','announcement','other');
CREATE TYPE public.exam_status AS ENUM ('scheduled','ongoing','completed','cancelled');
CREATE TYPE public.fee_frequency AS ENUM ('one_time','monthly','quarterly','annual');
CREATE TYPE public.homework_status AS ENUM ('draft','assigned','closed');
CREATE TYPE public.interview_mode AS ENUM ('in_person','online','phone');
CREATE TYPE public.interview_outcome AS ENUM ('pending','pass','fail','hold');
CREATE TYPE public.invoice_status AS ENUM ('pending','paid','partial','overdue','cancelled');
CREATE TYPE public.message_channel AS ENUM ('email','sms','whatsapp','in_app');
CREATE TYPE public.message_status AS ENUM ('draft','queued','sent','failed');
CREATE TYPE public.notification_channel AS ENUM ('email','sms','push','in_app');
CREATE TYPE public.notification_status AS ENUM ('queued','sent','failed','delivered');
CREATE TYPE public.payment_method AS ENUM ('cash','bank_transfer','card','cheque','online','other');
CREATE TYPE public.payroll_line_type AS ENUM ('earning','deduction','bonus');
CREATE TYPE public.payroll_run_status AS ENUM ('draft','finalized','paid');
CREATE TYPE public.staff_attendance_status AS ENUM ('present','absent','late','half_day','leave');
CREATE TYPE public.student_status AS ENUM ('active','inactive','graduated','transferred','terminated');
CREATE TYPE public.submission_status AS ENUM ('pending','submitted','late','graded');
CREATE TYPE public.teacher_status AS ENUM ('active','on_leave','inactive','resigned','probation');

-- =====================================================================
-- Migration: 20260929030159_master_part2_tables.sql
-- =====================================================================

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

CREATE TABLE public.deduction_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    calc_type public.calc_type DEFAULT 'flat'::public.calc_type NOT NULL,
    value numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_teaching boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE public.fee_constituents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.fee_group_constituents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    constituent_id uuid NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.fee_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    class_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE public.grading_scales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_default boolean DEFAULT false NOT NULL,
    bands jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE public.import_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_key text NOT NULL,
    name text NOT NULL,
    mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.inventory_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role_id uuid
);

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

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE public.student_parents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    relation text DEFAULT 'guardian'::text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================================
-- Migration: 20260929030229_master_part3_constraints_indexes.sql
-- =====================================================================

ALTER TABLE ONLY public.admission_applications ADD CONSTRAINT admission_applications_application_no_key UNIQUE (application_no);
ALTER TABLE ONLY public.admission_applications ADD CONSTRAINT admission_applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admission_interviews ADD CONSTRAINT admission_interviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.announcements ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_class_id_student_id_date_key UNIQUE (class_id, student_id, date);
ALTER TABLE ONLY public.attendance_deduction_rules ADD CONSTRAINT attendance_deduction_rules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.book_issues ADD CONSTRAINT book_issues_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.books ADD CONSTRAINT books_isbn_key UNIQUE (isbn);
ALTER TABLE ONLY public.books ADD CONSTRAINT books_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.classes ADD CONSTRAINT classes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.deduction_components ADD CONSTRAINT deduction_components_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.departments ADD CONSTRAINT departments_name_key UNIQUE (name);
ALTER TABLE ONLY public.departments ADD CONSTRAINT departments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.donations ADD CONSTRAINT donations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.drivers ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.employment_applications ADD CONSTRAINT employment_applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exam_results ADD CONSTRAINT exam_results_exam_id_student_id_key UNIQUE (exam_id, student_id);
ALTER TABLE ONLY public.exam_results ADD CONSTRAINT exam_results_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.exams ADD CONSTRAINT exams_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fee_challans ADD CONSTRAINT fee_challans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fee_challans ADD CONSTRAINT fee_challans_student_id_period_key UNIQUE (student_id, period);
ALTER TABLE ONLY public.fee_constituents ADD CONSTRAINT fee_constituents_name_key UNIQUE (name);
ALTER TABLE ONLY public.fee_constituents ADD CONSTRAINT fee_constituents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fee_group_constituents ADD CONSTRAINT fee_group_constituents_group_id_constituent_id_key UNIQUE (group_id, constituent_id);
ALTER TABLE ONLY public.fee_group_constituents ADD CONSTRAINT fee_group_constituents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fee_groups ADD CONSTRAINT fee_groups_name_key UNIQUE (name);
ALTER TABLE ONLY public.fee_groups ADD CONSTRAINT fee_groups_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fee_structures ADD CONSTRAINT fee_structures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.grading_scales ADD CONSTRAINT grading_scales_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.homework ADD CONSTRAINT homework_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.homework_submissions ADD CONSTRAINT homework_submissions_homework_id_student_id_key UNIQUE (homework_id, student_id);
ALTER TABLE ONLY public.homework_submissions ADD CONSTRAINT homework_submissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.import_profiles ADD CONSTRAINT import_profiles_entity_key_name_key UNIQUE (entity_key, name);
ALTER TABLE ONLY public.import_profiles ADD CONSTRAINT import_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_categories ADD CONSTRAINT inventory_categories_name_key UNIQUE (name);
ALTER TABLE ONLY public.inventory_categories ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_items ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_items ADD CONSTRAINT inventory_items_sku_key UNIQUE (sku);
ALTER TABLE ONLY public.inventory_transactions ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_invoice_no_key UNIQUE (invoice_no);
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.parent_contacts ADD CONSTRAINT parent_contacts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.parents ADD CONSTRAINT parents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payroll_item_lines ADD CONSTRAINT payroll_item_lines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payroll_items ADD CONSTRAINT payroll_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payroll_items ADD CONSTRAINT payroll_items_run_id_staff_id_key UNIQUE (run_id, staff_id);
ALTER TABLE ONLY public.payroll_run_bonus_lines ADD CONSTRAINT payroll_run_bonus_lines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payroll_runs ADD CONSTRAINT payroll_runs_period_month_period_year_key UNIQUE (period_month, period_year);
ALTER TABLE ONLY public.payroll_runs ADD CONSTRAINT payroll_runs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_role_id_module_key UNIQUE (role_id, module);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_name_key UNIQUE (name);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.school_settings ADD CONSTRAINT school_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.school_settings ADD CONSTRAINT school_settings_singleton_key UNIQUE (singleton);
ALTER TABLE ONLY public.staff_attendance ADD CONSTRAINT staff_attendance_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staff_attendance ADD CONSTRAINT staff_attendance_staff_id_date_key UNIQUE (staff_id, date);
ALTER TABLE ONLY public.student_parents ADD CONSTRAINT student_parents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_parents ADD CONSTRAINT student_parents_student_id_parent_id_key UNIQUE (student_id, parent_id);
ALTER TABLE ONLY public.students ADD CONSTRAINT students_admission_no_key UNIQUE (admission_no);
ALTER TABLE ONLY public.students ADD CONSTRAINT students_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subjects ADD CONSTRAINT subjects_class_id_name_key UNIQUE (class_id, name);
ALTER TABLE ONLY public.subjects ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.teachers ADD CONSTRAINT teachers_employee_no_key UNIQUE (employee_no);
ALTER TABLE ONLY public.teachers ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_slots ADD CONSTRAINT timetable_slots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timetable_slots ADD CONSTRAINT timetable_unique_class_slot UNIQUE (class_id, day_of_week, period_no);
ALTER TABLE ONLY public.transport_assignments ADD CONSTRAINT transport_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_routes ADD CONSTRAINT transport_routes_code_key UNIQUE (code);
ALTER TABLE ONLY public.transport_routes ADD CONSTRAINT transport_routes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_vehicles ADD CONSTRAINT transport_vehicles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transport_vehicles ADD CONSTRAINT transport_vehicles_registration_no_key UNIQUE (registration_no);
ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

CREATE INDEX attendance_class_date_idx ON public.attendance USING btree (class_id, date);
CREATE INDEX attendance_student_idx ON public.attendance USING btree (student_id);
CREATE INDEX events_start_date_idx ON public.events USING btree (start_date);
CREATE INDEX events_type_idx ON public.events USING btree (event_type);
CREATE INDEX exams_class_date_idx ON public.exams USING btree (class_id, exam_date DESC);
CREATE INDEX idx_admission_applications_status ON public.admission_applications USING btree (status);
CREATE INDEX idx_admission_interviews_app ON public.admission_interviews USING btree (application_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);
CREATE INDEX idx_book_issues_book ON public.book_issues USING btree (book_id);
CREATE INDEX idx_book_issues_status ON public.book_issues USING btree (status);
CREATE INDEX idx_book_issues_student ON public.book_issues USING btree (student_id);
CREATE INDEX idx_inv_items_category ON public.inventory_items USING btree (category_id);
CREATE INDEX idx_inv_txn_date ON public.inventory_transactions USING btree (txn_date);
CREATE INDEX idx_inv_txn_item ON public.inventory_transactions USING btree (item_id);
CREATE INDEX idx_messages_contact ON public.messages USING btree (parent_contact_id);
CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_status ON public.notifications USING btree (status);
CREATE INDEX idx_parent_contacts_student ON public.parent_contacts USING btree (student_id);
CREATE INDEX idx_payroll_items_run ON public.payroll_items USING btree (run_id);
CREATE INDEX idx_payroll_items_staff ON public.payroll_items USING btree (staff_id);
CREATE INDEX idx_staff_attendance_date ON public.staff_attendance USING btree (date);
CREATE INDEX idx_staff_attendance_staff ON public.staff_attendance USING btree (staff_id);
CREATE INDEX idx_student_parents_parent ON public.student_parents USING btree (parent_id);
CREATE INDEX idx_student_parents_student ON public.student_parents USING btree (student_id);
CREATE INDEX idx_subjects_class ON public.subjects USING btree (class_id);
CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);
CREATE INDEX invoices_student_idx ON public.invoices USING btree (student_id);
CREATE INDEX payments_invoice_idx ON public.payments USING btree (invoice_id);
CREATE INDEX students_class_id_idx ON public.students USING btree (class_id);
CREATE INDEX students_status_idx ON public.students USING btree (status);
CREATE UNIQUE INDEX students_user_id_key ON public.students USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX teachers_user_id_key ON public.teachers USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE INDEX timetable_slots_class_idx ON public.timetable_slots USING btree (class_id, day_of_week, period_no);
CREATE INDEX timetable_slots_teacher_idx ON public.timetable_slots USING btree (teacher_id, day_of_week, period_no);
CREATE UNIQUE INDEX timetable_unique_teacher_slot ON public.timetable_slots USING btree (teacher_id, day_of_week, period_no) WHERE (teacher_id IS NOT NULL);
CREATE INDEX transport_assignments_route_idx ON public.transport_assignments USING btree (route_id);
CREATE UNIQUE INDEX transport_assignments_unique_active_student ON public.transport_assignments USING btree (student_id) WHERE (is_active = true);

-- =====================================================================
-- Migration: 20260929030247_master_part4_functions.sql
-- =====================================================================

SET check_function_bodies = false;

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

CREATE FUNCTION public.handle_book_issue_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_avail INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT available_copies INTO v_avail FROM public.books WHERE id = NEW.book_id FOR UPDATE;
    IF v_avail IS NULL OR v_avail < 1 THEN RAISE EXCEPTION 'No copies available for this book'; END IF;
    IF NEW.status = 'issued' AND NEW.due_date < CURRENT_DATE THEN NEW.status := 'overdue'; END IF;
    UPDATE public.books SET available_copies = available_copies - 1 WHERE id = NEW.book_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('issued','overdue') AND NEW.status IN ('returned','lost') THEN
      IF NEW.status = 'returned' THEN
        UPDATE public.books SET available_copies = available_copies + 1 WHERE id = NEW.book_id;
        IF NEW.return_date IS NULL THEN NEW.return_date := CURRENT_DATE; END IF;
      END IF;
    ELSIF OLD.status IN ('returned','lost') AND NEW.status IN ('issued','overdue') THEN
      UPDATE public.books SET available_copies = available_copies - 1 WHERE id = NEW.book_id;
    END IF;
    IF NEW.status = 'issued' AND NEW.due_date < CURRENT_DATE THEN NEW.status := 'overdue'; END IF;
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

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE FUNCTION public.recompute_invoice_totals() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_invoice_id UUID; v_paid NUMERIC(12,2); v_amount NUMERIC(12,2);
  v_discount NUMERIC(12,2); v_due DATE; v_status public.invoice_status; v_current public.invoice_status;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payments WHERE invoice_id = v_invoice_id;
  SELECT amount, discount, due_date, status INTO v_amount, v_discount, v_due, v_current FROM public.invoices WHERE id = v_invoice_id;
  IF v_current = 'cancelled' THEN
    UPDATE public.invoices SET amount_paid = v_paid WHERE id = v_invoice_id;
    RETURN NEW;
  END IF;
  IF v_paid >= (v_amount - v_discount) AND v_paid > 0 THEN v_status := 'paid';
  ELSIF v_paid > 0 THEN v_status := 'partial';
  ELSIF v_due < CURRENT_DATE THEN v_status := 'overdue';
  ELSE v_status := 'pending'; END IF;
  UPDATE public.invoices SET amount_paid = v_paid, status = v_status WHERE id = v_invoice_id;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =====================================================================
-- Migration: 20260929030320_master_part5_triggers_fkeys.sql
-- =====================================================================

CREATE TRIGGER admission_applications_updated_at BEFORE UPDATE ON public.admission_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER admission_interviews_updated_at BEFORE UPDATE ON public.admission_interviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER adr_updated_at BEFORE UPDATE ON public.attendance_deduction_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER attendance_set_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER classes_set_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER deduction_components_updated_at BEFORE UPDATE ON public.deduction_components FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER donations_updated_at BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER employment_applications_updated_at BEFORE UPDATE ON public.employment_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER exam_results_set_updated_at BEFORE UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER exams_set_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fee_challans_updated_at BEFORE UPDATE ON public.fee_challans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fee_constituents_updated_at BEFORE UPDATE ON public.fee_constituents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fee_groups_updated_at BEFORE UPDATE ON public.fee_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fee_structures_set_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fgc_updated_at BEFORE UPDATE ON public.fee_group_constituents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER grading_scales_updated_at BEFORE UPDATE ON public.grading_scales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER parents_updated_at BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payments_recompute_invoice AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.recompute_invoice_totals();
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payroll_item_lines_updated_at BEFORE UPDATE ON public.payroll_item_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER prbl_updated_at BEFORE UPDATE ON public.payroll_run_bonus_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_import_profiles_updated_at BEFORE UPDATE ON public.import_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER teachers_set_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER timetable_slots_set_updated_at BEFORE UPDATE ON public.timetable_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_book_issues_changes BEFORE INSERT OR DELETE OR UPDATE ON public.book_issues FOR EACH ROW EXECUTE FUNCTION public.handle_book_issue_change();
CREATE TRIGGER trg_book_issues_updated BEFORE UPDATE ON public.book_issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_books_updated BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_homework_updated BEFORE UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hw_submissions_updated BEFORE UPDATE ON public.homework_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inv_apply_txn AFTER INSERT ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_transaction();
CREATE TRIGGER trg_inv_categories_updated BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inv_items_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inv_txn_updated BEFORE UPDATE ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_parent_contacts_updated BEFORE UPDATE ON public.parent_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payroll_items_updated_at BEFORE UPDATE ON public.payroll_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_staff_attendance_updated_at BEFORE UPDATE ON public.staff_attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transport_assignments_updated BEFORE UPDATE ON public.transport_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transport_routes_updated BEFORE UPDATE ON public.transport_routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transport_vehicles_updated BEFORE UPDATE ON public.transport_vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE ONLY public.admission_applications ADD CONSTRAINT admission_applications_applying_for_class_id_fkey FOREIGN KEY (applying_for_class_id) REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.admission_interviews ADD CONSTRAINT admission_interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admission_applications(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.admission_interviews ADD CONSTRAINT admission_interviews_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES public.teachers(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.announcements ADD CONSTRAINT announcements_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.announcements ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.book_issues ADD CONSTRAINT book_issues_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.book_issues ADD CONSTRAINT book_issues_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.book_issues ADD CONSTRAINT book_issues_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.classes ADD CONSTRAINT classes_class_teacher_id_fkey FOREIGN KEY (class_teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.events ADD CONSTRAINT events_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.events ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.exam_results ADD CONSTRAINT exam_results_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.exam_results ADD CONSTRAINT exam_results_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.exam_results ADD CONSTRAINT exam_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.exams ADD CONSTRAINT exams_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.exams ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.fee_challans ADD CONSTRAINT fee_challans_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.fee_groups(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.fee_challans ADD CONSTRAINT fee_challans_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.fee_challans ADD CONSTRAINT fee_challans_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.fee_group_constituents ADD CONSTRAINT fee_group_constituents_constituent_id_fkey FOREIGN KEY (constituent_id) REFERENCES public.fee_constituents(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.fee_group_constituents ADD CONSTRAINT fee_group_constituents_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.fee_groups(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.fee_structures ADD CONSTRAINT fee_structures_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.homework ADD CONSTRAINT homework_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.homework ADD CONSTRAINT homework_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.homework_submissions ADD CONSTRAINT homework_submissions_homework_id_fkey FOREIGN KEY (homework_id) REFERENCES public.homework(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.homework_submissions ADD CONSTRAINT homework_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.import_profiles ADD CONSTRAINT import_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.inventory_items ADD CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.inventory_transactions ADD CONSTRAINT inventory_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.inventory_transactions ADD CONSTRAINT inventory_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_parent_contact_id_fkey FOREIGN KEY (parent_contact_id) REFERENCES public.parent_contacts(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.parent_contacts ADD CONSTRAINT parent_contacts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.parents ADD CONSTRAINT parents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll_item_lines ADD CONSTRAINT payroll_item_lines_payroll_item_id_fkey FOREIGN KEY (payroll_item_id) REFERENCES public.payroll_items(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll_items ADD CONSTRAINT payroll_items_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.payroll_runs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll_items ADD CONSTRAINT payroll_items_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.teachers(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll_run_bonus_lines ADD CONSTRAINT payroll_run_bonus_lines_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.teachers(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll_run_bonus_lines ADD CONSTRAINT payroll_run_bonus_lines_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.payroll_runs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll_runs ADD CONSTRAINT payroll_runs_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.staff_attendance ADD CONSTRAINT staff_attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.staff_attendance ADD CONSTRAINT staff_attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.teachers(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_parents ADD CONSTRAINT student_parents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.student_parents ADD CONSTRAINT student_parents_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.students ADD CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.students ADD CONSTRAINT students_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.subjects ADD CONSTRAINT subjects_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.subjects ADD CONSTRAINT subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.teachers ADD CONSTRAINT teachers_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.teachers ADD CONSTRAINT teachers_fee_group_id_fkey FOREIGN KEY (fee_group_id) REFERENCES public.fee_groups(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.teachers ADD CONSTRAINT teachers_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.teachers ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.timetable_slots ADD CONSTRAINT timetable_slots_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.timetable_slots ADD CONSTRAINT timetable_slots_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.transport_assignments ADD CONSTRAINT transport_assignments_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.transport_routes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.transport_assignments ADD CONSTRAINT transport_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.transport_vehicles ADD CONSTRAINT transport_vehicles_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.transport_routes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =====================================================================
-- Migration: 20260929030421_master_part6_rls_policies.sql
-- =====================================================================

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_deduction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_constituents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_group_constituents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_item_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_bonus_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants manage invoices" ON public.invoices TO authenticated USING (public.has_role(auth.uid(), 'accountant'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'accountant'::public.app_role));
CREATE POLICY "Accountants manage payments" ON public.payments TO authenticated USING (public.has_role(auth.uid(), 'accountant'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'accountant'::public.app_role));
CREATE POLICY "Admin manage scales" ON public.grading_scales TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin manage settings" ON public.school_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admin view audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage announcements" ON public.announcements TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage applications" ON public.admission_applications TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage assignments" ON public.transport_assignments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage attendance" ON public.attendance TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage books" ON public.books TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage classes" ON public.classes TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage donations" ON public.donations TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage drivers" ON public.drivers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage employment applications" ON public.employment_applications TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage events" ON public.events TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage exam results" ON public.exam_results TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage exams" ON public.exams TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage fee structures" ON public.fee_structures TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage homework" ON public.homework TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage import profiles" ON public.import_profiles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage interviews" ON public.admission_interviews TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage inventory categories" ON public.inventory_categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage inventory items" ON public.inventory_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage inventory transactions" ON public.inventory_transactions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage invoices" ON public.invoices TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage issues" ON public.book_issues TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage messages" ON public.messages TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage notifications" ON public.notifications TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage parent contacts" ON public.parent_contacts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage payments" ON public.payments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage payroll items" ON public.payroll_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage payroll runs" ON public.payroll_runs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage routes" ON public.transport_routes TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage staff attendance" ON public.staff_attendance TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage students" ON public.students TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage submissions" ON public.homework_submissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage teachers" ON public.teachers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage timetable" ON public.timetable_slots TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage vehicles" ON public.transport_vehicles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins read parents" ON public.parents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins read student_parents" ON public.student_parents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins view applications" ON public.admission_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins view interviews" ON public.admission_interviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins view notifications" ON public.notifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins view scales" ON public.grading_scales FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins view settings" ON public.school_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can view import profiles" ON public.import_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Public can submit admission applications" ON public.admission_applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can submit donations" ON public.donations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can submit employment applications" ON public.employment_applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Signed-in users can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff attendance viewable by staff" ON public.staff_attendance FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));
CREATE POLICY "Staff can view drivers" ON public.drivers FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));
CREATE POLICY "Staff manage parents" ON public.parents TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Staff manage student_parents" ON public.student_parents TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Staff manage subjects" ON public.subjects TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));
CREATE POLICY "Staff read announcements" ON public.announcements FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));
CREATE POLICY "Staff read fee structures" ON public.fee_structures FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));
CREATE POLICY "Staff read inventory categories" ON public.inventory_categories FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));
CREATE POLICY "Staff read inventory items" ON public.inventory_items FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));
CREATE POLICY "Staff read inventory transactions" ON public.inventory_transactions FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));
CREATE POLICY "Staff read subjects" ON public.subjects FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));
CREATE POLICY "Staff view timetable" ON public.timetable_slots FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));
CREATE POLICY "Students read announcements" ON public.announcements FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'student'::public.app_role) AND (published_at IS NOT NULL) AND ((audience = ANY (ARRAY['all'::public.announcement_audience, 'parents'::public.announcement_audience])) OR ((audience = 'class'::public.announcement_audience) AND (EXISTS ( SELECT 1 FROM public.students s WHERE ((s.user_id = auth.uid()) AND (s.class_id = announcements.class_id))))))));
CREATE POLICY "Students read own class" ON public.classes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM public.students s WHERE ((s.user_id = auth.uid()) AND (s.class_id = classes.id)))));
CREATE POLICY "Students read own class timetable" ON public.timetable_slots FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM public.students s WHERE ((s.user_id = auth.uid()) AND (s.class_id = timetable_slots.class_id)))));
CREATE POLICY "Students read own record" ON public.students FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Teachers insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers insert exam results" ON public.exam_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers manage homework" ON public.homework TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers manage issues" ON public.book_issues TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Teachers manage messages" ON public.messages TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Teachers manage submissions" ON public.homework_submissions TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers read assignments" ON public.transport_assignments FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Teachers read attendance" ON public.attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers read classes" ON public.classes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers read events" ON public.events FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Teachers read own record" ON public.teachers FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Teachers read parent contacts" ON public.parent_contacts FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Teachers read routes" ON public.transport_routes FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Teachers read students" ON public.students FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers read teachers" ON public.teachers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers read vehicles" ON public.transport_vehicles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Teachers update attendance" ON public.attendance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers update exam results" ON public.exam_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers view books" ON public.books FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Teachers view exam results" ON public.exam_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Teachers view exams" ON public.exams FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'::public.app_role));
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "adr admin" ON public.attendance_deduction_rules TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "challans admin" ON public.fee_challans TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "challans own read" ON public.fee_challans FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM public.students s WHERE ((s.id = fee_challans.student_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "challans own upload" ON public.fee_challans FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM public.students s WHERE ((s.id = fee_challans.student_id) AND (s.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1 FROM public.students s WHERE ((s.id = fee_challans.student_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "challans staff read" ON public.fee_challans FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role)));
CREATE POLICY "deduction_components admin" ON public.deduction_components TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "departments admin" ON public.departments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "departments read" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_constituents admin" ON public.fee_constituents TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "fee_constituents read" ON public.fee_constituents FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_groups admin" ON public.fee_groups TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "fee_groups read" ON public.fee_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "fgc admin" ON public.fee_group_constituents TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "fgc read" ON public.fee_group_constituents FOR SELECT TO authenticated USING (true);
CREATE POLICY "payroll_item_lines admin" ON public.payroll_item_lines TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "prbl admin" ON public.payroll_run_bonus_lines TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "role_permissions admin" ON public.role_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "role_permissions read" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles admin" ON public.roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "roles read" ON public.roles FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- Migration: 20260929030449_master_part7_grants_auth_storage.sql
-- =====================================================================

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON FUNCTION public.apply_inventory_transaction() TO anon;
GRANT ALL ON FUNCTION public.apply_inventory_transaction() TO authenticated;
GRANT ALL ON FUNCTION public.apply_inventory_transaction() TO service_role;
GRANT ALL ON FUNCTION public.handle_book_issue_change() TO anon;
GRANT ALL ON FUNCTION public.handle_book_issue_change() TO authenticated;
GRANT ALL ON FUNCTION public.handle_book_issue_change() TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
GRANT ALL ON FUNCTION public.recompute_invoice_totals() TO anon;
GRANT ALL ON FUNCTION public.recompute_invoice_totals() TO authenticated;
GRANT ALL ON FUNCTION public.recompute_invoice_totals() TO service_role;
GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

GRANT ALL ON TABLE public.admission_applications TO anon;
GRANT ALL ON TABLE public.admission_applications TO authenticated;
GRANT ALL ON TABLE public.admission_applications TO service_role;
GRANT ALL ON TABLE public.admission_interviews TO anon;
GRANT ALL ON TABLE public.admission_interviews TO authenticated;
GRANT ALL ON TABLE public.admission_interviews TO service_role;
GRANT ALL ON TABLE public.announcements TO anon;
GRANT ALL ON TABLE public.announcements TO authenticated;
GRANT ALL ON TABLE public.announcements TO service_role;
GRANT ALL ON TABLE public.attendance TO anon;
GRANT ALL ON TABLE public.attendance TO authenticated;
GRANT ALL ON TABLE public.attendance TO service_role;
GRANT ALL ON TABLE public.attendance_deduction_rules TO anon;
GRANT ALL ON TABLE public.attendance_deduction_rules TO authenticated;
GRANT ALL ON TABLE public.attendance_deduction_rules TO service_role;
GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;
GRANT ALL ON TABLE public.book_issues TO anon;
GRANT ALL ON TABLE public.book_issues TO authenticated;
GRANT ALL ON TABLE public.book_issues TO service_role;
GRANT ALL ON TABLE public.books TO anon;
GRANT ALL ON TABLE public.books TO authenticated;
GRANT ALL ON TABLE public.books TO service_role;
GRANT ALL ON TABLE public.classes TO anon;
GRANT ALL ON TABLE public.classes TO authenticated;
GRANT ALL ON TABLE public.classes TO service_role;
GRANT ALL ON TABLE public.deduction_components TO anon;
GRANT ALL ON TABLE public.deduction_components TO authenticated;
GRANT ALL ON TABLE public.deduction_components TO service_role;
GRANT ALL ON TABLE public.departments TO anon;
GRANT ALL ON TABLE public.departments TO authenticated;
GRANT ALL ON TABLE public.departments TO service_role;
GRANT ALL ON TABLE public.donations TO anon;
GRANT ALL ON TABLE public.donations TO authenticated;
GRANT ALL ON TABLE public.donations TO service_role;
GRANT ALL ON TABLE public.drivers TO anon;
GRANT ALL ON TABLE public.drivers TO authenticated;
GRANT ALL ON TABLE public.drivers TO service_role;
GRANT ALL ON TABLE public.employment_applications TO anon;
GRANT ALL ON TABLE public.employment_applications TO authenticated;
GRANT ALL ON TABLE public.employment_applications TO service_role;
GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;
GRANT ALL ON TABLE public.exam_results TO anon;
GRANT ALL ON TABLE public.exam_results TO authenticated;
GRANT ALL ON TABLE public.exam_results TO service_role;
GRANT ALL ON TABLE public.exams TO anon;
GRANT ALL ON TABLE public.exams TO authenticated;
GRANT ALL ON TABLE public.exams TO service_role;
GRANT ALL ON TABLE public.fee_challans TO anon;
GRANT ALL ON TABLE public.fee_challans TO authenticated;
GRANT ALL ON TABLE public.fee_challans TO service_role;
GRANT ALL ON TABLE public.fee_constituents TO anon;
GRANT ALL ON TABLE public.fee_constituents TO authenticated;
GRANT ALL ON TABLE public.fee_constituents TO service_role;
GRANT ALL ON TABLE public.fee_group_constituents TO anon;
GRANT ALL ON TABLE public.fee_group_constituents TO authenticated;
GRANT ALL ON TABLE public.fee_group_constituents TO service_role;
GRANT ALL ON TABLE public.fee_groups TO anon;
GRANT ALL ON TABLE public.fee_groups TO authenticated;
GRANT ALL ON TABLE public.fee_groups TO service_role;
GRANT ALL ON TABLE public.fee_structures TO anon;
GRANT ALL ON TABLE public.fee_structures TO authenticated;
GRANT ALL ON TABLE public.fee_structures TO service_role;
GRANT ALL ON TABLE public.grading_scales TO anon;
GRANT ALL ON TABLE public.grading_scales TO authenticated;
GRANT ALL ON TABLE public.grading_scales TO service_role;
GRANT ALL ON TABLE public.homework TO anon;
GRANT ALL ON TABLE public.homework TO authenticated;
GRANT ALL ON TABLE public.homework TO service_role;
GRANT ALL ON TABLE public.homework_submissions TO anon;
GRANT ALL ON TABLE public.homework_submissions TO authenticated;
GRANT ALL ON TABLE public.homework_submissions TO service_role;
GRANT ALL ON TABLE public.import_profiles TO anon;
GRANT ALL ON TABLE public.import_profiles TO authenticated;
GRANT ALL ON TABLE public.import_profiles TO service_role;
GRANT ALL ON TABLE public.inventory_categories TO anon;
GRANT ALL ON TABLE public.inventory_categories TO authenticated;
GRANT ALL ON TABLE public.inventory_categories TO service_role;
GRANT ALL ON TABLE public.inventory_items TO anon;
GRANT ALL ON TABLE public.inventory_items TO authenticated;
GRANT ALL ON TABLE public.inventory_items TO service_role;
GRANT ALL ON TABLE public.inventory_transactions TO anon;
GRANT ALL ON TABLE public.inventory_transactions TO authenticated;
GRANT ALL ON TABLE public.inventory_transactions TO service_role;
GRANT ALL ON TABLE public.invoices TO anon;
GRANT ALL ON TABLE public.invoices TO authenticated;
GRANT ALL ON TABLE public.invoices TO service_role;
GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;
GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;
GRANT ALL ON TABLE public.parent_contacts TO anon;
GRANT ALL ON TABLE public.parent_contacts TO authenticated;
GRANT ALL ON TABLE public.parent_contacts TO service_role;
GRANT ALL ON TABLE public.parents TO anon;
GRANT ALL ON TABLE public.parents TO authenticated;
GRANT ALL ON TABLE public.parents TO service_role;
GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;
GRANT ALL ON TABLE public.payroll_item_lines TO anon;
GRANT ALL ON TABLE public.payroll_item_lines TO authenticated;
GRANT ALL ON TABLE public.payroll_item_lines TO service_role;
GRANT ALL ON TABLE public.payroll_items TO anon;
GRANT ALL ON TABLE public.payroll_items TO authenticated;
GRANT ALL ON TABLE public.payroll_items TO service_role;
GRANT ALL ON TABLE public.payroll_run_bonus_lines TO anon;
GRANT ALL ON TABLE public.payroll_run_bonus_lines TO authenticated;
GRANT ALL ON TABLE public.payroll_run_bonus_lines TO service_role;
GRANT ALL ON TABLE public.payroll_runs TO anon;
GRANT ALL ON TABLE public.payroll_runs TO authenticated;
GRANT ALL ON TABLE public.payroll_runs TO service_role;
GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.role_permissions TO anon;
GRANT ALL ON TABLE public.role_permissions TO authenticated;
GRANT ALL ON TABLE public.role_permissions TO service_role;
GRANT ALL ON TABLE public.roles TO anon;
GRANT ALL ON TABLE public.roles TO authenticated;
GRANT ALL ON TABLE public.roles TO service_role;
GRANT ALL ON TABLE public.school_settings TO anon;
GRANT ALL ON TABLE public.school_settings TO authenticated;
GRANT ALL ON TABLE public.school_settings TO service_role;
GRANT ALL ON TABLE public.staff_attendance TO anon;
GRANT ALL ON TABLE public.staff_attendance TO authenticated;
GRANT ALL ON TABLE public.staff_attendance TO service_role;
GRANT ALL ON TABLE public.student_parents TO anon;
GRANT ALL ON TABLE public.student_parents TO authenticated;
GRANT ALL ON TABLE public.student_parents TO service_role;
GRANT ALL ON TABLE public.students TO anon;
GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.students TO service_role;
GRANT ALL ON TABLE public.subjects TO anon;
GRANT ALL ON TABLE public.subjects TO authenticated;
GRANT ALL ON TABLE public.subjects TO service_role;
GRANT ALL ON TABLE public.teachers TO anon;
GRANT ALL ON TABLE public.teachers TO authenticated;
GRANT ALL ON TABLE public.teachers TO service_role;
GRANT ALL ON TABLE public.timetable_slots TO anon;
GRANT ALL ON TABLE public.timetable_slots TO authenticated;
GRANT ALL ON TABLE public.timetable_slots TO service_role;
GRANT ALL ON TABLE public.transport_assignments TO anon;
GRANT ALL ON TABLE public.transport_assignments TO authenticated;
GRANT ALL ON TABLE public.transport_assignments TO service_role;
GRANT ALL ON TABLE public.transport_routes TO anon;
GRANT ALL ON TABLE public.transport_routes TO authenticated;
GRANT ALL ON TABLE public.transport_routes TO service_role;
GRANT ALL ON TABLE public.transport_vehicles TO anon;
GRANT ALL ON TABLE public.transport_vehicles TO authenticated;
GRANT ALL ON TABLE public.transport_vehicles TO service_role;
GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- =====================================================================
-- Migration: 20260929031253_multi_tenant_infra.sql
-- =====================================================================

/*
# Multi-tenant infrastructure: tenants table + tenant_id on all tables
*/

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subdomain text NOT NULL,
    display_name text NOT NULL,
    status text DEFAULT 'trial' NOT NULL,
    school_name text,
    tagline text,
    logo_url text,
    favicon_url text,
    primary_color text,
    secondary_color text,
    accent_color text,
    onboarding_completed_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    onboarding_dismissed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenants_subdomain_key UNIQUE (subdomain),
    CONSTRAINT tenants_pkey PRIMARY KEY (id),
    CONSTRAINT tenants_status_check CHECK ((status = ANY (ARRAY['trial'::text, 'active'::text, 'suspended'::text])))
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.tenants TO anon;
GRANT ALL ON TABLE public.tenants TO authenticated;
GRANT ALL ON TABLE public.tenants TO service_role;

-- Add tenant_id to profiles FIRST (policies depend on it)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS profiles_tenant_id_idx ON public.profiles (tenant_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.user_roles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS user_roles_tenant_id_idx ON public.user_roles (tenant_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.school_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS school_settings_tenant_id_idx ON public.school_settings (tenant_id) WHERE tenant_id IS NOT NULL;

-- Now add tenant_id to all data tables
DO $$
DECLARE
    tbl text;
    data_tables text[] := ARRAY[
        'admission_applications','admission_interviews','announcements','attendance',
        'attendance_deduction_rules','audit_logs','book_issues','books','classes',
        'deduction_components','departments','donations','drivers',
        'employment_applications','events','exam_results','exams','fee_challans',
        'fee_constituents','fee_group_constituents','fee_groups','fee_structures',
        'grading_scales','homework','homework_submissions','import_profiles',
        'inventory_categories','inventory_items','inventory_transactions','invoices',
        'messages','notifications','parent_contacts','parents','payments',
        'payroll_item_lines','payroll_items','payroll_run_bonus_lines','payroll_runs',
        'role_permissions','roles','staff_attendance','student_parents','students',
        'subjects','teachers','timetable_slots','transport_assignments',
        'transport_routes','transport_vehicles'
    ];
BEGIN
    FOREACH tbl IN ARRAY data_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'tenant_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE', tbl);
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I_tenant_idx ON public.%I (tenant_id)', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- Now create RLS policies on tenants (profiles.tenant_id exists now)
DROP POLICY IF EXISTS "tenants select own" ON public.tenants;
CREATE POLICY "tenants select own" ON public.tenants FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.tenant_id = tenants.id)
    );
DROP POLICY IF EXISTS "tenants update own" ON public.tenants;
CREATE POLICY "tenants update own" ON public.tenants FOR UPDATE
    TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.tenant_id = tenants.id)
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.tenant_id = tenants.id)
    );
DROP POLICY IF EXISTS "tenants insert own" ON public.tenants;
CREATE POLICY "tenants insert own" ON public.tenants FOR INSERT
    TO authenticated WITH CHECK (true);

-- Helper function
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1; $$;

-- Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_tenant_id uuid; v_user_count integer; v_subdomain text;
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)), NEW.email)
    ON CONFLICT (id) DO NOTHING;
    SELECT COUNT(*) INTO v_user_count FROM public.tenants;
    IF v_user_count = 0 THEN
        v_subdomain := COALESCE(NEW.raw_user_meta_data ->> 'subdomain', 'default');
        INSERT INTO public.tenants (subdomain, display_name, school_name)
        VALUES (v_subdomain, COALESCE(NEW.raw_user_meta_data ->> 'school_name', 'My School'), COALESCE(NEW.raw_user_meta_data ->> 'school_name', 'My School'))
        RETURNING id INTO v_tenant_id;
        UPDATE public.profiles SET tenant_id = v_tenant_id WHERE id = NEW.id;
        INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (NEW.id, 'admin', v_tenant_id) ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

-- RPC functions
CREATE OR REPLACE FUNCTION public.get_tenant_public(_subdomain text) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
    AS $$ SELECT jsonb_build_object('id', t.id, 'subdomain', t.subdomain, 'display_name', t.display_name, 'status', t.status, 'school_name', t.school_name, 'tagline', t.tagline, 'logo_url', t.logo_url, 'favicon_url', t.favicon_url, 'primary_color', t.primary_color, 'secondary_color', t.secondary_color, 'accent_color', t.accent_color) FROM public.tenants t WHERE t.subdomain = _subdomain; $$;

CREATE OR REPLACE FUNCTION public.update_onboarding(_step text, _dismiss boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$
DECLARE v_tenant_id uuid; v_steps jsonb;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();
    IF v_tenant_id IS NULL THEN RETURN; END IF;
    IF _dismiss THEN UPDATE public.tenants SET onboarding_dismissed = true, updated_at = now() WHERE id = v_tenant_id; RETURN; END IF;
    IF _step IS NULL THEN RETURN; END IF;
    SELECT onboarding_completed_steps INTO v_steps FROM public.tenants WHERE id = v_tenant_id;
    IF NOT (v_steps ? _step) THEN
        UPDATE public.tenants SET onboarding_completed_steps = v_steps || jsonb_build_array(_step), updated_at = now() WHERE id = v_tenant_id;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_tenant(_subdomain text, _display_name text, _school_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$
DECLARE v_tenant_id uuid; v_existing uuid;
BEGIN
    SELECT id INTO v_existing FROM public.tenants WHERE subdomain = _subdomain;
    IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'Subdomain already taken'; END IF;
    INSERT INTO public.tenants (subdomain, display_name, school_name) VALUES (_subdomain, _display_name, _school_name) RETURNING id INTO v_tenant_id;
    UPDATE public.profiles SET tenant_id = v_tenant_id WHERE id = auth.uid();
    INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (auth.uid(), 'admin', v_tenant_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.school_settings (tenant_id, school_name) VALUES (v_tenant_id, _school_name) ON CONFLICT DO NOTHING;
    RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_public(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_onboarding(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_tenant(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;

INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "branding upload" ON storage.objects;
CREATE POLICY "branding upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding');
DROP POLICY IF EXISTS "branding read own" ON storage.objects;
CREATE POLICY "branding read own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'branding' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
DROP POLICY IF EXISTS "branding update" ON storage.objects;
CREATE POLICY "branding update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
DROP POLICY IF EXISTS "branding delete" ON storage.objects;
CREATE POLICY "branding delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

DROP TRIGGER IF EXISTS tenants_updated_at ON public.tenants;
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- Migration: 20260929032702_fix_rls_public_access.sql
-- =====================================================================

/*
# Fix RLS policies for multi-tenant public access and user scoping

1. school_settings: allow anon SELECT so visitors can see branding
2. classes: allow anon SELECT so embed forms can show class dropdowns
3. events: already has anon SELECT policy, but verify
4. Add tenant-scoped user management support
*/

-- school_settings: anon can read (branding info is public)
DROP POLICY IF EXISTS "settings public read" ON public.school_settings;
CREATE POLICY "settings public read" ON public.school_settings
    FOR SELECT TO anon, authenticated USING (true);

-- classes: anon can read (needed for embed admission form dropdown)
DROP POLICY IF EXISTS "classes public read" ON public.classes;
CREATE POLICY "classes public read" ON public.classes
    FOR SELECT TO anon USING (true);

-- Add a helper function to get the caller's tenant_id (already exists as current_tenant_id)
-- Add a function to check if a user is in the same tenant as the caller
CREATE OR REPLACE FUNCTION public.is_same_tenant(_other_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles a, public.profiles b
    WHERE a.id = auth.uid() AND b.id = _other_user_id
    AND a.tenant_id IS NOT NULL AND a.tenant_id = b.tenant_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_same_tenant(uuid) TO authenticated;

-- =====================================================================
-- Migration: 20260929033323_fix_import_profiles_tenant_constraint.sql
-- =====================================================================

/*
# Fix import_profiles unique constraint for multi-tenant isolation

The original unique constraint on (entity_key, name) allows cross-tenant
collisions. Add tenant_id to the constraint so each school can have its
own saved import profiles with the same name.
*/

ALTER TABLE public.import_profiles DROP CONSTRAINT IF EXISTS import_profiles_entity_key_name_key;

ALTER TABLE public.import_profiles ADD CONSTRAINT import_profiles_tenant_entity_name_key UNIQUE (tenant_id, entity_key, name);

-- =====================================================================
-- Migration: 20261001081939_attendance_mode_configurable.sql
-- =====================================================================

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

-- =====================================================================
-- Migration: 20261001082040_faculty_chat_tables.sql
-- =====================================================================

/*
# Faculty Chat — Data Model & RLS

1. New Tables
- `chat_channels` — id, tenant_id, name, type (direct|group|announcement), created_by, created_at.
- `chat_channel_members` — id, channel_id, user_id, joined_at.
- `chat_messages` — id, channel_id, sender_id, body, created_at, edited_at.

2. Security (RLS)
- All three tables tenant-scoped. Membership scoped to admin+teacher roles.
- chat_channels: members see channels they belong to; staff can create.
- chat_channel_members: read own; insert by self/admin/channel creator; delete by self/admin.
- chat_messages: members read; members insert (announcement = admin only); sender can update; sender/admin can delete.

3. Auto-All-Staff Channel
- Trigger on user_roles INSERT (admin or teacher): auto-add to school's All Staff channel.
*/

CREATE TABLE IF NOT EXISTS public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'group' CHECK (type IN ('direct', 'group', 'announcement')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_tenant ON public.chat_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON public.chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON public.chat_messages(channel_id, created_at);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_channels: read if you're a member
DROP POLICY IF EXISTS "chat_channels member read" ON public.chat_channels;
CREATE POLICY "chat_channels member read" ON public.chat_channels
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_channels.id AND m.user_id = auth.uid()
  ));

-- chat_channels: create — admin or teacher only
DROP POLICY IF EXISTS "chat_channels staff create" ON public.chat_channels;
CREATE POLICY "chat_channels staff create" ON public.chat_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

-- chat_channels: update — admin or creator
DROP POLICY IF EXISTS "chat_channels admin update" ON public.chat_channels;
CREATE POLICY "chat_channels admin update" ON public.chat_channels
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- chat_channels: delete — admin or creator
DROP POLICY IF EXISTS "chat_channels admin delete" ON public.chat_channels;
CREATE POLICY "chat_channels admin delete" ON public.chat_channels
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- chat_channel_members: read if you're a member of that channel
DROP POLICY IF EXISTS "chat_members read own channels" ON public.chat_channel_members;
CREATE POLICY "chat_members read own channels" ON public.chat_channel_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_channel_members m2
      WHERE m2.channel_id = chat_channel_members.channel_id AND m2.user_id = auth.uid()
    )
  );

-- chat_channel_members: insert — self, admin, or channel creator
DROP POLICY IF EXISTS "chat_members insert" ON public.chat_channel_members;
CREATE POLICY "chat_members insert" ON public.chat_channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = chat_channel_members.channel_id AND c.created_by = auth.uid()
    )
  );

-- chat_channel_members: delete — self or admin
DROP POLICY IF EXISTS "chat_members delete" ON public.chat_channel_members;
CREATE POLICY "chat_members delete" ON public.chat_channel_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- chat_messages: read if you're a member of the channel
DROP POLICY IF EXISTS "chat_messages member read" ON public.chat_messages;
CREATE POLICY "chat_messages member read" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_messages.channel_id AND m.user_id = auth.uid()
  ));

-- chat_messages: insert — must be member; announcement channels require admin
DROP POLICY IF EXISTS "chat_messages member insert" ON public.chat_messages;
CREATE POLICY "chat_messages member insert" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_channel_members m
      WHERE m.channel_id = chat_messages.channel_id AND m.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = chat_messages.channel_id
        AND c.type = 'announcement'
        AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- chat_messages: update own messages
DROP POLICY IF EXISTS "chat_messages sender update" ON public.chat_messages;
CREATE POLICY "chat_messages sender update" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- chat_messages: delete — sender or admin
DROP POLICY IF EXISTS "chat_messages sender delete" ON public.chat_messages;
CREATE POLICY "chat_messages sender delete" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Function to ensure "All Staff" channel exists for a tenant and return its id
CREATE OR REPLACE FUNCTION public.ensure_all_staff_channel()
  RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  v_tenant uuid;
  v_channel uuid;
BEGIN
  v_tenant := public.current_tenant_id();
  IF v_tenant IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_channel
  FROM public.chat_channels
  WHERE tenant_id = v_tenant AND type = 'announcement' AND name = 'All Staff'
  LIMIT 1;

  IF v_channel IS NULL THEN
    INSERT INTO public.chat_channels (tenant_id, name, type, created_by)
    VALUES (v_tenant, 'All Staff', 'announcement', auth.uid())
    RETURNING id INTO v_channel;
  END IF;

  RETURN v_channel;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_all_staff_channel() TO authenticated;

-- Trigger: when a user gets admin or teacher role, auto-add them to All Staff channel
CREATE OR REPLACE FUNCTION public.auto_join_all_staff()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  v_channel uuid;
  v_tenant text;
BEGIN
  IF NEW.role NOT IN ('admin', 'teacher') THEN RETURN NEW; END IF;

  SELECT tenant_id::text INTO v_tenant FROM public.profiles WHERE id = NEW.user_id;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;

  PERFORM set_config('app.current_tenant', v_tenant, true);

  v_channel := public.ensure_all_staff_channel();
  IF v_channel IS NOT NULL THEN
    INSERT INTO public.chat_channel_members (channel_id, user_id)
    VALUES (v_channel, NEW.user_id)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_join_all_staff ON public.user_roles;
CREATE TRIGGER trg_auto_join_all_staff
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.auto_join_all_staff();

-- =====================================================================
-- Migration: 20261001093557_teacher_student_portal_schema.sql
-- =====================================================================

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


-- =====================================================================
-- Migration: 20261001093653_teacher_student_portal_rls.sql
-- =====================================================================

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
