import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, GraduationCap, Trash2, Pencil, Mail, Phone, X } from "lucide-react";
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
import { formatDate, formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers — Madina Tul Ilm" },
      { name: "description", content: "Manage teacher records, qualifications, and assignments." },
    ],
  }),
  component: TeachersPage,
});

type TeacherStatus = "active" | "on_leave" | "inactive" | "resigned" | "probation";
const STATUS_OPTIONS: TeacherStatus[] = ["active", "on_leave", "inactive", "resigned", "probation"];

type TeacherRow = {
  id: string;
  employee_no: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  qualification: string | null;
  specialization: string | null;
  status: TeacherStatus;
  date_of_joining: string;
  department_id: string | null;
  subject_id: string | null;
  fee_group_id: string | null;
  departments: { name: string; is_teaching: boolean } | null;
  subjects: { name: string; classes: { name: string; section: string | null } | null } | null;
};

function TeachersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [specializationFilter, setSpecializationFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRow | null>(null);


  const { data: teachers, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select(
          "id, employee_no, full_name, email, phone, qualification, specialization, status, date_of_joining, department_id, subject_id, fee_group_id, departments!inner(name, is_teaching), subjects(name, classes(name, section))",
        )
        .order("created_at", { ascending: false });
      console.log(data, error);
      if (error) throw error;
      return data as unknown as TeacherRow[];
    },
  });


  const specializations = useMemo(() => {
    const set = new Set<string>();
    (teachers ?? []).forEach((t) => {
      if (t.specialization) set.add(t.specialization);
    });
    return Array.from(set).sort();
  }, [teachers]);

  const activeFilterCount = [statusFilter, specializationFilter].filter((v) => v !== "all").length + (search.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    if (!teachers) return [];
    return teachers.filter((t) => {
      const q = search.trim().toLowerCase();
      const matchesQ =
        !q ||
        t.full_name.toLowerCase().includes(q) ||
        t.employee_no.toLowerCase().includes(q) ||
        (t.email?.toLowerCase().includes(q) ?? false) ||
        (t.specialization?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesSpecialization = specializationFilter === "all" || t.specialization === specializationFilter;
      return matchesQ && matchesStatus && matchesSpecialization;
    });
  }, [teachers, search, statusFilter, specializationFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSpecializationFilter("all");
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teachers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Teacher removed");
      qc.invalidateQueries({ queryKey: ["teachers"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Module</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Teachers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Teaching staff only — subjects, classes and qualifications. Employment details live in Employees.
          </p>
        </div>
        <div className="flex gap-2">
        <ImportButton entityKey="teachers" label="Import teachers" />
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus /> Add teacher
            </Button>
          </DialogTrigger>
          <TeacherDialog key={editing?.id ?? "new"} existing={editing} onDone={() => { setOpen(false); setEditing(null); }} />
        </Dialog>
        </div>
      </div>


      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, employee no, email, specialization…"
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
          <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All specializations</SelectItem>
              {specializations.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilterCount > 1 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" /> Clear filters
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {teachers?.length ?? 0} teachers
          </div>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading teachers…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <GraduationCap className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">No teachers yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add a teaching staff member, or check that their department is marked as teaching.
            </p>
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus /> Add teacher
            </Button>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background">
                <Th>Teacher</Th>
                <Th>Contact</Th>
                <Th>Subject &amp; class</Th>
                <Th>Qualification</Th>

                <Th>Status</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-primary-pale/40">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-pale text-xs font-semibold text-primary">
                        {initialsOf(t.full_name)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{t.full_name}</div>
                        <div className="text-xs text-muted-foreground">{t.employee_no}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {t.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="size-3" /> {t.email}
                      </div>
                    )}
                    {t.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="size-3" /> {t.phone}
                      </div>
                    )}
                    {!t.email && !t.phone && <span className="text-muted-foreground">—</span>}
                  </Td>
                  <Td>
                    <div className="text-foreground">{t.subjects?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.subjects?.classes
                        ? `${t.subjects.classes.name}${t.subjects.classes.section ? ` ${t.subjects.classes.section}` : ""}`
                        : (t.departments?.name ?? "")}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-foreground">{t.qualification ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{t.specialization ?? ""}</div>
                  </Td>

                  <Td>
                    <Badge variant={statusVariant(t.status)}>{formatStatus(t.status)}</Badge>
                  </Td>
                  <Td className="text-muted-foreground">{formatDate(t.date_of_joining)}</Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(t); setOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => {
                        if (confirm(`Remove ${t.full_name}?`)) deleteMut.mutate(t.id);
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

type DepartmentOpt = { id: string; name: string; is_teaching: boolean };

function TeacherDialog({ existing, onDone }: { existing: TeacherRow | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    employee_no: existing?.employee_no ?? "",
    full_name: existing?.full_name ?? "",
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    gender: "",
    date_of_birth: "",
    qualification: existing?.qualification ?? "",
    specialization: existing?.specialization ?? "",
    date_of_joining: existing?.date_of_joining ?? new Date().toISOString().slice(0, 10),
    status: (existing?.status ?? "active") as TeacherStatus,
    address: "",
    department_id: existing?.department_id ?? "",
    subject_id: existing?.subject_id ?? "",
    fee_group_id: existing?.fee_group_id ?? "",
  }));
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: departments } = useQuery({
    queryKey: ["departments", "teaching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, is_teaching")
        .eq("is_teaching", true)
        .order("name");
      if (error) throw error;
      return data as DepartmentOpt[];
    },
  });


  const { data: subjects } = useQuery({
    queryKey: ["subjects-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, classes(name, section)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        name: string;
        classes: { name: string; section: string | null } | null;
      }>;
    },
  });

  const { data: feeGroups } = useQuery({
    queryKey: ["fee-groups-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_groups")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.employee_no.trim() || !form.full_name.trim()) {
        throw new Error("Employee number and full name are required");
      }
      if (!form.department_id) {
        throw new Error("Teaching department is required");
      }
      const payload: any = {
        employee_no: form.employee_no.trim(),
        full_name: form.full_name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        qualification: form.qualification || null,
        specialization: form.specialization || null,
        date_of_joining: form.date_of_joining,
        status: form.status,
        department_id: form.department_id,
        subject_id: form.subject_id || null,
        fee_group_id: form.fee_group_id || null,
      };
      if (form.gender) payload.gender = form.gender;
      if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;
      if (form.address) payload.address = form.address;
      if (existing) {
        const { error } = await supabase.from("teachers").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teachers").insert(payload);
        if (error) throw error;
      }
    },

    onSuccess: () => {
      toast.success(existing ? "Teacher updated" : "Teacher added");
      qc.invalidateQueries({ queryKey: ["teachers"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });


  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{existing ? "Edit teacher" : "Add new teacher"}</DialogTitle>
        <DialogDescription>{existing ? "Update this faculty record." : "Create a faculty record. You can edit details later."}</DialogDescription>
      </DialogHeader>


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee No *">
          <Input
            value={form.employee_no}
            onChange={(e) => set("employee_no", e.target.value)}
            placeholder="MTIS-T-014"
          />
        </Field>
        <Field label="Full name *">
          <Input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Sara Ahmed"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="sara@mtis.edu"
          />
        </Field>
        <Field label="Phone">
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+92 300 1234567"
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
        <Field label="Qualification">
          <Input
            value={form.qualification}
            onChange={(e) => set("qualification", e.target.value)}
            placeholder="M.Sc. Mathematics"
          />
        </Field>
        <Field label="Specialization">
          <Input
            value={form.specialization}
            onChange={(e) => set("specialization", e.target.value)}
            placeholder="Algebra & Calculus"
          />
        </Field>
        <Field label="Date of joining">
          <Input
            type="date"
            value={form.date_of_joining}
            onChange={(e) => set("date_of_joining", e.target.value)}
          />
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v as TeacherStatus)}>
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
        <Field label="Teaching department *">
          <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Subject">
              <Select
                value={form.subject_id}
                onValueChange={(v) => set("subject_id", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject</SelectItem>
                  {(subjects ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.classes ? ` — ${s.classes.name}${s.classes.section ? ` ${s.classes.section}` : ""}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
        <Field label="Fee group">
              <Select
                value={form.fee_group_id}
                onValueChange={(v) => set("fee_group_id", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No fee group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No fee group</SelectItem>
                  {(feeGroups ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
          </Select>
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="House #, Street, City"
          />
        </Field>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={saveMut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Saving…" : existing ? "Update teacher" : "Save teacher"}
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

function statusVariant(s: TeacherStatus): "success" | "warning" | "danger" | "default" {
  if (s === "active") return "success";
  if (s === "on_leave" || s === "probation") return "warning";
  if (s === "inactive" || s === "resigned") return "danger";
  return "default";
}
