REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_onboarding(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_onboarding(text, boolean) TO authenticated;