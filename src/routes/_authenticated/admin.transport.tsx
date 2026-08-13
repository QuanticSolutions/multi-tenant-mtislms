import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Bus, Route as RouteIcon, Users, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/transport")({
  head: () => ({
    meta: [
      { title: "Transport — Madina Tul Ilm" },
      { name: "description", content: "Manage transport routes, vehicles, and student pickup assignments." },
    ],
  }),
  component: TransportPage,
});

type RouteRow = {
  id: string; code: string; name: string; driver_name: string | null; driver_phone: string | null;
  stops: string | null; monthly_fare: number; is_active: boolean;
};
type VehicleRow = {
  id: string; registration_no: string; model: string | null; capacity: number;
  route_id: string | null; driver_name: string | null; driver_phone: string | null; is_active: boolean;
};
type AssignmentRow = {
  id: string; student_id: string; route_id: string; pickup_stop: string | null;
  monthly_fare: number; start_date: string; is_active: boolean;
  students: { admission_no: string; full_name: string } | null;
  transport_routes: { code: string; name: string } | null;
};

function TransportPage() {
  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Module</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Transport</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Routes, vehicles, and per-student pickup assignments.
        </p>
      </div>

      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="routes"><RouteIcon className="size-4" /> Routes</TabsTrigger>
          <TabsTrigger value="vehicles"><Bus className="size-4" /> Vehicles</TabsTrigger>
          <TabsTrigger value="assignments"><Users className="size-4" /> Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="routes"><RoutesTab /></TabsContent>
        <TabsContent value="vehicles"><VehiclesTab /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ---------------- Routes ---------------- */

function RoutesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const { data: routes, isLoading } = useQuery({
    queryKey: ["transport_routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_routes")
        .select("id, code, name, driver_name, driver_phone, stops, monthly_fare, is_active")
        .order("code");
      if (error) throw error;
      return data as RouteRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transport_routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Route deleted");
      qc.invalidateQueries({ queryKey: ["transport_routes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredRoutes = useMemo(() => {
    return (routes ?? []).filter((r) => {
      if (activeFilter === "active" && !r.is_active) return false;
      if (activeFilter === "inactive" && r.is_active) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return r.code.toLowerCase().includes(s) || r.name.toLowerCase().includes(s) || (r.driver_name ?? "").toLowerCase().includes(s);
    });
  }, [routes, search, activeFilter]);

  const routeFilterCount = (activeFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search code, name, driver…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {routeFilterCount > 1 && (
            <Button variant="ghost" onClick={() => { setSearch(""); setActiveFilter("all"); }}>Clear filters</Button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm text-muted-foreground">{filteredRoutes.length} routes</div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus /> Add route</Button></DialogTrigger>
              <NewRouteDialog onDone={() => setOpen(false)} />
            </Dialog>
          </div>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading routes…</div>
        ) : !routes || routes.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No routes yet. Add your first route.</div>
        ) : filteredRoutes.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No routes match your filters.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background">
                <Th>Code</Th><Th>Name</Th><Th>Driver</Th><Th>Stops</Th><Th>Fare</Th><Th>Status</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-primary-pale/40">
                  <Td className="font-medium">{r.code}</Td>
                  <Td>{r.name}</Td>
                  <Td>
                    <div>{r.driver_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.driver_phone ?? ""}</div>
                  </Td>
                  <Td className="text-muted-foreground max-w-[240px] truncate">{r.stops ?? "—"}</Td>
                  <Td>{Number(r.monthly_fare).toLocaleString()}</Td>
                  <Td>
                    <Badge variant={r.is_active ? "success" : "default"}>
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => confirm(`Delete route ${r.code}?`) && del.mutate(r.id)}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function NewRouteDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    code: "", name: "", driver_name: "", driver_phone: "", stops: "", monthly_fare: "0",
  });
  const s = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      if (!f.code.trim() || !f.name.trim()) throw new Error("Code and name are required");
      const { error } = await supabase.from("transport_routes").insert({
        code: f.code.trim(),
        name: f.name.trim(),
        driver_name: f.driver_name || null,
        driver_phone: f.driver_phone || null,
        stops: f.stops || null,
        monthly_fare: Number(f.monthly_fare) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Route added");
      qc.invalidateQueries({ queryKey: ["transport_routes"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>New route</DialogTitle>
        <DialogDescription>Define a pickup route and its monthly fare.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code *"><Input value={f.code} onChange={(e) => s("code", e.target.value)} placeholder="R-01" /></Field>
        <Field label="Monthly fare"><Input type="number" value={f.monthly_fare} onChange={(e) => s("monthly_fare", e.target.value)} /></Field>
        <Field label="Name *" className="col-span-2"><Input value={f.name} onChange={(e) => s("name", e.target.value)} placeholder="Model Town — Gulberg" /></Field>
        <Field label="Driver name"><Input value={f.driver_name} onChange={(e) => s("driver_name", e.target.value)} /></Field>
        <Field label="Driver phone"><Input value={f.driver_phone} onChange={(e) => s("driver_phone", e.target.value)} /></Field>
        <Field label="Stops (comma-separated)" className="col-span-2">
          <Input value={f.stops} onChange={(e) => s("stops", e.target.value)} placeholder="Main Blvd, Sector A, Sector B" />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Save route"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------------- Vehicles ---------------- */

function VehiclesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["transport_vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_vehicles")
        .select("id, registration_no, model, capacity, route_id, driver_name, driver_phone, is_active")
        .order("registration_no");
      if (error) throw error;
      return data as VehicleRow[];
    },
  });

  const { data: routes } = useQuery({
    queryKey: ["transport_routes_lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transport_routes").select("id, code, name").order("code");
      if (error) throw error;
      return data as { id: string; code: string; name: string }[];
    },
  });

  const routeMap = useMemo(() => Object.fromEntries((routes ?? []).map((r) => [r.id, `${r.code} · ${r.name}`])), [routes]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transport_vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle removed");
      qc.invalidateQueries({ queryKey: ["transport_vehicles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{vehicles?.length ?? 0} vehicles</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus /> Add vehicle</Button></DialogTrigger>
          <NewVehicleDialog routes={routes ?? []} onDone={() => setOpen(false)} />
        </Dialog>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading vehicles…</div>
        ) : !vehicles || vehicles.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No vehicles yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background">
                <Th>Registration</Th><Th>Model</Th><Th>Capacity</Th><Th>Route</Th><Th>Driver</Th><Th>Status</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-t border-border hover:bg-primary-pale/40">
                  <Td className="font-medium">{v.registration_no}</Td>
                  <Td>{v.model ?? "—"}</Td>
                  <Td>{v.capacity}</Td>
                  <Td className="text-muted-foreground">{v.route_id ? routeMap[v.route_id] ?? "—" : "—"}</Td>
                  <Td>
                    <div>{v.driver_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{v.driver_phone ?? ""}</div>
                  </Td>
                  <Td>
                    <Badge variant={v.is_active ? "success" : "default"}>{v.is_active ? "Active" : "Inactive"}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => confirm(`Delete vehicle ${v.registration_no}?`) && del.mutate(v.id)}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function NewVehicleDialog({ routes, onDone }: { routes: { id: string; code: string; name: string }[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    registration_no: "", model: "", capacity: "0", route_id: "", driver_name: "", driver_phone: "",
  });
  const s = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      if (!f.registration_no.trim()) throw new Error("Registration number required");
      const { error } = await supabase.from("transport_vehicles").insert({
        registration_no: f.registration_no.trim(),
        model: f.model || null,
        capacity: Number(f.capacity) || 0,
        route_id: f.route_id || null,
        driver_name: f.driver_name || null,
        driver_phone: f.driver_phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle added");
      qc.invalidateQueries({ queryKey: ["transport_vehicles"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>New vehicle</DialogTitle>
        <DialogDescription>Register a vehicle and optionally assign it to a route.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Registration *"><Input value={f.registration_no} onChange={(e) => s("registration_no", e.target.value)} placeholder="LEA-1234" /></Field>
        <Field label="Capacity"><Input type="number" value={f.capacity} onChange={(e) => s("capacity", e.target.value)} /></Field>
        <Field label="Model" className="col-span-2"><Input value={f.model} onChange={(e) => s("model", e.target.value)} placeholder="Toyota Coaster 2019" /></Field>
        <Field label="Route" className="col-span-2">
          <Select value={f.route_id} onValueChange={(v) => s("route_id", v)}>
            <SelectTrigger><SelectValue placeholder="Select route (optional)" /></SelectTrigger>
            <SelectContent>
              {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.code} · {r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Driver name"><Input value={f.driver_name} onChange={(e) => s("driver_name", e.target.value)} /></Field>
        <Field label="Driver phone"><Input value={f.driver_phone} onChange={(e) => s("driver_phone", e.target.value)} /></Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Save vehicle"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------------- Assignments ---------------- */

function AssignmentsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [routeFilter, setRouteFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["transport_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_assignments")
        .select("id, student_id, route_id, pickup_stop, monthly_fare, start_date, is_active, students(admission_no, full_name), transport_routes(code, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AssignmentRow[];
    },
  });

  const { data: routes } = useQuery({
    queryKey: ["transport_routes_lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transport_routes").select("id, code, name, monthly_fare").order("code");
      if (error) throw error;
      return data as { id: string; code: string; name: string; monthly_fare: number }[];
    },
  });

  const filtered = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter((a) => {
      if (routeFilter !== "all" && a.route_id !== routeFilter) return false;
      if (activeFilter === "active" && !a.is_active) return false;
      if (activeFilter === "inactive" && a.is_active) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (a.students?.full_name ?? "").toLowerCase().includes(s) || (a.students?.admission_no ?? "").toLowerCase().includes(s);
    });
  }, [assignments, routeFilter, activeFilter, search]);

  const assignmentFilterCount = (routeFilter !== "all" ? 1 : 0) + (activeFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transport_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment removed");
      qc.invalidateQueries({ queryKey: ["transport_assignments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All routes</SelectItem>
              {(routes ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.code} · {r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Ended</SelectItem>
            </SelectContent>
          </Select>
          {assignmentFilterCount > 1 && (
            <Button variant="ghost" onClick={() => { setSearch(""); setRouteFilter("all"); setActiveFilter("all"); }}>Clear filters</Button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm text-muted-foreground">{filtered.length} assigned</div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus /> Assign student</Button></DialogTrigger>
              <NewAssignmentDialog routes={routes ?? []} onDone={() => setOpen(false)} />
            </Dialog>
          </div>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading assignments…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No assignments yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background">
                <Th>Student</Th><Th>Route</Th><Th>Pickup</Th><Th>Fare</Th><Th>Since</Th><Th>Status</Th><Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-border hover:bg-primary-pale/40">
                  <Td>
                    <div className="font-medium">{a.students?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.students?.admission_no}</div>
                  </Td>
                  <Td>{a.transport_routes ? `${a.transport_routes.code} · ${a.transport_routes.name}` : "—"}</Td>
                  <Td>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="size-3" /> {a.pickup_stop ?? "—"}
                    </div>
                  </Td>
                  <Td>{Number(a.monthly_fare).toLocaleString()}</Td>
                  <Td className="text-muted-foreground">{formatDate(a.start_date)}</Td>
                  <Td><Badge variant={a.is_active ? "success" : "default"}>{a.is_active ? "Active" : "Ended"}</Badge></Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => confirm("Remove assignment?") && del.mutate(a.id)}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function NewAssignmentDialog({
  routes, onDone,
}: {
  routes: { id: string; code: string; name: string; monthly_fare: number }[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    student_id: "", route_id: "", pickup_stop: "", monthly_fare: "0",
    start_date: new Date().toISOString().slice(0, 10),
  });
  const s = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const { data: students } = useQuery({
    queryKey: ["students_lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, admission_no, full_name")
        .order("full_name");
      if (error) throw error;
      return data as { id: string; admission_no: string; full_name: string }[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!f.student_id || !f.route_id) throw new Error("Student and route required");
      const { error } = await supabase.from("transport_assignments").insert({
        student_id: f.student_id,
        route_id: f.route_id,
        pickup_stop: f.pickup_stop || null,
        monthly_fare: Number(f.monthly_fare) || 0,
        start_date: f.start_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student assigned");
      qc.invalidateQueries({ queryKey: ["transport_assignments"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pickRoute = (id: string) => {
    const r = routes.find((x) => x.id === id);
    setF((p) => ({ ...p, route_id: id, monthly_fare: r ? String(r.monthly_fare) : p.monthly_fare }));
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Assign student</DialogTitle>
        <DialogDescription>Map a student to a pickup route.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Student *" className="col-span-2">
          <Select value={f.student_id} onValueChange={(v) => s("student_id", v)}>
            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>
              {(students ?? []).map((st) => (
                <SelectItem key={st.id} value={st.id}>{st.admission_no} · {st.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Route *" className="col-span-2">
          <Select value={f.route_id} onValueChange={pickRoute}>
            <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
            <SelectContent>
              {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.code} · {r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Pickup stop"><Input value={f.pickup_stop} onChange={(e) => s("pickup_stop", e.target.value)} placeholder="Sector A" /></Field>
        <Field label="Monthly fare"><Input type="number" value={f.monthly_fare} onChange={(e) => s("monthly_fare", e.target.value)} /></Field>
        <Field label="Start date" className="col-span-2"><Input type="date" value={f.start_date} onChange={(e) => s("start_date", e.target.value)} /></Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Assign"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------------- helpers ---------------- */

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3.5 align-middle text-foreground ${className}`}>{children}</td>;
}
