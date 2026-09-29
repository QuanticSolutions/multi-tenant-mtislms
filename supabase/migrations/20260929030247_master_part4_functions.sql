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