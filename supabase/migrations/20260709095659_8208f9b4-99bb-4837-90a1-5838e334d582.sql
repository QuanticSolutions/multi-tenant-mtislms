
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_categories TO authenticated;
GRANT ALL ON public.inventory_categories TO service_role;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inventory categories" ON public.inventory_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read inventory categories" ON public.inventory_categories FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE,
  category_id uuid REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  description text,
  unit text NOT NULL DEFAULT 'piece',
  quantity numeric NOT NULL DEFAULT 0,
  reorder_level numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  location text,
  supplier text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inventory items" ON public.inventory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read inventory items" ON public.inventory_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  txn_type text NOT NULL CHECK (txn_type IN ('in','out','adjust')),
  quantity numeric NOT NULL,
  unit_cost numeric,
  reference text,
  notes text,
  issued_to text,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO service_role;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inventory transactions" ON public.inventory_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read inventory transactions" ON public.inventory_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE INDEX idx_inv_items_category ON public.inventory_items(category_id);
CREATE INDEX idx_inv_txn_item ON public.inventory_transactions(item_id);
CREATE INDEX idx_inv_txn_date ON public.inventory_transactions(txn_date);

CREATE TRIGGER trg_inv_categories_updated BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inv_items_updated BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inv_txn_updated BEFORE UPDATE ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.apply_inventory_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE delta numeric;
BEGIN
  IF NEW.txn_type = 'in' THEN delta := NEW.quantity;
  ELSIF NEW.txn_type = 'out' THEN delta := -NEW.quantity;
  ELSE delta := NEW.quantity; END IF;
  UPDATE public.inventory_items SET quantity = quantity + delta WHERE id = NEW.item_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_inv_apply_txn AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_transaction();
