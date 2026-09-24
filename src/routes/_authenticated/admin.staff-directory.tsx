import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Users2, Trash2, Pencil, Mail, Phone, X } from "lucide-react";
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
import { formatDate, formatStatus } from "@/lib/format";
import { money } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/admin/staff-directory")({
  head: () => ({
    meta: [
      { title: "Staff" },
      {
        name: "description",
        content: "Staff directory with departments, designations, salaries and status.",
      },
      { property: "og:title", content: "Staff" },
      {
        property: "og:description",
        content: "Manage every staff member's department, designation and salary.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffDirectoryPage,
});

type StaffStatus = "active" | "on_leave" | "inactive" | "resigned" | "probation";
const STATUS_OPTIONS: StaffStatus[] = [
  "active",
  "on_leave",
  "inactive",
  "resigned",
  "probation",
];

type StaffRow = {
  id: string;
  employee_no: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: StaffStatus;
  date_of_joining: string;
  department_id: string | null;
  designation: string | null;
  base_salary: number;
  departments: { name: string; is_teaching: boolean } | null;
};

type DepartmentOpt = { id: string; name: string; is_teaching: boolean };

function StaffDirectoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select(
          "id, employee_no, full_name, email, phone, status, date_of_joining, department_id, designation, base_salary, departments(name, is_teaching)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as StaffRow[];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, is_teaching")
        .order("name");
      if (error) throw error;
      return data as DepartmentOpt[];
    },
  });

  const rows = staff ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((e) => {
      const matchesQ =
        !q ||
        e.full_name.toLowerCase().includes(q) ||
        e.employee_no.toLowerCase().includes(q) ||
        (e.email?.toLowerCase().includes(q) ?? false) ||
        (e.designation?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesDept = deptFilter === "all" || e.department_id === deptFilter;
      return matchesQ && matchesStatus && matchesDept;
    });
  }, [rows, search, statusFilter, deptFilter]);

  const payrollTotal = filtered.reduce((sum, e) => sum + Number(e.base_salary || 0), 0);
  const activeFilters =
    (statusFilter !== "all" ? 1 : 0) + (deptFilter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teachers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff member removed");
      qc.invalidateQueries({ queryKey: ["staff-directory"] });
      qc.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Module</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every staff member — teaching and non-teaching — with department, designation and
            salary.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus /> Add staff
            </Button>
          </DialogTrigger>
          <StaffDialog
            key={editing?.id ?? "new"}
            existing={editing}
            departments={departments ?? []}
            onDone={() => {
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Staff" value={String(rows.length)} />
        <StatCard
          label="Teaching"
          value={String(rows.filter((r) => r.departments?.is_teaching).length)}
        />
        <StatCard
          label="Non-teaching"
          value={String(rows.filter((r) => r.departments && !r.departments.is_teaching).length)}
        />
        <StatCard label="Monthly base pay" value={money(payrollTotal)} />
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, staff no, designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilters > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setDeptFilter("all");
              }}
            >
              <X className="size-4" /> Clear filters
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {rows.length} staff
          </div>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading staff…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <Users2 className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">No staff yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add staff members and assign them to a department to start payroll.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background">
                <Th>Staff</Th>
                <Th>Contact</Th>
                <Th>Department</Th>
                <Th>Designation</Th>
                <Th>Base salary</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-primary-pale/40">
                  <Td>
                    <div className="font-medium text-foreground">{e.full_name}</div>
                    <div className="text-xs text-muted-foreground">{e.employee_no}</div>
                  </Td>
                  <Td>
                    {e.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="size-3" /> {e.email}
                      </div>
                    )}
                    {e.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="size-3" /> {e.phone}
                      </div>
                    )}
                    {!e.email && !e.phone && <span className="text-muted-foreground">—</span>}
                  </Td>
                  <Td>
                    <div className="text-foreground">{e.departments?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.departments ? (e.departments.is_teaching ? "Teaching" : "Non-teaching") : ""}
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">
                    {e.designation ?? (e.departments?.is_teaching ? "Teacher" : "—")}
                  </Td>
                  <Td className="text-muted-foreground">
                    {e.base_salary ? money(e.base_salary) : "—"}
                  </Td>
                  <Td>
                    <Badge variant={statusVariant(e.status)}>{formatStatus(e.status)}</Badge>
                  </Td>
                  <Td className="text-muted-foreground">{formatDate(e.date_of_joining)}</Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => {
                        if (confirm(`Remove ${e.full_name}?`)) deleteMut.mutate(e.id);
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

function StaffDialog({
  existing,
  departments,
  onDone,
}: {
  existing: StaffRow | null;
  departments: DepartmentOpt[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    employee_no: existing?.employee_no ?? "",
    full_name: existing?.full_name ?? "",
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    department_id: existing?.department_id ?? "",
    designation: existing?.designation ?? "",
    base_salary: existing?.base_salary != null ? String(existing.base_salary) : "",
    date_of_joining: existing?.date_of_joining ?? new Date().toISOString().slice(0, 10),
    status: (existing?.status ?? "active") as StaffStatus,
  }));
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selectedDept = departments.find((d) => d.id === form.department_id) ?? null;
  const isTeaching = selectedDept?.is_teaching ?? false;

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.employee_no.trim() || !form.full_name.trim()) {
        throw new Error("Staff number and full name are required");
      }
      if (!form.department_id) {
        throw new Error("Department is required — every staff member must belong to one");
      }
      const payload = {
        employee_no: form.employee_no.trim(),
        full_name: form.full_name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        department_id: form.department_id,
        designation: isTeaching ? null : form.designation || null,
        base_salary: Number(form.base_salary || 0),
        date_of_joining: form.date_of_joining,
        status: form.status,
      };
      if (existing) {
        const { error } = await supabase.from("teachers").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teachers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existing ? "Staff updated" : "Staff added");
      qc.invalidateQueries({ queryKey: ["staff-directory"] });
      qc.invalidateQueries({ queryKey: ["teachers"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{existing ? "Edit staff" : "Add staff"}</DialogTitle>
        <DialogDescription>
          Employment details only. Teaching assignments live in the Teachers module.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Staff No *">
          <Input
            value={form.employee_no}
            onChange={(e) => set("employee_no", e.target.value)}
            placeholder="MTIS-E-014"
          />
        </Field>
        <Field label="Full name *">
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Department *">
          <Select value={form.department_id} onValueChange={(v) => set("department_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} {d.is_teaching ? "· Teaching" : "· Non-teaching"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={isTeaching ? "Designation (teaching staff)" : "Designation"}>
          <Input
            value={isTeaching ? "Teacher" : form.designation}
            onChange={(e) => set("designation", e.target.value)}
            placeholder="Front Desk Officer"
            disabled={!form.department_id || isTeaching}
          />
        </Field>
        <Field label="Base salary">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.base_salary}
            onChange={(e) => set("base_salary", e.target.value)}
            placeholder="0"
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
          <Select value={form.status} onValueChange={(v) => set("status", v as StaffStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={saveMut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Saving…" : existing ? "Update staff" : "Save staff"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="mtis-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
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

function statusVariant(s: StaffStatus): "success" | "warning" | "danger" | "default" {
  if (s === "active") return "success";
  if (s === "on_leave" || s === "probation") return "warning";
  if (s === "inactive" || s === "resigned") return "danger";
  return "default";
}
