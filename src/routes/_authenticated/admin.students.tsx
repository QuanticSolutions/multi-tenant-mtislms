import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Users, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { ImportButton } from "@/components/admin/import-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatClass, formatDate, formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({
    meta: [
      { title: "Students — Madina Tul Ilm" },
      { name: "description", content: "Manage student records, admissions, and class assignments." },
    ],
  }),
  component: StudentsPage,
});

type StudentStatus = "active" | "inactive" | "graduated" | "transferred" | "terminated";

type StudentRow = {
  id: string;
  admission_no: string;
  full_name: string;
  gender: string | null;
  status: StudentStatus;
  guardian_name: string | null;
  guardian_phone: string | null;
  enrollment_date: string;
  class_id: string | null;
  driver_id: string | null;
  discount_type: "flat" | "percent" | null;
  discount_value: number;
  discount_reason: string | null;
  drivers: { full_name: string } | null;
  classes: { name: string; section: string | null } | null;
};


const STATUS_OPTIONS: StudentStatus[] = ["active", "inactive", "graduated", "transferred", "terminated"];

function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);


  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section, grade_level")
        .order("grade_level", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: drivers } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, phone, is_active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "id, admission_no, full_name, gender, status, guardian_name, guardian_phone, enrollment_date, class_id, driver_id, discount_type, discount_value, discount_reason, classes(name, section), drivers(full_name)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as StudentRow[];
    },
  });

  const activeFilterCount = [statusFilter, classFilter, genderFilter, driverFilter].filter((v) => v !== "all").length + (search.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    if (!students) return [];
    return students.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesQ =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        s.admission_no.toLowerCase().includes(q) ||
        (s.guardian_name?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesClass = classFilter === "all" || s.class_id === classFilter;
      const matchesGender = genderFilter === "all" || s.gender === genderFilter;
      const matchesDriver = driverFilter === "all" || s.driver_id === driverFilter;
      return matchesQ && matchesStatus && matchesClass && matchesGender && matchesDriver;
    });
  }, [students, search, statusFilter, classFilter, genderFilter, driverFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setClassFilter("all");
    setGenderFilter("all");
    setDriverFilter("all");
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student removed");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Module</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admissions, profiles, and class assignments.
          </p>
        </div>
        <div className="flex gap-2">
        <ImportButton entityKey="students" label="Import students" />
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus /> Add student
            </Button>
          </DialogTrigger>
          <StudentDialog existing={editing} classes={classes ?? []} drivers={drivers ?? []} onDone={() => { setOpen(false); setEditing(null); }} />
        </Dialog>
        </div>
      </div>


      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, admission no, guardian…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {(classes ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{formatClass(c.name, c.section)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genders</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All drivers</SelectItem>
              {(drivers ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilterCount > 1 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" /> Clear filters
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {students?.length ?? 0} students
          </div>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading students…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <Users className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">No students yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add your first student to get started with admissions.
            </p>
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus /> Add student
            </Button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background">
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Guardian</Th>
                <Th>Driver</Th>
                <Th>Status</Th>
                <Th>Enrolled</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-primary-pale/40">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-pale text-xs font-semibold text-primary">
                        {initialsOf(s.full_name)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground">{s.admission_no}</div>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">
                    {s.classes ? formatClass(s.classes.name, s.classes.section) : "—"}
                  </Td>
                  <Td>
                    <div className="text-foreground">{s.guardian_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{s.guardian_phone ?? ""}</div>
                  </Td>
                  <Td className="text-muted-foreground">{s.drivers?.full_name ?? "—"}</Td>
                  <Td>
                    <Badge variant={statusVariant(s.status)}>{formatStatus(s.status)}</Badge>
                  </Td>
                  <Td className="text-muted-foreground">{formatDate(s.enrollment_date)}</Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(s); setOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => {
                        if (confirm(`Remove ${s.full_name}?`)) deleteMut.mutate(s.id);
                      }}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}

function StudentDialog({
  existing,
  classes,
  drivers,
  onDone,
}: {
  existing: StudentRow | null;
  classes: Array<{ id: string; name: string; section: string | null }>;
  drivers: Array<{ id: string; full_name: string; phone: string | null }>;
  onDone: () => void;
}) {
  const [transportOpen, setTransportOpen] = useState(Boolean(existing?.driver_id));
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    admission_no: existing?.admission_no ?? "",
    full_name: existing?.full_name ?? "",
    gender: existing?.gender ?? "",
    date_of_birth: "",
    guardian_name: existing?.guardian_name ?? "",
    guardian_phone: existing?.guardian_phone ?? "",
    guardian_email: "",
    address: "",
    class_id: existing?.class_id ?? "",
    status: (existing?.status ?? "active") as StudentStatus,
    driver_id: existing?.driver_id ?? "",
    discount_type: existing?.discount_type ?? "",
    discount_value: existing?.discount_value ? String(existing.discount_value) : "",
    discount_reason: existing?.discount_reason ?? "",
  }));

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.admission_no.trim() || !form.full_name.trim()) {
        throw new Error("Admission number and full name are required");
      }
      const payload: any = {
        admission_no: form.admission_no.trim(),
        full_name: form.full_name.trim(),
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        guardian_name: form.guardian_name || null,
        guardian_phone: form.guardian_phone || null,
        guardian_email: form.guardian_email || null,
        address: form.address || null,
        class_id: form.class_id || null,
        status: form.status,
        driver_id: form.driver_id || null,
        discount_type: form.discount_type || null,
        discount_value: form.discount_type ? Number(form.discount_value || 0) : 0,
        discount_reason: form.discount_type ? form.discount_reason || null : null,
      };
      if (existing) {
        // Only send fields user could edit; keep nulls out for blank optionals
        const upd: any = { ...payload };
        if (!form.date_of_birth) delete upd.date_of_birth;
        if (!form.guardian_email) delete upd.guardian_email;
        if (!form.address) delete upd.address;
        const { error } = await supabase.from("students").update(upd).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("students").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existing ? "Student updated" : "Student added");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-students"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });


  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{existing ? "Edit student" : "Add new student"}</DialogTitle>
        <DialogDescription>
          {existing ? "Update this student's record." : "Create an admission record. You can edit details later."}
        </DialogDescription>
      </DialogHeader>


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Admission No *">
          <Input
            value={form.admission_no}
            onChange={(e) => set("admission_no", e.target.value)}
            placeholder="MTIS-2025-0146"
          />
        </Field>
        <Field label="Full name *">
          <Input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Ayesha Khan"
          />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date of birth">
          <Input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => set("date_of_birth", e.target.value)}
          />
        </Field>
        <Field label="Class">
          <Select value={form.class_id} onValueChange={(v) => set("class_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {formatClass(c.name, c.section)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Guardian name">
          <Input
            value={form.guardian_name}
            onChange={(e) => set("guardian_name", e.target.value)}
            placeholder="Mr. Khan"
          />
        </Field>
        <Field label="Guardian phone">
          <Input
            value={form.guardian_phone}
            onChange={(e) => set("guardian_phone", e.target.value)}
            placeholder="+92 300 1234567"
          />
        </Field>
        <Field label="Guardian email" className="sm:col-span-2">
          <Input
            type="email"
            value={form.guardian_email}
            onChange={(e) => set("guardian_email", e.target.value)}
            placeholder="guardian@example.com"
          />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="House #, Street, City"
          />
        </Field>
      </div>

      <div className="rounded-md border border-border">
        <button
          type="button"
          onClick={() => setTransportOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
        >
          <span>Transport</span>
          <span className="text-xs font-medium text-muted-foreground">
            {transportOpen ? "Hide" : "Show"}
          </span>
        </button>
        {transportOpen && (
          <div className="border-t border-border p-4">
            <Field label="Assigned driver">
              <Select value={form.driver_id} onValueChange={(v) => set("driver_id", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No transport</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name}{d.phone ? ` — ${d.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border">
        <button
          type="button"
          onClick={() => setDiscountOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
        >
          <span>Discount</span>
          <span className="text-xs font-medium text-muted-foreground">
            {discountOpen ? "Hide" : "Show"}
          </span>
        </button>
        {discountOpen && (
          <div className="border-t border-border p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Discount type" className="sm:col-span-2">
              <Select
                value={form.discount_type || "none"}
                onValueChange={(v) => set("discount_type", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No discount</SelectItem>
                  <SelectItem value="flat">Flat amount</SelectItem>
                  <SelectItem value="percent">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Discount value">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.discount_value}
                onChange={(e) => set("discount_value", e.target.value)}
                placeholder={form.discount_type === "percent" ? "20" : "5000"}
                disabled={!form.discount_type}
              />
            </Field>
            <Field label="Discount reason">
              <Input
                value={form.discount_reason}
                onChange={(e) => set("discount_reason", e.target.value)}
                placeholder="Sibling concession, staff child…"
                disabled={!form.discount_type}
              />
            </Field>
          </div>
        )}
      </div>


      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={saveMut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Saving…" : existing ? "Update student" : "Save student"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}


function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3.5 align-middle text-foreground ${className}`}>{children}</td>;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusVariant(s: StudentStatus): "success" | "warning" | "danger" | "default" {
  if (s === "active") return "success";
  if (s === "inactive" || s === "transferred" || s === "terminated") return "danger";
  return "default";
}
