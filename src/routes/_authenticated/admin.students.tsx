import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Users, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
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

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({
    meta: [
      { title: "Students — Madina Tul Ilm" },
      { name: "description", content: "Manage student records, admissions, and class assignments." },
    ],
  }),
  component: StudentsPage,
});

type StudentRow = {
  id: string;
  admission_no: string;
  full_name: string;
  gender: string | null;
  status: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  enrollment_date: string;
  class_id: string | null;
  classes: { name: string; section: string | null } | null;
};

function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

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

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "id, admission_no, full_name, gender, status, guardian_name, guardian_phone, enrollment_date, class_id, classes(name, section)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as StudentRow[];
    },
  });

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
      return matchesQ && matchesStatus;
    });
  }, [students, search, statusFilter]);

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus /> Add student
            </Button>
          </DialogTrigger>
          <AddStudentDialog classes={classes ?? []} onDone={() => setOpen(false)} />
        </Dialog>
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="probation">Probation</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
            </SelectContent>
          </Select>
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
                    {s.classes ? `${s.classes.name}${s.classes.section ? ` — ${s.classes.section}` : ""}` : "—"}
                  </Td>
                  <Td>
                    <div className="text-foreground">{s.guardian_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{s.guardian_phone ?? ""}</div>
                  </Td>
                  <Td>
                    <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  </Td>
                  <Td className="text-muted-foreground">{s.enrollment_date}</Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Edit" disabled>
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

function AddStudentDialog({
  classes,
  onDone,
}: {
  classes: Array<{ id: string; name: string; section: string | null }>;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    admission_no: "",
    full_name: "",
    gender: "",
    date_of_birth: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
    class_id: "",
    status: "active" as "active" | "inactive" | "probation" | "graduated" | "transferred",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = useMutation({
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
      };
      const { error } = await supabase.from("students").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student added");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-students"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add student"),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Add new student</DialogTitle>
        <DialogDescription>
          Create an admission record. You can edit details later.
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
                  {c.name}
                  {c.section ? ` — ${c.section}` : ""}
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="probation">Probation</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
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

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={createMut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
          {createMut.isPending ? "Saving…" : "Save student"}
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

function statusVariant(s: string): "success" | "warning" | "danger" | "default" {
  if (s === "active") return "success";
  if (s === "probation") return "warning";
  if (s === "inactive" || s === "transferred") return "danger";
  return "default";
}
