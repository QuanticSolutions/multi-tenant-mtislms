ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS state_province text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#2952C4',
  ADD COLUMN IF NOT EXISTS secondary_color text NOT NULL DEFAULT '#1D3B8A',
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS established_year integer,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.school_settings (school_name, current_session)
SELECT 'School LMS', '2025-26'
WHERE NOT EXISTS (SELECT 1 FROM public.school_settings);

CREATE OR REPLACE FUNCTION public.can_edit_settings(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.role_permissions rp ON rp.role_id = p.role_id
        WHERE p.id = _user_id
          AND rp.module = 'settings'
          AND (rp.can_write OR rp.can_update)
      );
$$;

GRANT SELECT ON public.school_settings TO anon;

DROP POLICY IF EXISTS "Admin manage settings" ON public.school_settings;
DROP POLICY IF EXISTS "Admins view settings" ON public.school_settings;

CREATE POLICY "Anyone can view school profile"
  ON public.school_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Settings editors can update school profile"
  ON public.school_settings FOR UPDATE
  TO authenticated
  USING (public.can_edit_settings(auth.uid()))
  WITH CHECK (public.can_edit_settings(auth.uid()));

CREATE POLICY "Admins can insert school profile"
  ON public.school_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "branding read" ON storage.objects;
DROP POLICY IF EXISTS "branding upload" ON storage.objects;
DROP POLICY IF EXISTS "branding update" ON storage.objects;
DROP POLICY IF EXISTS "branding delete" ON storage.objects;

CREATE POLICY "branding read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'branding');

CREATE POLICY "branding upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.can_edit_settings(auth.uid()));

CREATE POLICY "branding update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.can_edit_settings(auth.uid()));

CREATE POLICY "branding delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.can_edit_settings(auth.uid()));