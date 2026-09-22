import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BriefcaseBusiness, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { IntakeTabs } from "@/components/admin/intake-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/employees")({
  head: () => ({
    meta: [
      { title: "Staff Applications — School LMS" },
      {
        name: "description",
        content: "Review staff job applications and share an embeddable careers form.",
      },
      { property: "og:title", content: "Staff Applications — School LMS" },
      {
        property: "og:description",
        content: "Review staff job applications for School LMS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmployeesPage,
});

const STATUSES = ["new", "screening", "interview", "offered", "hired", "rejected"] as const;
type Status = (typeof STATUSES)[number];

type ApplicationRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  position: string;
  qualification: string | null;
  experience_years: number | null;
  cv_url: string | null;
  expected_salary: number | null;
  status: Status;
  notes: string | null;
  source: string;
  created_at: string;
};

function statusTone(s: Status) {
  if (s === "hired") return "success" as const;
  if (s === "rejected") return "secondary" as const;
  if (s === "offered") return "info" as const;
  return "warning" as const;
}

function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApplicationRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["employment-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employment_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ApplicationRow[];
    },
  });

  const rows = data ?? [];
  const positions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.position).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        !q ||
        r.full_name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false) ||
        r.position.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesPosition = positionFilter === "all" || r.position === positionFilter;
      return matchesQ && matchesStatus && matchesPosition;
    });
  }, [rows, search, statusFilter, positionFilter]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employment_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application removed");
      qc.invalidateQueries({ queryKey: ["employment-applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeFilters =
    (statusFilter !== "all" ? 1 : 0) + (positionFilter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Intake</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Staff applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Job applications for teaching and support roles, including embedded form submissions.
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
              <Plus /> Add application
            </Button>
          </DialogTrigger>
          <ApplicationDialog
            key={editing?.id ?? "new"}
            existing={editing}
            onDone={() => {
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </div>

      <IntakeTabs active="employees" />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={String(rows.length)} />
        <StatCard label="New" value={String(rows.filter((r) => r.status === "new").length)} />
        <StatCard
          label="Interviewing"
          value={String(rows.filter((r) => r.status === "interview").length)}
        />
        <StatCard label="Hired" value={String(rows.filter((r) => r.status === "hired").length)} />
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, position…"
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
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All positions</SelectItem>
              {positions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
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
                setPositionFilter("all");
              }}
            >
              <X className="size-4" /> Clear filters
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {rows.length} applications
          </div>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading applications…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <BriefcaseBusiness className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">No applications yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add one manually, or share the embeddable careers form on your website.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Qualification</th>
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-primary-pale/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.email ?? r.phone}</div>
                  </td>
                  <td className="px-4 py-3">{r.position}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.qualification ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.experience_years != null ? `${r.experience_years} yrs` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusTone(r.status)}>{formatStatus(r.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(r);
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
                        if (confirm(`Remove application from ${r.full_name}?`))
                          deleteMut.mutate(r.id);
                      }}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
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

function ApplicationDialog({
  existing,
  onDone,
}: {
  existing: ApplicationRow | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    full_name: existing?.full_name ?? "",
    phone: existing?.phone ?? "",
    email: existing?.email ?? "",
    position: existing?.position ?? "",
    qualification: existing?.qualification ?? "",
    experience_years: existing?.experience_years != null ? String(existing.experience_years) : "",
    cv_url: existing?.cv_url ?? "",
    expected_salary: existing?.expected_salary != null ? String(existing.expected_salary) : "",
    status: existing?.status ?? "new",
    notes: existing?.notes ?? "",
  }));

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim() || !form.phone.trim() || !form.position.trim()) {
        throw new Error("Name, phone and position are required");
      }
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email || null,
        position: form.position.trim(),
        qualification: form.qualification || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        cv_url: form.cv_url || null,
        expected_salary: form.expected_salary ? Number(form.expected_salary) : null,
        status: form.status as Status,
        notes: form.notes || null,
      };
      if (existing) {
        const { error } = await supabase
          .from("employment_applications")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employment_applications").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existing ? "Application updated" : "Application added");
      qc.invalidateQueries({ queryKey: ["employment-applications"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{existing ? "Edit application" : "Add application"}</DialogTitle>
        <DialogDescription>Applicant details and hiring status.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldBox label="Full name *">
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </FieldBox>
        <FieldBox label="Phone *">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </FieldBox>
        <FieldBox label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </FieldBox>
        <FieldBox label="Position applied for *">
          <Input
            value={form.position}
            onChange={(e) => set("position", e.target.value)}
            placeholder="Mathematics Teacher"
          />
        </FieldBox>
        <FieldBox label="Qualification">
          <Input
            value={form.qualification}
            onChange={(e) => set("qualification", e.target.value)}
            placeholder="M.Sc Mathematics"
          />
        </FieldBox>
        <FieldBox label="Experience (years)">
          <Input
            type="number"
            min="0"
            step="0.5"
            value={form.experience_years}
            onChange={(e) => set("experience_years", e.target.value)}
          />
        </FieldBox>
        <FieldBox label="CV / portfolio link">
          <Input value={form.cv_url} onChange={(e) => set("cv_url", e.target.value)} />
        </FieldBox>
        <FieldBox label="Expected salary">
          <Input
            type="number"
            min="0"
            value={form.expected_salary}
            onChange={(e) => set("expected_salary", e.target.value)}
          />
        </FieldBox>
        <FieldBox label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldBox>
        <FieldBox label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
        </FieldBox>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={saveMut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Saving…" : existing ? "Update application" : "Save application"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function FieldBox({
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
