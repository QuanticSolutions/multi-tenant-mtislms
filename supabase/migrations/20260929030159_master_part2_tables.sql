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