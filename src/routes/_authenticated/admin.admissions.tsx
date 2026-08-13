import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Calendar, CheckCircle2, XCircle, UserPlus, GraduationCap } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatClass, formatDate, formatDateTime, formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/admissions")({
  head: () => ({
    meta: [
      { title: "Admissions — Madina Tul Ilm" },
      { name: "description", content: "Manage applications, interviews and offers for new admissions." },
    ],
  }),
  component: AdmissionsPage,
});

type Status = "new" | "screening" | "interview" | "offered" | "accepted" | "rejected" | "withdrawn";
type Outcome = "pending" | "pass" | "fail" | "hold";
type Mode = "in_person" | "online" | "phone";

type Application = {
  id: string;
  application_no: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  date_of_birth: string | null;
  applying_for_class_id: string | null;
  previous_school: string | null;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string | null;
  address: string | null;
  status: Status;
  application_fee: number;
  fee_paid: boolean;
  offer_date: string | null;
  decision_date: string | null;
  decision_notes: string | null;
  source: string | null;
  submitted_at: string;
};

type Interview = {
  id: string;
  application_id: string;
  scheduled_at: string;
  mode: Mode;
  interviewer_id: string | null;
  interviewer_name: string | null;
  score: number | null;
  outcome: Outcome;
  remarks: string | null;
};

const STATUS_TABS: { label: string; value: Status | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Screening", value: "screening" },
  { label: "Interview", value: "interview" },
  { label: "Offered", value: "offered" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_BADGE: Record<Status, { label: string; className: string }> = {
  new: { label: "New", className: "bg-primary-pale text-primary" },
  screening: { label: "Screening", className: "bg-accent/10 text-accent" },
  interview: { label: "Interview", className: "bg-yellow-100 text-yellow-800" },
  offered: { label: "Offered", className: "bg-blue-100 text-blue-800" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground" },
};

function AdmissionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [interviewApp, setInterviewApp] = useState<Application | null>(null);
  const [classFilter, setClassFilter] = useState("all");
  const [feeFilter, setFeeFilter] = useState("all");

  const appsQ = useQuery({
    queryKey: ["admission_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_applications")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as Application[];
    },
  });

  const classesQ = useQuery({
    queryKey: ["classes-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const interviewsQ = useQuery({
    queryKey: ["admission_interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_interviews")
        .select("*")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as Interview[];
    },
  });

  const apps = appsQ.data ?? [];
  const interviews = interviewsQ.data ?? [];
  const classes = classesQ.data ?? [];
  const classMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.name])), [classes]);
  const interviewsByApp = useMemo(() => {
    const m: Record<string, Interview[]> = {};
    for (const i of interviews) (m[i.application_id] ??= []).push(i);
    return m;
  }, [interviews]);

  const filtered = apps.filter((a) => {
    if (tab !== "all" && a.status !== tab) return false;
    if (classFilter !== "all" && a.applying_for_class_id !== classFilter) return false;
    if (feeFilter !== "all" && (feeFilter === "paid") !== a.fee_paid) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.application_no.toLowerCase().includes(q) ||
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
      a.guardian_name.toLowerCase().includes(q) ||
      a.guardian_phone.includes(q)
    );
  });

  const activeFilterCount = [tab !== "all", classFilter !== "all", feeFilter !== "all", !!search].filter(Boolean).length;
  const clearFilters = () => { setTab("all"); setClassFilter("all"); setFeeFilter("all"); setSearch(""); };

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: apps.length };
    for (const a of apps) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [apps]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const patch: Partial<Application> = { status };
      if (status === "offered") patch.offer_date = new Date().toISOString().slice(0, 10);
      if (status === "accepted" || status === "rejected" || status === "withdrawn") {
        patch.decision_date = new Date().toISOString().slice(0, 10);
      }
      const { error } = await supabase.from("admission_applications").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admission_applications"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admission_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admission_applications"] });
      toast.success("Application removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Admissions</p>
          <h1 className="mtis-section-title mt-1">Enrolment funnel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track applicants from first enquiry through interview to enrolment.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" /> New application
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label="Total" value={counts.total ?? 0} />
        <StatTile label="In screening / interview" value={(counts.screening ?? 0) + (counts.interview ?? 0)} />
        <StatTile label="Offered" value={counts.offered ?? 0} />
        <StatTile label="Accepted" value={counts.accepted ?? 0} tone="success" />
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary-pale hover:text-primary"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[11px] opacity-70">
                {t.value === "all" ? apps.length : counts[t.value] ?? 0}
              </span>
            </button>
          ))}
          <div className="ml-auto relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicant, number, guardian…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Applying for class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{formatClass(c.name)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={feeFilter} onValueChange={setFeeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Fee paid" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All fee status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 1 && (
            <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">App #</th>
                <th className="px-3 py-2">Applicant</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Guardian</th>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Interviews</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                    {appsQ.isLoading ? "Loading…" : "No applications match this view."}
                  </td>
                </tr>
              )}
              {filtered.map((a) => {
                const ivs = interviewsByApp[a.id] ?? [];
                return (
                  <tr key={a.id} className="border-t border-border hover:bg-primary-pale/30">
                    <td className="px-3 py-2 font-mono text-xs">{a.application_no}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">
                        {a.first_name} {a.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.gender ?? "—"} · {a.date_of_birth ? formatDate(a.date_of_birth) : "DOB —"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.applying_for_class_id ? formatClass(classMap[a.applying_for_class_id]) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-foreground">{a.guardian_name}</div>
                      <div className="text-xs text-muted-foreground">{a.guardian_phone}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-foreground">Rs {Number(a.application_fee).toLocaleString()}</div>
                      <Badge
                        variant="outline"
                        className={
                          a.fee_paid
                            ? "border-green-300 bg-green-50 text-green-800"
                            : "border-yellow-300 bg-yellow-50 text-yellow-800"
                        }
                      >
                        {a.fee_paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {ivs.length === 0 ? (
                        <span>—</span>
                      ) : (
                        <span>
                          {ivs.length} scheduled · latest{" "}
                          <span className="font-medium text-foreground">{ivs[0].outcome}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={STATUS_BADGE[a.status].className}>
                        {formatStatus(a.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setInterviewApp(a)}
                          title="Schedule interview"
                        >
                          <Calendar className="size-4" />
                        </Button>
                        <Select
                          value={a.status}
                          onValueChange={(v) => updateStatus.mutate({ id: a.id, status: v as Status })}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_BADGE) as Status[]).map((s) => (
                              <SelectItem key={s} value={s}>
                                {formatStatus(s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Remove application ${a.application_no}?`)) del.mutate(a.id);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddApplicationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        classes={classes}
        onCreated={() => qc.invalidateQueries({ queryKey: ["admission_applications"] })}
      />
      {interviewApp && (
        <InterviewDialog
          application={interviewApp}
          existing={interviewsByApp[interviewApp.id] ?? []}
          onOpenChange={(o) => !o && setInterviewApp(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ["admission_interviews"] });
            qc.invalidateQueries({ queryKey: ["admission_applications"] });
          }}
        />
      )}
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success";
}) {
  return (
    <div className="mtis-card p-4">
      <p className="mtis-eyebrow">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${tone === "success" ? "text-green-700" : "text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

function AddApplicationDialog({
  open,
  onOpenChange,
  classes,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  classes: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    application_no: "",
    first_name: "",
    last_name: "",
    gender: "",
    date_of_birth: "",
    applying_for_class_id: "",
    previous_school: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
    application_fee: "0",
    source: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        application_no:
          form.application_no.trim() || `APP-${Date.now().toString().slice(-6)}`,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        applying_for_class_id: form.applying_for_class_id || null,
        previous_school: form.previous_school || null,
        guardian_name: form.guardian_name.trim(),
        guardian_phone: form.guardian_phone.trim(),
        guardian_email: form.guardian_email || null,
        address: form.address || null,
        application_fee: Number(form.application_fee) || 0,
        source: form.source || null,
      };
      if (!payload.first_name || !payload.last_name || !payload.guardian_name || !payload.guardian_phone) {
        throw new Error("Applicant name and guardian details are required");
      }
      const { error } = await supabase.from("admission_applications").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application submitted");
      onCreated();
      onOpenChange(false);
      setForm({
        application_no: "",
        first_name: "",
        last_name: "",
        gender: "",
        date_of_birth: "",
        applying_for_class_id: "",
        previous_school: "",
        guardian_name: "",
        guardian_phone: "",
        guardian_email: "",
        address: "",
        application_fee: "0",
        source: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" /> New application
          </DialogTitle>
          <DialogDescription>Capture the applicant and guardian details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Application #">
            <Input
              value={form.application_no}
              onChange={(e) => setForm({ ...form, application_no: e.target.value })}
              placeholder="Auto if blank"
            />
          </Field>
          <Field label="Applying for class">
            <Select
              value={form.applying_for_class_id}
              onValueChange={(v) => setForm({ ...form, applying_for_class_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatClass(c.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="First name *">
            <Input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </Field>
          <Field label="Last name *">
            <Input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </Field>
          <Field label="Previous school">
            <Input
              value={form.previous_school}
              onChange={(e) => setForm({ ...form, previous_school: e.target.value })}
            />
          </Field>
          <Field label="Source">
            <Input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Referral, walk-in, website…"
            />
          </Field>
          <Field label="Guardian name *">
            <Input
              value={form.guardian_name}
              onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
            />
          </Field>
          <Field label="Guardian phone *">
            <Input
              value={form.guardian_phone}
              onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })}
            />
          </Field>
          <Field label="Guardian email">
            <Input
              type="email"
              value={form.guardian_email}
              onChange={(e) => setForm({ ...form, guardian_email: e.target.value })}
            />
          </Field>
          <Field label="Application fee (Rs)">
            <Input
              type="number"
              value={form.application_fee}
              onChange={(e) => setForm({ ...form, application_fee: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Address">
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Submit application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InterviewDialog({
  application,
  existing,
  onOpenChange,
  onChanged,
}: {
  application: Application;
  existing: Interview[];
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const [scheduled_at, setScheduledAt] = useState(new Date().toISOString().slice(0, 16));
  const [mode, setMode] = useState<Mode>("in_person");
  const [interviewer_name, setInterviewerName] = useState("");
  const [score, setScore] = useState("");
  const [remarks, setRemarks] = useState("");

  const schedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admission_interviews").insert({
        application_id: application.id,
        scheduled_at: new Date(scheduled_at).toISOString(),
        mode,
        interviewer_name: interviewer_name || null,
        remarks: remarks || null,
      });
      if (error) throw error;
      // Move application into interview stage if new/screening
      if (application.status === "new" || application.status === "screening") {
        await supabase
          .from("admission_applications")
          .update({ status: "interview" })
          .eq("id", application.id);
      }
    },
    onSuccess: () => {
      toast.success("Interview scheduled");
      setInterviewerName("");
      setRemarks("");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const record = useMutation({
    mutationFn: async ({ id, outcome, sc }: { id: string; outcome: Outcome; sc?: string }) => {
      const patch: Partial<Interview> = { outcome };
      if (sc !== undefined && sc !== "") patch.score = Number(sc);
      const { error } = await supabase.from("admission_interviews").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Interview updated");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" />
            Interviews — {application.first_name} {application.last_name}
          </DialogTitle>
          <DialogDescription>
            Application {application.application_no}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="mtis-card p-3">
            <p className="mtis-eyebrow mb-2">Schedule new interview</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Date & time">
                <Input
                  type="datetime-local"
                  value={scheduled_at}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </Field>
              <Field label="Mode">
                <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Interviewer">
                <Input
                  value={interviewer_name}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  placeholder="Name"
                />
              </Field>
              <Field label="Score (opt.)">
                <Input type="number" value={score} onChange={(e) => setScore(e.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Remarks">
                  <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button onClick={() => schedule.mutate()} disabled={schedule.isPending}>
                <Plus className="mr-2 size-4" />
                {schedule.isPending ? "Scheduling…" : "Schedule"}
              </Button>
            </div>
          </div>

          <div>
            <p className="mtis-eyebrow mb-2">History</p>
            {existing.length === 0 ? (
              <p className="text-sm text-muted-foreground">No interviews yet.</p>
            ) : (
              <ul className="space-y-2">
                {existing.map((iv) => (
                  <li
                    key={iv.id}
                    className="rounded-md border border-border bg-surface p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-foreground">
                          {formatDateTime(iv.scheduled_at)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatStatus(iv.mode)} · {iv.interviewer_name ?? "Interviewer TBD"} ·
                          {iv.score != null ? ` Score ${iv.score}` : " No score"}
                        </div>
                        {iv.remarks && (
                          <p className="mt-1 text-xs text-muted-foreground">{iv.remarks}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            iv.outcome === "pass"
                              ? "border-green-300 bg-green-50 text-green-800"
                              : iv.outcome === "fail"
                              ? "border-red-300 bg-red-50 text-red-800"
                              : iv.outcome === "hold"
                              ? "border-yellow-300 bg-yellow-50 text-yellow-800"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {formatStatus(iv.outcome)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Mark pass"
                          onClick={() => record.mutate({ id: iv.id, outcome: "pass" })}
                        >
                          <CheckCircle2 className="size-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Mark fail"
                          onClick={() => record.mutate({ id: iv.id, outcome: "fail" })}
                        >
                          <XCircle className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
