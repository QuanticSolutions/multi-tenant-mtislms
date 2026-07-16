
CREATE TYPE public.notification_channel AS ENUM ('email','sms','push','in_app');
CREATE TYPE public.notification_status AS ENUM ('queued','sent','failed','delivered');

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.notification_channel NOT NULL,
  recipient TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  status public.notification_status NOT NULL DEFAULT 'queued',
  related_module TEXT,
  related_id UUID,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'Madina Tul Ilm',
  tagline TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  current_session TEXT NOT NULL DEFAULT '2025-26',
  session_start_date DATE,
  session_end_date DATE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  currency TEXT NOT NULL DEFAULT 'PKR',
  academic_terms JSONB DEFAULT '[]'::jsonb,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.school_settings (school_name, current_session, timezone, currency)
VALUES ('Madina Tul Ilm', '2025-26', 'Asia/Karachi', 'PKR');

CREATE TABLE public.grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  bands JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.grading_scales (name, description, is_default, bands) VALUES
('Standard MTIS', 'Default grading scale for term exams', true,
 '[{"grade":"A+","min":90,"max":100},{"grade":"A","min":80,"max":89},{"grade":"B","min":70,"max":79},{"grade":"C","min":60,"max":69},{"grade":"D","min":50,"max":59},{"grade":"F","min":0,"max":49}]'::jsonb);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_settings TO authenticated;
GRANT ALL ON public.school_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grading_scales TO authenticated;
GRANT ALL ON public.grading_scales TO service_role;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view notifications" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage notifications" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Staff view settings" ON public.school_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage settings" ON public.school_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff view scales" ON public.grading_scales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage scales" ON public.grading_scales FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin view audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER grading_scales_updated_at BEFORE UPDATE ON public.grading_scales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
