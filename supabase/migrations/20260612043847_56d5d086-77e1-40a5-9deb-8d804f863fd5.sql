
-- Enums
CREATE TYPE public.fee_frequency AS ENUM ('one_time','monthly','quarterly','annual');
CREATE TYPE public.invoice_status AS ENUM ('pending','paid','partial','overdue','cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash','bank_transfer','card','cheque','online','other');

-- Fee structures (per class)
CREATE TABLE public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  frequency public.fee_frequency NOT NULL DEFAULT 'monthly',
  due_day INT CHECK (due_day BETWEEN 1 AND 31),
  academic_year TEXT NOT NULL DEFAULT '2025-26',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT ALL ON public.fee_structures TO service_role;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fee structures" ON public.fee_structures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff read fee structures" ON public.fee_structures FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'teacher'));
CREATE TRIGGER fee_structures_set_updated_at BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoices (per student)
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX invoices_student_idx ON public.invoices(student_id);
CREATE INDEX invoices_status_idx ON public.invoices(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Accountants manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'accountant')) WITH CHECK (public.has_role(auth.uid(),'accountant'));
CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method public.payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_invoice_idx ON public.payments(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Accountants manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'accountant')) WITH CHECK (public.has_role(auth.uid(),'accountant'));
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to recompute invoice totals/status after payment changes
CREATE OR REPLACE FUNCTION public.recompute_invoice_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
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

CREATE TRIGGER payments_recompute_invoice
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.recompute_invoice_totals();
