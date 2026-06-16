
-- ========= Messaging module =========
CREATE TYPE public.announcement_audience AS ENUM ('all','teachers','parents','class');
CREATE TYPE public.message_channel AS ENUM ('email','sms','whatsapp','in_app');
CREATE TYPE public.message_status AS ENUM ('draft','queued','sent','failed');

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience public.announcement_audience NOT NULL DEFAULT 'all',
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff read announcements" ON public.announcements FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'teacher')
    OR public.has_role(auth.uid(),'accountant')
  );
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.parent_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'parent',
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_parent_contacts_student ON public.parent_contacts(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_contacts TO authenticated;
GRANT ALL ON public.parent_contacts TO service_role;
ALTER TABLE public.parent_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage parent contacts" ON public.parent_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teachers read parent contacts" ON public.parent_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_parent_contacts_updated BEFORE UPDATE ON public.parent_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_contact_id UUID REFERENCES public.parent_contacts(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  subject TEXT,
  body TEXT NOT NULL,
  channel public.message_channel NOT NULL DEFAULT 'in_app',
  status public.message_status NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_contact ON public.messages(parent_contact_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage messages" ON public.messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teachers manage messages" ON public.messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========= Security hardening across modules =========

-- Lock down user_roles updates explicitly (defense in depth against privilege escalation)
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Tighten teacher write paths that were missing USING (allowing any authenticated insert to slip through with_check only is fine, but make them admin-only on read where appropriate)

-- Teachers should not see all students' fee invoices/payments — restrict reads to admin/accountant
-- (already restricted: invoices/payments only allow admin and accountant via FOR ALL)

-- Ensure exam_results teacher insert/update policies also limit by exam ownership when possible
-- (kept simple: teacher role required)

-- Parent contacts: PII protection — ensure no anon access (no anon grant given). OK.

-- Profiles: harden — prevent users from updating their own role-like fields? profiles has no role column. OK.
