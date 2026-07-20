
-- Admission applications
DROP POLICY IF EXISTS "Staff can manage applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Staff can view applications" ON public.admission_applications;
CREATE POLICY "Admins view applications" ON public.admission_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage applications" ON public.admission_applications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admission interviews
DROP POLICY IF EXISTS "Staff can manage interviews" ON public.admission_interviews;
DROP POLICY IF EXISTS "Staff can view interviews" ON public.admission_interviews;
CREATE POLICY "Admins view interviews" ON public.admission_interviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage interviews" ON public.admission_interviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Notifications
DROP POLICY IF EXISTS "Staff manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff view notifications" ON public.notifications;
CREATE POLICY "Admins view notifications" ON public.notifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grading scales
DROP POLICY IF EXISTS "Staff view scales" ON public.grading_scales;
CREATE POLICY "Admins view scales" ON public.grading_scales FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Parents
DROP POLICY IF EXISTS "Staff read parents" ON public.parents;
CREATE POLICY "Admins read parents" ON public.parents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- School settings
DROP POLICY IF EXISTS "Staff view settings" ON public.school_settings;
CREATE POLICY "Admins view settings" ON public.school_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Student parents
DROP POLICY IF EXISTS "Staff read student_parents" ON public.student_parents;
CREATE POLICY "Admins read student_parents" ON public.student_parents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Subjects (allow admin + teacher)
DROP POLICY IF EXISTS "Staff read subjects" ON public.subjects;
CREATE POLICY "Staff read subjects" ON public.subjects FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- Revoke public EXECUTE on internal trigger functions (they run in trigger context, not via API)
REVOKE ALL ON FUNCTION public.apply_inventory_transaction() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role must remain callable by authenticated for RLS policy evaluation
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
