
CREATE TYPE public.tenant_status AS ENUM ('trial','active','suspended');

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain text NOT NULL UNIQUE CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  display_name text NOT NULL,
  status public.tenant_status NOT NULL DEFAULT 'trial',
  plan text NOT NULL DEFAULT 'trial',
  owner_user_id uuid,
  onboarding_completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  onboarding_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tenants (subdomain, display_name, status, plan, onboarding_completed_steps, onboarding_dismissed)
VALUES ('default', COALESCE((SELECT school_name FROM public.school_settings LIMIT 1), 'Default School'), 'active', 'legacy',
        '["welcome","branding","import","fees","team","done"]'::jsonb, true);

-- Add, backfill, enforce tenant_id on every school-scoped table
DO $$
DECLARE r record; v_default uuid;
BEGIN
  SELECT id INTO v_default FROM public.tenants WHERE subdomain = 'default';
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('tenants','login_attempts') LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE', r.tablename);
    EXECUTE format('UPDATE public.%I SET tenant_id = $1 WHERE tenant_id IS NULL', r.tablename) USING v_default;
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', r.tablename);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', r.tablename || '_tenant_idx', r.tablename);
  END LOOP;
END $$;

INSERT INTO public.school_settings (tenant_id, school_name)
SELECT id, display_name FROM public.tenants WHERE subdomain='default'
AND NOT EXISTS (SELECT 1 FROM public.school_settings);

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated, anon;

-- Defaults + restrictive tenant isolation policies (ANDed with every existing policy)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('tenants','login_attempts') LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', r.tablename);
    EXECUTE format('CREATE POLICY "Tenant isolation" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', r.tablename);
    EXECUTE format('CREATE POLICY "Tenant isolation public" ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status <> ''suspended'')) WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.status <> ''suspended''))', r.tablename);
  END LOOP;
END $$;
GRANT SELECT (id, status) ON public.tenants TO anon;
CREATE POLICY "Anon can check tenant status" ON public.tenants FOR SELECT TO anon USING (true);

CREATE POLICY "Members view own tenant" ON public.tenants FOR SELECT TO authenticated USING (id = public.current_tenant_id());

-- Per-tenant uniqueness
DO $$
DECLARE r record; v_con text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('admission_applications','application_no'),('books','isbn'),('departments','name'),
    ('fee_constituents','name'),('fee_groups','name'),('import_profiles','entity_key, name'),
    ('inventory_categories','name'),('inventory_items','sku'),('invoices','invoice_no'),
    ('payroll_runs','period_month, period_year'),('roles','name'),('school_settings','singleton'),
    ('students','admission_no'),('teachers','employee_no'),('transport_routes','code'),
    ('transport_vehicles','registration_no')) AS v(tbl, cols)
  LOOP
    SELECT conname INTO v_con FROM pg_constraint
      WHERE conrelid = ('public.'||r.tbl)::regclass AND contype='u'
        AND conname = r.tbl || '_' || replace(replace(r.cols,', ','_'),' ','') || '_key';
    IF v_con IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, v_con);
    ELSE
      EXECUTE format('DROP INDEX IF EXISTS public.%I', r.tbl || '_' || replace(replace(r.cols,', ','_'),' ','') || '_key');
    END IF;
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (tenant_id, %s)', r.tbl, r.tbl || '_tenant_' || replace(replace(r.cols,', ','_'),' ','') || '_key', r.cols);
  END LOOP;
END $$;

-- New users: tenant comes only from server-controlled app metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid; v_default uuid;
BEGIN
  v_tenant := NULLIF(NEW.raw_app_meta_data ->> 'tenant_id', '')::uuid;
  IF v_tenant IS NULL THEN
    SELECT id INTO v_default FROM public.tenants WHERE subdomain = 'default';
    IF v_default IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = v_default) THEN
      v_tenant := v_default;  -- bootstrap the legacy school's first admin
    ELSE
      RAISE EXCEPTION 'Accounts must be created through school registration or an invitation';
    END IF;
  END IF;
  INSERT INTO public.profiles (id, full_name, email, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)), NEW.email, v_tenant)
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE tenant_id = v_tenant) THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (NEW.id, 'admin', v_tenant) ON CONFLICT DO NOTHING;
    UPDATE public.tenants SET owner_user_id = COALESCE(owner_user_id, NEW.id) WHERE id = v_tenant;
  END IF;
  RETURN NEW;
END; $$;

-- Seed defaults for a new tenant (copies role templates from the default school)
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant uuid, _school_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_default uuid; r record; v_new uuid;
BEGIN
  INSERT INTO public.school_settings (tenant_id, school_name) VALUES (_tenant, _school_name)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_default FROM public.tenants WHERE subdomain='default';
  FOR r IN SELECT * FROM public.roles WHERE tenant_id = v_default LOOP
    INSERT INTO public.roles (name, description, tenant_id) VALUES (r.name, r.description, _tenant) RETURNING id INTO v_new;
    INSERT INTO public.role_permissions (role_id, module, can_read, can_write, can_update, can_delete, tenant_id)
      SELECT v_new, module, can_read, can_write, can_update, can_delete, _tenant FROM public.role_permissions WHERE role_id = r.id;
  END LOOP;
END; $$;
REVOKE EXECUTE ON FUNCTION public.seed_tenant_defaults(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_tenant_defaults(uuid, text) TO service_role;

-- Public branding lookup (safe columns only)
CREATE OR REPLACE FUNCTION public.get_tenant_public(_subdomain text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', t.id, 'subdomain', t.subdomain, 'display_name', t.display_name, 'status', t.status,
    'school_name', s.school_name, 'tagline', s.tagline, 'logo_url', s.logo_url, 'favicon_url', s.favicon_url,
    'primary_color', s.primary_color, 'secondary_color', s.secondary_color, 'accent_color', s.accent_color)
  FROM public.tenants t LEFT JOIN public.school_settings s ON s.tenant_id = t.id
  WHERE t.subdomain = lower(_subdomain) LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_tenant_public(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.subdomain_available(_subdomain text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(_subdomain) ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
     AND lower(_subdomain) NOT IN ('www','app','api','admin','default','mail','register','static')
     AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE subdomain = lower(_subdomain))
$$;
GRANT EXECUTE ON FUNCTION public.subdomain_available(text) TO anon, authenticated;

-- Onboarding progress (admins of the tenant only)
CREATE OR REPLACE FUNCTION public.update_onboarding(_step text, _dismiss boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t uuid := public.current_tenant_id(); v jsonb;
BEGIN
  IF v_t IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  UPDATE public.tenants SET
    onboarding_completed_steps = CASE WHEN _step IS NULL OR onboarding_completed_steps ? _step
      THEN onboarding_completed_steps ELSE onboarding_completed_steps || to_jsonb(_step) END,
    onboarding_dismissed = onboarding_dismissed OR _dismiss
  WHERE id = v_t RETURNING onboarding_completed_steps INTO v;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.update_onboarding(text, boolean) TO authenticated;
