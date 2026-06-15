
-- Enums
CREATE TYPE public.book_issue_status AS ENUM ('issued','returned','overdue','lost');

-- Books catalog
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE,
  category TEXT,
  publisher TEXT,
  publication_year INT,
  total_copies INT NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  available_copies INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  shelf_location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage books" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teachers view books" ON public.books FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_books_updated BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Book issues
CREATE TABLE public.book_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  status public.book_issue_status NOT NULL DEFAULT 'issued',
  fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fine_amount >= 0),
  notes TEXT,
  issued_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_issues TO authenticated;
GRANT ALL ON public.book_issues TO service_role;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage issues" ON public.book_issues FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teachers manage issues" ON public.book_issues FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_book_issues_updated BEFORE UPDATE ON public.book_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_book_issues_book ON public.book_issues(book_id);
CREATE INDEX idx_book_issues_student ON public.book_issues(student_id);
CREATE INDEX idx_book_issues_status ON public.book_issues(status);

-- Trigger: maintain available_copies and auto-mark overdue
CREATE OR REPLACE FUNCTION public.handle_book_issue_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
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

CREATE TRIGGER trg_book_issues_changes
  BEFORE INSERT OR UPDATE OR DELETE ON public.book_issues
  FOR EACH ROW EXECUTE FUNCTION public.handle_book_issue_change();
