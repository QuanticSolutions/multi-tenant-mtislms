CREATE TYPE public.finance_entry_type AS ENUM ('income','expense');

CREATE TABLE public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  entry_type public.finance_entry_type NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_entries TO service_role;

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view finance entries"
  ON public.finance_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins and accountants manage finance entries"
  ON public.finance_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

CREATE TRIGGER finance_entries_set_updated_at
  BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX finance_entries_date_idx ON public.finance_entries (entry_date DESC);