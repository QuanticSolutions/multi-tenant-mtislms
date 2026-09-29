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