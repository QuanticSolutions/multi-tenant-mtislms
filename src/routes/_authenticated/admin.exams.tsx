import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, FileText, Plus, Save, Trash2 } from "lucide-react";
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
import { formatClass, formatDate, formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/exams")({
  head: () => ({
    meta: [
      { title: "Exams" },
      { name: "description", content: "Schedule exams and capture results per class." },
    ],
  }),
  component: ExamsPage,
});

type ExamStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

type ExamRow = {
  id: string;
  class_id: string;
  title: string;
  subject: string;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  total_marks: number;
  passing_marks: number;
  status: ExamStatus;
  notes: string | null;
  classes?: { name: string; section: string | null } | null;
};

const STATUSES: ExamStatus[] = ["scheduled", "ongoing", "completed", "cancelled"];

function ExamsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ExamStatus | "all">("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [resultsExam, setResultsExam] = useState<ExamRow | null>(null);

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

  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams", classFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("exams")
        .select("*, classes(name, section)")
        .order("exam_date", { ascending: false });
      if (classFilter !== "all") q = q.eq("class_id", classFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as ExamRow[];
    },
  });

  const subjects = useMemo(
    () => Array.from(new Set((exams ?? []).map((e) => e.subject))).sort(),
    [exams],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (exams ?? []).filter((e) => {
      if (subjectFilter !== "all" && e.subject !== subjectFilter) return false;
      if (!term) return true;
      return (
        e.title.toLowerCase().includes(term) ||
        e.subject.toLowerCase().includes(term) ||
        e.classes?.name?.toLowerCase().includes(term)
      );
    });
  }, [exams, search, subjectFilter]);

  const activeFilterCount = [classFilter !== "all", statusFilter !== "all", subjectFilter !== "all", !!search].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setClassFilter("all"); setStatusFilter("all"); setSubjectFilter("all"); };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exam deleted");
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const stats = useMemo(() => {
    const c = { scheduled: 0, ongoing: 0, completed: 0, cancelled: 0 };
    (exams ?? []).forEach((e) => (c[e.status] += 1));
    return c;
  }, [exams]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Module</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Exams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule assessments per class and record student results.
          </p>
        </div>
        <AddExamDialog classes={classes ?? []} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Scheduled" value={stats.scheduled} tone="default" />
        <StatCard label="Ongoing" value={stats.ongoing} tone="warning" />
        <StatCard label="Completed" value={stats.completed} tone="success" />
        <StatCard label="Cancelled" value={stats.cancelled} tone="danger" />
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              placeholder="Search by title, subject, class…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {(classes ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {formatClass(c.name, c.section)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilterCount > 1 && (
            <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading exams…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <FileText className="size-5" />
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              No exams yet — schedule the first one to get started.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background">
                <Th>Exam</Th>
                <Th>Class</Th>
                <Th>Date & Time</Th>
                <Th>Marks</Th>
                <Th>Status</Th>
                <Th className="w-[180px] text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-primary-pale/40">
                  <Td>
                    <div className="font-medium text-foreground">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{e.subject}</div>
                  </Td>
                  <Td>
                    {formatClass(e.classes?.name, e.classes?.section)}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      {formatDate(e.exam_date)}
                    </div>
                    {(e.start_time || e.end_time) && (
                      <div className="text-xs text-muted-foreground">
                        {e.start_time?.slice(0, 5)}
                        {e.end_time ? ` – ${e.end_time.slice(0, 5)}` : ""}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="text-sm">{Number(e.total_marks)}</div>
                    <div className="text-xs text-muted-foreground">
                      pass {Number(e.passing_marks)}
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={statusTone(e.status)}>{formatStatus(e.status)}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setResultsExam(e)}>
                        <ClipboardList /> Results
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => {
                          if (confirm(`Delete "${e.title}"? This removes its results too.`))
                            deleteMut.mutate(e.id);
                        }}
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ResultsDialog exam={resultsExam} onClose={() => setResultsExam(null)} />
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div className="mtis-card p-4">
      <p className="mtis-eyebrow">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-display text-2xl font-bold">{value}</span>
        <Badge variant={tone}>exam{value === 1 ? "" : "s"}</Badge>
      </div>
    </div>
  );
}

function statusTone(s: ExamStatus): "default" | "success" | "warning" | "danger" {
  if (s === "completed") return "success";
  if (s === "ongoing") return "warning";
  if (s === "cancelled") return "danger";
  return "default";
}

function AddExamDialog({
  classes,
}: {
  classes: { id: string; name: string; section: string | null }[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    class_id: "",
    title: "",
    subject: "",
    exam_date: new Date().toISOString().slice(0, 10),
    start_time: "",
    end_time: "",
    total_marks: "100",
    passing_marks: "35",
    status: "scheduled" as ExamStatus,
    notes: "",
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.class_id) throw new Error("Pick a class");
      if (!form.title.trim() || !form.subject.trim()) throw new Error("Title and subject required");
      const u = await supabase.auth.getUser();
      const { error } = await supabase.from("exams").insert({
        class_id: form.class_id,
        title: form.title.trim(),
        subject: form.subject.trim(),
        exam_date: form.exam_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        total_marks: Number(form.total_marks) || 100,
        passing_marks: Number(form.passing_marks) || 35,
        status: form.status,
        notes: form.notes.trim() || null,
        created_by: u.data.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exam scheduled");
      qc.invalidateQueries({ queryKey: ["exams"] });
      setOpen(false);
      setForm((f) => ({ ...f, title: "", subject: "", notes: "" }));
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to schedule exam"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Schedule exam
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Schedule new exam</DialogTitle>
          <DialogDescription>Set the basics. You can record results afterwards.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Class">
            <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
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
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as ExamStatus })}
            >
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
          </Field>
          <Field label="Title" className="sm:col-span-2">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Mid-term examination"
            />
          </Field>
          <Field label="Subject">
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Mathematics"
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={form.exam_date}
              onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
            />
          </Field>
          <Field label="Start time">
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </Field>
          <Field label="End time">
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </Field>
          <Field label="Total marks">
            <Input
              type="number"
              value={form.total_marks}
              onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
            />
          </Field>
          <Field label="Passing marks">
            <Input
              type="number"
              value={form.passing_marks}
              onChange={(e) => setForm({ ...form, passing_marks: e.target.value })}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional instructions"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ResultRow = {
  student_id: string;
  marks: string;
  absent: boolean;
  remarks: string;
};

function ResultsDialog({ exam, onClose }: { exam: ExamRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<string, ResultRow>>({});

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["roster", exam?.class_id],
    enabled: !!exam,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, admission_no, full_name")
        .eq("class_id", exam!.class_id)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["exam_results", exam?.id],
    enabled: !!exam,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("student_id, marks_obtained, is_absent, remarks")
        .eq("exam_id", exam!.id);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!students) return;
    const map: Record<string, ResultRow> = {};
    for (const s of students) {
      map[s.id] = { student_id: s.id, marks: "", absent: false, remarks: "" };
    }
    for (const e of existing ?? []) {
      if (map[e.student_id]) {
        map[e.student_id] = {
          student_id: e.student_id,
          marks: e.marks_obtained != null ? String(e.marks_obtained) : "",
          absent: !!e.is_absent,
          remarks: e.remarks ?? "",
        };
      }
    }
    setRows(map);
  }, [students, existing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!exam) return;
      const u = await supabase.auth.getUser();
      const uid = u.data.user?.id ?? null;
      const total = Number(exam.total_marks);
      const payload = Object.values(rows)
        .filter((r) => r.absent || r.marks !== "" || r.remarks.trim() !== "")
        .map((r) => {
          let m: number | null = null;
          if (!r.absent && r.marks !== "") {
            const n = Number(r.marks);
            if (Number.isNaN(n)) throw new Error("Marks must be numeric");
            if (n < 0 || n > total) throw new Error(`Marks must be between 0 and ${total}`);
            m = n;
          }
          return {
            exam_id: exam.id,
            student_id: r.student_id,
            marks_obtained: m,
            is_absent: r.absent,
            remarks: r.remarks.trim() || null,
            recorded_by: uid,
          };
        });
      if (payload.length === 0) return;
      const { error } = await supabase
        .from("exam_results")
        .upsert(payload, { onConflict: "exam_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Results saved");
      qc.invalidateQueries({ queryKey: ["exam_results", exam?.id] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save results"),
  });

  const isLoading = loadingStudents || loadingExisting;
  const pass = exam ? Number(exam.passing_marks) : 0;

  return (
    <Dialog open={!!exam} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{exam ? `Results — ${exam.title}` : "Results"}</DialogTitle>
          <DialogDescription>
            {exam
              ? `${exam.subject} • Total ${Number(exam.total_marks)} • Pass ${pass}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-auto rounded-md border border-border">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading roster…</div>
          ) : (students?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No active students in this class.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-background">
                <tr>
                  <Th>Student</Th>
                  <Th className="w-[110px]">Marks</Th>
                  <Th className="w-[80px]">Absent</Th>
                  <Th className="w-[110px]">Result</Th>
                  <Th>Remarks</Th>
                </tr>
              </thead>
              <tbody>
                {students!.map((s) => {
                  const r = rows[s.id];
                  if (!r) return null;
                  const numeric = r.marks !== "" ? Number(r.marks) : NaN;
                  const passed = !r.absent && !Number.isNaN(numeric) && numeric >= pass;
                  const failed = !r.absent && !Number.isNaN(numeric) && numeric < pass;
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <Td>
                        <div className="font-medium text-foreground">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground">{s.admission_no}</div>
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          inputMode="decimal"
                          disabled={r.absent}
                          value={r.marks}
                          onChange={(e) =>
                            setRows((m) => ({
                              ...m,
                              [s.id]: { ...m[s.id], marks: e.target.value },
                            }))
                          }
                        />
                      </Td>
                      <Td>
                        <input
                          type="checkbox"
                          checked={r.absent}
                          onChange={(e) =>
                            setRows((m) => ({
                              ...m,
                              [s.id]: {
                                ...m[s.id],
                                absent: e.target.checked,
                                marks: e.target.checked ? "" : m[s.id].marks,
                              },
                            }))
                          }
                          className="h-4 w-4 accent-primary"
                        />
                      </Td>
                      <Td>
                        {r.absent ? (
                          <Badge variant="warning">Absent</Badge>
                        ) : passed ? (
                          <Badge variant="success">Pass</Badge>
                        ) : failed ? (
                          <Badge variant="danger">Fail</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </Td>
                      <Td>
                        <Input
                          value={r.remarks}
                          onChange={(e) =>
                            setRows((m) => ({
                              ...m,
                              [s.id]: { ...m[s.id], remarks: e.target.value.slice(0, 200) },
                            }))
                          }
                          placeholder="Optional"
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || isLoading}>
            <Save /> {saveMut.isPending ? "Saving…" : "Save results"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 align-middle text-foreground ${className}`}>{children}</td>;
}
