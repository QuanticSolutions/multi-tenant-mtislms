
-- Routes
CREATE TABLE public.transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  driver_name TEXT,
  driver_phone TEXT,
  stops TEXT,
  monthly_fare NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_routes TO authenticated;
GRANT ALL ON public.transport_routes TO service_role;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage routes" ON public.transport_routes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teachers read routes" ON public.transport_routes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_transport_routes_updated BEFORE UPDATE ON public.transport_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vehicles
CREATE TABLE public.transport_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_no TEXT NOT NULL UNIQUE,
  model TEXT,
  capacity INT NOT NULL DEFAULT 0,
  route_id UUID REFERENCES public.transport_routes(id) ON DELETE SET NULL,
  driver_name TEXT,
  driver_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_vehicles TO authenticated;
GRANT ALL ON public.transport_vehicles TO service_role;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage vehicles" ON public.transport_vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teachers read vehicles" ON public.transport_vehicles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_transport_vehicles_updated BEFORE UPDATE ON public.transport_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Assignments
CREATE TABLE public.transport_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  pickup_stop TEXT,
  monthly_fare NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX transport_assignments_unique_active_student
  ON public.transport_assignments(student_id) WHERE is_active = true;
CREATE INDEX transport_assignments_route_idx ON public.transport_assignments(route_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_assignments TO authenticated;
GRANT ALL ON public.transport_assignments TO service_role;
ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assignments" ON public.transport_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Teachers read assignments" ON public.transport_assignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_transport_assignments_updated BEFORE UPDATE ON public.transport_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
