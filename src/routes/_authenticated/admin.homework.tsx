import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BookMarked, ClipboardCheck, Plus, Save } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/homework")({
  head: () => ({
    meta: [
      { title: "Homework" },
      { name: "description", content: "Assign homework and track student submissions." },
    ],
  }),
  component: HomeworkPage,
});

type HwStatus = "draft" | "assigned" | "closed";
type SubStatus = "pending" | "submitted" | "late" | "graded";

type HomeworkRow = {
  id: string;
  class_id: string;
  subject: string;
  title: string;
  description: string | null;
  assigned_date: string;
  due_date: string;
  max_marks: number;
  status: HwStatus;
  classes?: { name: string; section: string | null } | null;
};

const STATUS_TONE: Record<HwStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  assigned: "bg-info-soft text-info",
  closed: "bg-success-soft text-success",
};
const SUB_TONE: Record<SubStatus, string> = {
  pending: "bg-warning-soft text-warning",
  submitted: "bg-info-soft text-info",
  late: "bg-accent-soft text-accent",
  graded: "bg-success-soft text-success",
};

function HomeworkPage() {
  const qc = useQueryClient();
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<HwStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [subsFor, setSubsFor] = useState<HomeworkRow | null>(null);

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section, grade_level")
        .order("grade_level");
      if (error) throw error;
      return data;
    },
  });

  const { data: homework, isLoading } = useQuery({
    queryKey: ["homework", classFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("homework")
        .select("*, classes:class_id ( name, section )")
        .order("due_date", { ascending: false });
      if (classFilter !== "all") q = q.eq("class_id", classFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as HomeworkRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!homework) return [];
    const s = search.toLowerCase().trim();
    if (!s) return homework;
    return homework.filter(
      (h) =>
        h.title.toLowerCase().includes(s) ||
        h.subject.toLowerCase().includes(s) ||
        h.classes?.name?.toLowerCase().includes(s),
    );
  }, [homework, search]);

  const stats = useMemo(() => {
    const list = homework ?? [];
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: list.length,
      active: list.filter((h) => h.status === "assigned").length,
      overdue: list.filter((h) => h.status === "assigned" && h.due_date < today).length,
      closed: list.filter((h) => h.status === "closed").length,
    };
  }, [homework]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: HwStatus }) => {
      const { error } = await supabase.from("homework").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Homework updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Academics</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Homework</h1>
          <p className="text-sm text-muted-foreground">
            Assign work per class and track student submissions.
          </p>
        </div>
        <NewHomeworkDialog classes={classes ?? []} />
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Total assignments" value={stats.total} />
        <StatTile label="Active" value={stats.active} tone="info" />
        <StatTile label="Overdue" value={stats.overdue} tone="danger" />
        <StatTile label="Closed" value={stats.closed} tone="success" />
      </section>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search title, subject, class…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {(classes ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.section ? ` · ${c.section}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as HwStatus | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Assigned</th>
                <th className="py-2 pr-3">Due</th>
                <th className="py-2 pr-3">Marks</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No homework yet.</td></tr>
              ) : (
                filtered.map((h) => (
                  <tr key={h.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{h.title}</td>
                    <td className="py-2 pr-3">{h.classes?.name}{h.classes?.section ? ` · ${h.classes?.section}` : ""}</td>
                    <td className="py-2 pr-3">{h.subject}</td>
                    <td className="py-2 pr-3">{h.assigned_date}</td>
                    <td className="py-2 pr-3">{h.due_date}</td>
                    <td className="py-2 pr-3">{h.max_marks}</td>
                    <td className="py-2 pr-3">
                      <Badge className={STATUS_TONE[h.status]} variant="secondary">{h.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSubsFor(h)}>
                          <ClipboardCheck /> Submissions
                        </Button>
                        {h.status !== "closed" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus.mutate({ id: h.id, status: "closed" })}
                          >
                            Close
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus.mutate({ id: h.id, status: "assigned" })}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {subsFor && (
        <SubmissionsDialog
          homework={subsFor}
          onClose={() => setSubsFor(null)}
        />
      )}
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  tone,
}: { label: string; value: number; tone?: "info" | "danger" | "success" }) {
  const toneCls =
    tone === "info" ? "text-info" :
    tone === "danger" ? "text-accent" :
    tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="mtis-card p-4">
      <p className="mtis-eyebrow">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

function NewHomeworkDialog({ classes }: { classes: { id: string; name: string; section: string | null }[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    class_id: "",
    subject: "",
    title: "",
    description: "",
    due_date: "",
    max_marks: 10,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.class_id || !form.title || !form.subject || !form.due_date) {
        throw new Error("Please fill class, subject, title and due date");
      }
      const { error } = await supabase.from("homework").insert({
        class_id: form.class_id,
        subject: form.subject,
        title: form.title,
        description: form.description || null,
        due_date: form.due_date,
        max_marks: form.max_marks,
        status: "assigned",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Homework assigned");
      setOpen(false);
      setForm({ class_id: "", subject: "", title: "", description: "", due_date: "", max_marks: 10 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> Assign homework</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New homework</DialogTitle>
          <DialogDescription>Assign work to a class with a due date.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Class</label>
            <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.section ? ` · ${c.section}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Mathematics" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max marks</label>
              <Input type="number" min={1} value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Chapter 4 exercises" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes for students" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Due date</label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <BookMarked /> Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SubRow = {
  id?: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  status: SubStatus;
  marks: number | null;
  remarks: string | null;
  submitted_date: string | null;
};

function SubmissionsDialog({ homework, onClose }: { homework: HomeworkRow; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["hw-submissions", homework.id],
    queryFn: async () => {
      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id, full_name, admission_no")
        .eq("class_id", homework.class_id)
        .order("full_name");
      if (sErr) throw sErr;

      const { data: subs, error: bErr } = await supabase
        .from("homework_submissions")
        .select("*")
        .eq("homework_id", homework.id);
      if (bErr) throw bErr;

      const byStudent = new Map((subs ?? []).map((s) => [s.student_id, s]));
      return (students ?? []).map<SubRow>((st) => {
        const existing = byStudent.get(st.id);
        return {
          id: existing?.id,
          student_id: st.id,
          student_name: st.full_name,
          admission_no: st.admission_no,
          status: (existing?.status as SubStatus) ?? "pending",
          marks: existing?.marks ?? null,
          remarks: existing?.remarks ?? null,
          submitted_date: existing?.submitted_date ?? null,
        };
      });
    },
  });

  const [local, setLocal] = useState<SubRow[]>([]);
  const list = local.length ? local : rows ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const payload = list.map((r) => ({
        homework_id: homework.id,
        student_id: r.student_id,
        status: r.status,
        marks: r.marks,
        remarks: r.remarks,
        submitted_date:
          r.status === "submitted" || r.status === "late" || r.status === "graded"
            ? r.submitted_date ?? new Date().toISOString().slice(0, 10)
            : null,
      }));
      const { error } = await supabase
        .from("homework_submissions")
        .upsert(payload, { onConflict: "homework_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hw-submissions", homework.id] });
      toast.success("Submissions saved");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function update(idx: number, patch: Partial<SubRow>) {
    const base = list.map((r) => ({ ...r }));
    base[idx] = { ...base[idx], ...patch };
    setLocal(base);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{homework.title}</DialogTitle>
          <DialogDescription>
            {homework.classes?.name} · Due {homework.due_date} · Max {homework.max_marks} marks
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Student</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Marks</th>
                <th className="py-2 pr-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No students in this class.</td></tr>
              ) : (
                list.map((r, i) => (
                  <tr key={r.student_id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{r.student_name}</div>
                      <div className="text-xs text-muted-foreground">{r.admission_no}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <Select value={r.status} onValueChange={(v) => update(i, { status: v as SubStatus })}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="graded">Graded</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge className={`mt-1 ${SUB_TONE[r.status]}`} variant="secondary">{r.status}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        min={0}
                        max={homework.max_marks}
                        value={r.marks ?? ""}
                        onChange={(e) => update(i, { marks: e.target.value === "" ? null : Number(e.target.value) })}
                        className="h-8 w-20"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        value={r.remarks ?? ""}
                        onChange={(e) => update(i, { remarks: e.target.value })}
                        className="h-8"
                        placeholder="Optional"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || list.length === 0}>
            <Save /> Save submissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
