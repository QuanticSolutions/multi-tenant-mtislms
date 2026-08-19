CREATE TABLE public.import_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_key text NOT NULL,
  name text NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_key, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_profiles TO authenticated;
GRANT ALL ON public.import_profiles TO service_role;

ALTER TABLE public.import_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view import profiles"
  ON public.import_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage import profiles"
  ON public.import_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_import_profiles_updated_at
  BEFORE UPDATE ON public.import_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();