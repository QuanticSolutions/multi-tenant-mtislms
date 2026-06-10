import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, GraduationCap, Trash2, Pencil, Mail, Phone } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/admin/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers — MTIS" },
      { name: "description", content: "Manage teacher records, qualifications, and assignments." },
    ],
  }),
  component: TeachersPage,
});

type TeacherStatus = "active" | "on_leave" | "inactive" | "resigned";

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
};

function TeachersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select(
          "id, employee_no, full_name, email, phone, qualification, specialization, status, date_of_joining",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TeacherRow[];
    },
  });

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
      return matchesQ && matchesStatus;
    });
  }, [teachers, search, statusFilter]);

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
            Faculty directory, qualifications, and employment status.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus /> Add teacher
            </Button>
          </DialogTrigger>
          <AddTeacherDialog onDone={() => setOpen(false)} />
        </Dialog>
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On leave</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="resigned">Resigned</SelectItem>
            </SelectContent>
          </Select>
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
              Add your first faculty member to start building the directory.
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
                    <div className="text-foreground">{t.qualification ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{t.specialization ?? ""}</div>
                  </Td>
                  <Td>
                    <Badge variant={statusVariant(t.status)}>{t.status.replace("_", " ")}</Badge>
                  </Td>
                  <Td className="text-muted-foreground">{t.date_of_joining}</Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Edit" disabled>
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

function AddTeacherDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    employee_no: "",
    full_name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    qualification: "",
    specialization: "",
    date_of_joining: new Date().toISOString().slice(0, 10),
    status: "active" as TeacherStatus,
    address: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.employee_no.trim() || !form.full_name.trim()) {
        throw new Error("Employee number and full name are required");
      }
      const payload: any = {
        employee_no: form.employee_no.trim(),
        full_name: form.full_name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        qualification: form.qualification || null,
        specialization: form.specialization || null,
        date_of_joining: form.date_of_joining,
        status: form.status,
        address: form.address || null,
      };
      const { error } = await supabase.from("teachers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Teacher added");
      qc.invalidateQueries({ queryKey: ["teachers"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      onDone();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add teacher"),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Add new teacher</DialogTitle>
        <DialogDescription>Create a faculty record. You can edit details later.</DialogDescription>
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On leave</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="resigned">Resigned</SelectItem>
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
        <Button variant="outline" onClick={onDone} disabled={createMut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
          {createMut.isPending ? "Saving…" : "Save teacher"}
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
  if (s === "on_leave") return "warning";
  if (s === "inactive" || s === "resigned") return "danger";
  return "default";
}
