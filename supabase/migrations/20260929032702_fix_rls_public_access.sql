/*
# Fix RLS policies for multi-tenant public access and user scoping

1. school_settings: allow anon SELECT so visitors can see branding
2. classes: allow anon SELECT so embed forms can show class dropdowns
3. events: already has anon SELECT policy, but verify
4. Add tenant-scoped user management support
*/

-- school_settings: anon can read (branding info is public)
DROP POLICY IF EXISTS "settings public read" ON public.school_settings;
CREATE POLICY "settings public read" ON public.school_settings
    FOR SELECT TO anon, authenticated USING (true);

-- classes: anon can read (needed for embed admission form dropdown)
DROP POLICY IF EXISTS "classes public read" ON public.classes;
CREATE POLICY "classes public read" ON public.classes
    FOR SELECT TO anon USING (true);

-- Add a helper function to get the caller's tenant_id (already exists as current_tenant_id)
-- Add a function to check if a user is in the same tenant as the caller
CREATE OR REPLACE FUNCTION public.is_same_tenant(_other_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles a, public.profiles b
    WHERE a.id = auth.uid() AND b.id = _other_user_id
    AND a.tenant_id IS NOT NULL AND a.tenant_id = b.tenant_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_same_tenant(uuid) TO authenticated;