-- ============ PART A: Student fees ============
CREATE TABLE public.fee_constituents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_constituents TO authenticated;
GRANT ALL ON public.fee_constituents TO service_role;
ALTER TABLE public.fee_constituents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_constituents read" ON public.fee_constituents FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_constituents admin" ON public.fee_constituents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER fee_constituents_updated_at BEFORE UPDATE ON public.fee_constituents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.fee_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  class_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_groups TO authenticated;
GRANT ALL ON public.fee_groups TO service_role;
ALTER TABLE public.fee_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_groups read" ON public.fee_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_groups admin" ON public.fee_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER fee_groups_updated_at BEFORE UPDATE ON public.fee_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.fee_group_constituents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.fee_groups(id) ON DELETE CASCADE,
  constituent_id uuid NOT NULL REFERENCES public.fee_constituents(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, constituent_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_group_constituents TO authenticated;
GRANT ALL ON public.fee_group_constituents TO service_role;
ALTER TABLE public.fee_group_constituents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fgc read" ON public.fee_group_constituents FOR SELECT TO authenticated USING (true);
CREATE POLICY "fgc admin" ON public.fee_group_constituents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER fgc_updated_at BEFORE UPDATE ON public.fee_group_constituents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TYPE public.discount_type AS ENUM ('flat','percent');
ALTER TABLE public.students
  ADD COLUMN discount_type public.discount_type,
  ADD COLUMN discount_value numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN discount_reason text;

CREATE TYPE public.challan_status AS ENUM ('unpaid','pending_review','approved','rejected');
CREATE TABLE public.fee_challans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.fee_groups(id) ON DELETE SET NULL,
  period text NOT NULL,
  constituent_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_applied numeric(12,2) NOT NULL DEFAULT 0,
  total_due numeric(12,2) NOT NULL DEFAULT 0,
  status public.challan_status NOT NULL DEFAULT 'unpaid',
  uploaded_proof_url text,
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_challans TO authenticated;
GRANT ALL ON public.fee_challans TO service_role;
ALTER TABLE public.fee_challans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challans admin" ON public.fee_challans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "challans staff read" ON public.fee_challans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'accountant'));
CREATE POLICY "challans own read" ON public.fee_challans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "challans own upload" ON public.fee_challans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE TRIGGER fee_challans_updated_at BEFORE UPDATE ON public.fee_challans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PART B: Departments ============
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_teaching boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments read" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments admin" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PART C: Payroll ============
ALTER TABLE public.teachers
  ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE RESTRICT,
  ADD COLUMN subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN fee_group_id uuid REFERENCES public.fee_groups(id) ON DELETE SET NULL,
  ADD COLUMN designation text,
  ADD COLUMN base_salary numeric(12,2) NOT NULL DEFAULT 0;

CREATE TYPE public.calc_type AS ENUM ('flat','percent');

CREATE TABLE public.deduction_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  calc_type public.calc_type NOT NULL DEFAULT 'flat',
  value numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deduction_components TO authenticated;
GRANT ALL ON public.deduction_components TO service_role;
ALTER TABLE public.deduction_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deduction_components admin" ON public.deduction_components FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER deduction_components_updated_at BEFORE UPDATE ON public.deduction_components FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.attendance_deduction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Absence deduction',
  per_n_absences integer NOT NULL DEFAULT 1,
  step_type public.calc_type NOT NULL DEFAULT 'percent',
  step_value numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_deduction_rules TO authenticated;
GRANT ALL ON public.attendance_deduction_rules TO service_role;
ALTER TABLE public.attendance_deduction_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adr admin" ON public.attendance_deduction_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER adr_updated_at BEFORE UPDATE ON public.attendance_deduction_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TYPE public.payroll_line_type AS ENUM ('earning','deduction','bonus');
CREATE TABLE public.payroll_item_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_item_id uuid NOT NULL REFERENCES public.payroll_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  type public.payroll_line_type NOT NULL,
  source text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_item_lines TO authenticated;
GRANT ALL ON public.payroll_item_lines TO service_role;
ALTER TABLE public.payroll_item_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_item_lines admin" ON public.payroll_item_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER payroll_item_lines_updated_at BEFORE UPDATE ON public.payroll_item_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payroll_run_bonus_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.teachers(id) ON DELETE CASCADE,
  name text NOT NULL,
  calc_type public.calc_type NOT NULL DEFAULT 'flat',
  value numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_run_bonus_lines TO authenticated;
GRANT ALL ON public.payroll_run_bonus_lines TO service_role;
ALTER TABLE public.payroll_run_bonus_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prbl admin" ON public.payroll_run_bonus_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER prbl_updated_at BEFORE UPDATE ON public.payroll_run_bonus_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PART D: Roles & permissions ============
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles read" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles admin" ON public.roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_read boolean NOT NULL DEFAULT false,
  can_write boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions read" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions admin" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ADD COLUMN role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL;