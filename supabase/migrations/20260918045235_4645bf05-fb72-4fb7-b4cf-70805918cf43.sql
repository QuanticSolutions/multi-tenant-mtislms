REVOKE ALL ON FUNCTION public.can_edit_settings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_settings(uuid) TO authenticated, service_role;