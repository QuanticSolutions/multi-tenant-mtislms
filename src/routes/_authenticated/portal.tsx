import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Megaphone, LogOut, ShieldCheck, Pin, Wallet, Download, Upload, Home, ClipboardList, FileQuestion, GraduationCap, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatClass, formatDateTime, formatDate, formatStatus } from "@/lib/format";
import { money, formatPeriod } from "@/lib/finance";
import { docBrand } from "@/lib/print";
import { downloadPdf } from "@/lib/pdf";
import { BrandLockup, useBranding } from "@/hooks/use-branding";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Student Portal" },
      {
        name: "description",
        content: "Student portal for your school: view your class timetable and school announcements.",
      },
      { property: "og:title", content: "Student Portal" },
      {
        property: "og:description",
        content: "View your class timetable and school announcements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalPage,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function PortalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["portal-me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("students")
        .select("id, full_name, admission_no, class_id, classes(name, section)")
        .eq("user_id", u.user.id)
        .maybeSingle();
      return {
        email: u.user.email ?? null,
        name: (u.user.user_metadata?.full_name as string | undefined) ?? null,
        student: data ?? null,
      };
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const student = me?.student as any;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface shadow-card">
        <div className="mx-auto flex h-full max-w-[1100px] items-center gap-3 px-6">
          <BrandLockup subtitle="Student Portal" />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold">{student?.full_name ?? me?.name ?? "—"}</div>
              <div className="text-[11px] text-muted-foreground">
                {student?.classes?.name
                  ? formatClass(student.classes.name, student.classes.section)
                  : "Student"}
              </div>
            </div>
            <Button asChild variant="ghost" size="icon" aria-label="Security"><Link to="/security"><ShieldCheck className="size-4" /></Link></Button>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 px-6 py-8">
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard">
              <Home className="mr-2 size-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="timetable">
              <CalendarDays className="mr-2 size-4" /> Timetable
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <ClipboardList className="mr-2 size-4" /> Assignments
            </TabsTrigger>
            <TabsTrigger value="quizzes">
              <FileQuestion className="mr-2 size-4" /> Quizzes
            </TabsTrigger>
            <TabsTrigger value="results">
              <GraduationCap className="mr-2 size-4" /> Results
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <Megaphone className="mr-2 size-4" /> Announcements
            </TabsTrigger>
            <TabsTrigger value="books">
              <Wallet className="mr-2 size-4" /> Account Books
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab student={student ?? null} />
          </TabsContent>
          <TabsContent value="timetable">
            <TimetableTab classId={student?.class_id ?? null} />
          </TabsContent>
          <TabsContent value="assignments">
            <AssignmentsTab student={student ?? null} />
          </TabsContent>
          <TabsContent value="quizzes">
            <QuizzesTab student={student ?? null} />
          </TabsContent>
          <TabsContent value="results">
            <ResultsTab student={student ?? null} />
          </TabsContent>
          <TabsContent value="announcements">
            <AnnouncementsTab classId={student?.class_id ?? null} />
          </TabsContent>
          <TabsContent value="books">
            <AccountBooksTab student={student ?? null} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TimetableTab({ classId }: { classId: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-timetable", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, subject, day_of_week, period_no, start_time, end_time, room, teachers(full_name)")
        .eq("class_id", classId!)
        .order("day_of_week")
        .order("period_no");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!classId) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        Your account isn't linked to a student record yet. Please ask the school office.
      </div>
    );
  }
  if (isLoading) {
    return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const slots = (data ?? []) as any[];

  return (
    <div className="space-y-4">
      {DAYS.map((day, idx) => {
        const dayNo = idx + 1;
        const rows = slots.filter((s) => s.day_of_week === dayNo);
        if (rows.length === 0) return null;
        return (
          <div key={day} className="mtis-card p-4">
            <p className="mtis-eyebrow mb-3">{day}</p>
            <ul className="space-y-2">
              {rows.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="grid size-7 place-items-center rounded-md bg-primary-pale text-xs font-semibold text-primary">
                    {s.period_no}
                  </span>
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-sm text-muted-foreground">
                    {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}
                  </span>
                  {s.teachers?.full_name && (
                    <span className="text-sm text-muted-foreground">{s.teachers.full_name}</span>
                  )}
                  {s.room && <Badge variant="secondary">{s.room}</Badge>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {slots.length === 0 && (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
          No timetable published for your class yet.
        </div>
      )}
    </div>
  );
}

function AnnouncementsTab({ classId }: { classId: string | null }) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["portal-announcements", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, audience, class_id, pinned, published_at, created_at")
        .not("published_at", "is", null)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter(
        (a) => a.audience === "all" || (a.audience === "class" && a.class_id === classId),
      );
    },
  });

  if (isLoading) {
    return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const items = data ?? [];
  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((a) => a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s));
  }, [items, search]);

  if (items.length === 0) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        No announcements right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mtis-card p-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search announcements…" className="pl-9" />
        </div>
      </div>
      <ul className="space-y-3">
      {filtered.map((a) => (
        <li key={a.id} className="mtis-card p-4">
          <div className="flex items-start gap-2">
            {a.pinned && <Pin className="mt-1 size-4 text-accent" />}
            <div>
              <h2 className="font-display text-base font-semibold">{a.title}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(a.published_at ?? a.created_at)}
              </p>
            </div>
          </div>
        </li>
      ))}
      </ul>
    </div>
  );
}

/* ── Student Dashboard ────────────────────────────────────────────── */

function DashboardTab({ student }: { student: any | null }) {
  const classId = student?.class_id ?? null;
  const studentId = student?.id ?? null;

  const { data: homework } = useQuery({
    queryKey: ["portal-hw-dash", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework")
        .select("id, title, due_date, subject, max_marks")
        .eq("class_id", classId!)
        .order("due_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: quizzes } = useQuery({
    queryKey: ["portal-qz-dash", classId],
    enabled: !!classId,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, available_from, available_until, duration_minutes")
        .eq("class_id", classId!)
        .eq("status", "published")
        .or(`available_until.is.null,available_until.gt.${now}`)
        .order("available_from", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: announcements } = useQuery({
    queryKey: ["portal-ann-dash", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, pinned, published_at, created_at")
        .not("published_at", "is", null)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []).filter((a: any) => a.audience === "all" || (a.audience === "class" && a.class_id === classId));
    },
  });

  const { data: challans } = useQuery({
    queryKey: ["portal-ch-dash", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_challans")
        .select("id, period, total_due, status")
        .eq("student_id", studentId!)
        .neq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const outstanding = (challans ?? []).reduce((s, c: any) => s + Number(c.total_due), 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="mtis-card p-4">
        <p className="mtis-eyebrow mb-2">Assignments due</p>
        {(homework ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments right now.</p>
        ) : (
          <ul className="space-y-2">
            {(homework ?? []).map((h: any) => (
              <li key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{h.title}</span>
                <span className="text-xs text-muted-foreground">{formatDate(h.due_date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mtis-card p-4">
        <p className="mtis-eyebrow mb-2">Upcoming quizzes</p>
        {(quizzes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No quizzes available.</p>
        ) : (
          <ul className="space-y-2">
            {(quizzes ?? []).map((q: any) => (
              <li key={q.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{q.title}</span>
                <span className="text-xs text-muted-foreground">{q.duration_minutes} min</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mtis-card p-4">
        <p className="mtis-eyebrow mb-2">Recent announcements</p>
        {(announcements ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements.</p>
        ) : (
          <ul className="space-y-2">
            {(announcements ?? []).map((a: any) => (
              <li key={a.id} className="text-sm">
                <div className="flex items-center gap-1">
                  {a.pinned && <Pin className="size-3 text-accent" />}
                  <span className="font-medium text-foreground">{a.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(a.published_at ?? a.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mtis-card p-4">
        <p className="mtis-eyebrow mb-2">Fee status</p>
        {outstanding > 0 ? (
          <p className="text-sm text-destructive">Outstanding balance across {(challans ?? []).length} unpaid challan(s)</p>
        ) : (
          <p className="text-sm text-muted-foreground">No outstanding fees.</p>
        )}
      </div>
    </div>
  );
}

/* ── Student Assignments ──────────────────────────────────────────── */

function AssignmentsTab({ student }: { student: any | null }) {
  const qc = useQueryClient();
  const classId = student?.class_id ?? null;
  const studentId = student?.id ?? null;
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);

  const { data: assignments } = useQuery({
    queryKey: ["portal-hw-all", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework")
        .select("id, title, description, due_date, max_marks, allow_late, max_attempts")
        .eq("class_id", classId!)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["portal-sub-all", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework_submissions")
        .select("id, homework_id, status, marks, remarks, attempt_number")
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const subByHw = new Map<string, any>();
  (submissions ?? []).forEach((s: any) => { if (!subByHw.has(s.homework_id)) subByHw.set(s.homework_id, s); });

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!submitting || !studentId) return;
      const hw = (assignments ?? []).find((h: any) => h.id === submitting);
      if (!hw) return;
      const existing = subByHw.get(submitting);
      const attemptNo = (existing?.attempt_number ?? 0) + 1;
      const isLate = new Date() > new Date(hw.due_date + "T23:59:59");
      if (isLate && !hw.allow_late) throw new Error("Late submissions are not allowed for this assignment");
      if (existing && attemptNo > hw.max_attempts) throw new Error("Maximum attempts reached");

      let fileUrl: string | null = null;
      if (uploadingFile) {
        const { data: u } = await supabase.auth.getUser();
        const ext = uploadingFile.name.split(".").pop() ?? "bin";
        const path = `submissions/${u.user?.id}/${submitting}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("assignments").upload(path, uploadingFile, { upsert: false });
        if (upErr) throw upErr;
        fileUrl = path;
      }

      const { error } = await supabase.from("homework_submissions").insert({
        homework_id: submitting, student_id: studentId,
        submitted_date: new Date().toISOString().slice(0, 10),
        status: isLate ? "late" : "submitted",
        submission_text: text.trim() || null,
        submission_file_url: fileUrl,
        attempt_number: attemptNo,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Submitted!"); setSubmitting(null); setText(""); setUploadingFile(null); qc.invalidateQueries({ queryKey: ["portal-sub-all", studentId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!classId) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Your account isn't linked to a student record yet.</div>;
  if (!assignments?.length) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">No assignments yet.</div>;

  return (
    <div className="space-y-3">
      {(assignments ?? []).map((hw: any) => {
        const sub = subByHw.get(hw.id);
        const isLate = new Date() > new Date(hw.due_date + "T23:59:59");
        const canSubmit = !isLate || hw.allow_late;
        const attemptsUsed = sub?.attempt_number ?? 0;
        const attemptsLeft = hw.max_attempts - attemptsUsed;
        return (
          <div key={hw.id} className="mtis-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-foreground">{hw.title}</p>
                {hw.description && <p className="mt-1 text-sm text-muted-foreground">{hw.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Due {formatDate(hw.due_date)} — {hw.max_marks} marks</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {sub ? (
                  <>
                    <Badge variant={sub.status === "graded" ? "default" : sub.status === "late" ? "destructive" : "secondary"}>{formatStatus(sub.status)}</Badge>
                    {sub.marks != null && <span className="text-sm font-semibold">{sub.marks}/{hw.max_marks}</span>}
                  </>
                ) : (
                  <Badge variant="outline">Not submitted</Badge>
                )}
              </div>
            </div>
            {sub?.remarks && <p className="mt-2 text-sm text-muted-foreground">Teacher feedback: {sub.remarks}</p>}
            {submitting === hw.id ? (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type your answer..." rows={3} />
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".pdf,.doc,.docx,.png,.jpg";
                    inp.onchange = () => { if (inp.files?.[0]) setUploadingFile(inp.files[0]); }; inp.click();
                  }}>Attach file</Button>
                  {uploadingFile && <span className="text-xs text-muted-foreground">{uploadingFile.name}</span>}
                  <Button size="sm" onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>Submit</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setSubmitting(null); setText(""); setUploadingFile(null); }}>Cancel</Button>
                </div>
              </div>
            ) : canSubmit && attemptsLeft > 0 ? (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setSubmitting(hw.id)}>
                {sub ? "Resubmit" : "Submit assignment"}
              </Button>
            ) : (
              <p className="mt-2 text-xs text-destructive">
                {!canSubmit ? "Submission closed - late submissions not allowed" : "Maximum attempts reached"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Student Quizzes ──────────────────────────────────────────────── */

function QuizzesTab({ student }: { student: any | null }) {
  const classId = student?.class_id ?? null;
  const studentId = student?.id ?? null;
  const [taking, setTaking] = useState<string | null>(null);

  const { data: quizzes } = useQuery({
    queryKey: ["portal-qz-all", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, description, duration_minutes, available_from, available_until, total_marks")
        .eq("class_id", classId!)
        .in("status", ["published", "closed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["portal-att-all", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, status, score, max_score")
        .eq("student_id", studentId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const attemptByQuiz = new Map<string, any>();
  (attempts ?? []).forEach((a: any) => { if (!attemptByQuiz.has(a.quiz_id)) attemptByQuiz.set(a.quiz_id, a); });

  if (taking) return <TakeQuiz quizId={taking} studentId={studentId!} onExit={() => setTaking(null)} />;
  if (!classId) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Your account isn't linked to a student record yet.</div>;
  if (!quizzes?.length) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">No quizzes available.</div>;

  const now = new Date();
  return (
    <div className="space-y-3">
      {(quizzes ?? []).map((q: any) => {
        const att = attemptByQuiz.get(q.id);
        const available = (!q.available_from || new Date(q.available_from) <= now) && (!q.available_until || new Date(q.available_until) >= now);
        return (
          <div key={q.id} className="mtis-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-foreground">{q.title}</p>
                {q.description && <p className="mt-1 text-sm text-muted-foreground">{q.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{q.duration_minutes} min - {q.total_marks ?? "?"} marks</p>
              </div>
              <div>
                {att ? (
                  <div className="text-right">
                    <Badge variant={att.status === "graded" ? "default" : "secondary"}>{formatStatus(att.status)}</Badge>
                    {att.score != null && <p className="mt-1 text-sm font-semibold">{att.score}/{att.max_score}</p>}
                  </div>
                ) : available ? (
                  <Button size="sm" onClick={() => setTaking(q.id)}>Start quiz</Button>
                ) : (
                  <Badge variant="outline">Not yet available</Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TakeQuiz({ quizId, studentId, onExit }: { quizId: string; studentId: string; onExit: () => void }) {
  const qc = useQueryClient();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { option?: string; text?: string }>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: quiz } = useQuery({
    queryKey: ["take-quiz-meta", quizId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("id, title, duration_minutes").eq("id", quizId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["take-quiz-qs", quizId],
    enabled: !!attemptId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id, question_bank_id, order_index, question_bank(id, question_text, question_type, options, marks)")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    (async () => {
      const { data: existing } = await supabase
        .from("quiz_attempts")
        .select("id, status")
        .eq("quiz_id", quizId).eq("student_id", studentId)
        .maybeSingle();
      if (existing && existing.status !== "in_progress") { setSubmitted(true); return; }
      if (existing) { setAttemptId(existing.id); return; }
      const { data, error } = await supabase
        .from("quiz_attempts")
        .insert({ quiz_id: quizId, student_id: studentId, status: "in_progress" })
        .select("id").single();
      if (error) { toast.error(error.message); onExit(); return; }
      setAttemptId(data.id);
    })();
  }, [quizId, studentId, onExit]);

  useEffect(() => {
    if (!quiz?.duration_minutes || !attemptId || submitted) return;
    const endTime = Date.now() + quiz.duration_minutes * 60 * 1000;
    const update = () => {
      const left = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) doSubmit(true);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [quiz, attemptId, submitted]);

  async function doSubmit(auto: boolean) {
    if (!attemptId || submitted) return;
    setSubmitted(true);
    const qs = questions ?? [];
    const answerRows = qs.map((q: any) => ({
      attempt_id: attemptId,
      question_id: q.question_bank_id,
      selected_option_id: answers[q.question_bank_id]?.option ?? null,
      answer_text: answers[q.question_bank_id]?.text ?? null,
    }));
    if (answerRows.length) {
      await supabase.from("quiz_attempt_answers").upsert(answerRows, { onConflict: "attempt_id,question_id" });
    }
    const { data: res, error } = await supabase.rpc("submit_quiz_attempt", { p_attempt_id: attemptId });
    if (error) { toast.error(error.message); return; }
    setResult(res);
    qc.invalidateQueries({ queryKey: ["portal-att-all", studentId] });
  }

  if (submitted) {
    return (
      <div className="mtis-card p-6 text-center">
        <p className="font-display text-lg font-bold">{result ? "Quiz submitted!" : "Quiz already submitted"}</p>
        {result?.score != null && <p className="mt-2 text-2xl font-bold text-primary">{result.score}/{result.max_score}</p>}
        {result?.auto_submitted && <p className="mt-1 text-sm text-muted-foreground">Time was up - auto-submitted</p>}
        <Button className="mt-4" variant="outline" onClick={onExit}>Back to quizzes</Button>
      </div>
    );
  }

  if (!attemptId || !questions) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading quiz...</div>;
  const mins = secondsLeft != null ? Math.floor(secondsLeft / 60) : 0;
  const secs = secondsLeft != null ? secondsLeft % 60 : 0;

  return (
    <div className="space-y-4">
      <div className="mtis-card flex items-center justify-between p-4">
        <p className="font-display font-semibold">{quiz?.title}</p>
        <div className={`text-lg font-bold tabular-nums ${secondsLeft != null && secondsLeft < 60 ? "text-destructive" : "text-foreground"}`}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </div>
      <div className="space-y-3">
        {questions.map((q: any, i: number) => {
          const qb = q.question_bank;
          const a = answers[qb.id] ?? {};
          return (
            <div key={q.id} className="mtis-card p-4">
              <p className="font-medium text-foreground">{i + 1}. {qb.question_text} <span className="text-xs text-muted-foreground">({qb.marks} marks)</span></p>
              {qb.question_type === "mcq" && Array.isArray(qb.options) && (
                <div className="mt-3 space-y-1.5">
                  {(qb.options as { id: string; text: string }[]).map((opt, j) => (
                    <button key={opt.id} type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [qb.id]: { ...prev[qb.id], option: opt.id } }))}
                      className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${a.option === opt.id ? "border-primary bg-primary-pale" : "border-border hover:bg-muted"}`}>
                      <span className="grid size-5 shrink-0 place-items-center rounded-full border text-xs font-semibold">{String.fromCharCode(65 + j)}</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}
              {(qb.question_type === "short_answer" || qb.question_type === "long_answer") && (
                <Textarea className="mt-3" rows={qb.question_type === "long_answer" ? 5 : 2}
                  value={a.text ?? ""} onChange={e => setAnswers(prev => ({ ...prev, [qb.id]: { ...prev[qb.id], text: e.target.value } }))}
                  placeholder="Your answer..." />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => { if (confirm("Leave quiz? Your answers won't be saved.")) onExit(); }}>Cancel</Button>
        <Button onClick={() => doSubmit(false)}>Submit quiz</Button>
      </div>
    </div>
  );
}

/* ── Student Results ──────────────────────────────────────────────── */

function ResultsTab({ student }: { student: any | null }) {
  const studentId = student?.id ?? null;

  const { data: hwResults } = useQuery({
    queryKey: ["results-hw", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework_submissions")
        .select("id, status, marks, remarks, homework(title, max_marks, subject)")
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: quizResults } = useQuery({
    queryKey: ["results-qz", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, status, score, max_score, quizzes(title, subject)")
        .eq("student_id", studentId!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: examResults } = useQuery({
    queryKey: ["results-ex", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("id, marks_obtained, is_absent, remarks, exams(title, total_marks, subject)")
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const bySubject = new Map<string, { hw: any[]; quizzes: any[]; exams: any[] }>();
  function addToSubject(subject: string, kind: "hw" | "quizzes" | "exams", item: any) {
    if (!bySubject.has(subject)) bySubject.set(subject, { hw: [], quizzes: [], exams: [] });
    bySubject.get(subject)![kind].push(item);
  }
  (hwResults ?? []).forEach((s: any) => { if (s.homework?.subject) addToSubject(s.homework.subject, "hw", s); });
  (quizResults ?? []).forEach((a: any) => { if (a.quizzes?.subject) addToSubject(a.quizzes.subject, "quizzes", a); });
  (examResults ?? []).forEach((e: any) => { if (e.exams?.subject) addToSubject(e.exams.subject, "exams", e); });

  if (!studentId) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Your account isn't linked to a student record yet.</div>;
  if (bySubject.size === 0) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">No results available yet.</div>;

  return (
    <div className="space-y-4">
      {Array.from(bySubject.entries()).map(([subject, data]) => (
        <div key={subject} className="mtis-card p-4">
          <p className="font-display text-sm font-semibold text-primary">{subject}</p>
          <div className="mt-3 space-y-3">
            {data.exams.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exams</p>
                <ul className="mt-1 space-y-1">
                  {data.exams.map((e: any) => (
                    <li key={e.id} className="flex justify-between text-sm">
                      <span className="text-foreground">{e.exams.title}</span>
                      <span className="text-muted-foreground">{e.is_absent ? "Absent" : `${e.marks_obtained ?? "--"}/${e.exams.total_marks ?? "?"}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.hw.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignments</p>
                <ul className="mt-1 space-y-1">
                  {data.hw.map((s: any) => (
                    <li key={s.id} className="flex justify-between text-sm">
                      <span className="text-foreground">{s.homework.title}</span>
                      <span className="text-muted-foreground">{s.marks != null ? `${s.marks}/${s.homework.max_marks}` : formatStatus(s.status)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.quizzes.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quizzes</p>
                <ul className="mt-1 space-y-1">
                  {data.quizzes.map((a: any) => (
                    <li key={a.id} className="flex justify-between text-sm">
                      <span className="text-foreground">{a.quizzes.title}</span>
                      <span className="text-muted-foreground">{a.score != null ? `${a.score}/${a.max_score}` : formatStatus(a.status)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

type ChallanLine = { name: string; amount: number };
type PortalChallan = {
  id: string;
  period: string;
  constituent_breakdown: ChallanLine[];
  subtotal: number;
  discount_applied: number;
  total_due: number;
  status: "unpaid" | "pending_review" | "approved" | "rejected";
  uploaded_proof_url: string | null;
  rejection_reason: string | null;
  created_at: string;
};

function statusTone(s: PortalChallan["status"]) {
  if (s === "approved") return "default" as const;
  if (s === "rejected") return "destructive" as const;
  if (s === "pending_review") return "secondary" as const;
  return "outline" as const;
}

function AccountBooksTab({ student }: { student: any | null }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [target, setTarget] = useState<PortalChallan | null>(null);

  const { branding } = useBranding();
  const brand = docBrand(branding);
  const currency = branding?.currency ?? "PKR";

  const { data, isLoading } = useQuery({
    queryKey: ["portal-challans", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_challans")
        .select(
          "id, period, constituent_breakdown, subtotal, discount_applied, total_due, status, uploaded_proof_url, rejection_reason, created_at",
        )
        .eq("student_id", student.id)
        .order("period", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PortalChallan[];
    },
  });

  const upload = useMutation({
    mutationFn: async ({ challan, file }: { challan: PortalChallan; file: File }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${u.user.id}/${challan.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("fee_challans")
        .update({ uploaded_proof_url: path, status: "pending_review", rejection_reason: null })
        .eq("id", challan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment proof uploaded — awaiting review");
      qc.invalidateQueries({ queryKey: ["portal-challans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function download(c: PortalChallan) {
    downloadPdf({
      brand,
      filename: `challan-${student?.admission_no ?? c.id}-${c.period}.pdf`,
      docs: [
        {
          title: "Fee Challan",
          subtitle: `Billing period ${formatPeriod(c.period)}`,
          meta: [
            { label: "Student", value: student?.full_name ?? "—" },
            { label: "Admission no", value: student?.admission_no ?? "—" },
            {
              label: "Class",
              value: student?.classes
                ? formatClass(student.classes.name, student.classes.section)
                : "—",
            },
            { label: "Status", value: formatStatus(c.status) },
          ],
          tables: [
            {
              head: ["Fee constituent", "Amount"],
              rows: (c.constituent_breakdown ?? []).map((l) => [l.name, money(l.amount, currency)]),
              empty: "No fee constituents.",
              totals: [
                { label: "Subtotal", value: money(c.subtotal, currency) },
                { label: "Discount", value: `- ${money(c.discount_applied, currency)}` },
                { label: "Total payable", value: money(c.total_due, currency), strong: true },
              ],
            },
          ],
          footnote: "Please attach the deposit slip when uploading your payment proof.",
        },
      ],
    }).catch((e: Error) => toast.error(e.message));
  }

  if (!student?.id) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        Your account isn't linked to a student record yet. Please ask the school office.
      </div>
    );
  }
  if (isLoading) {
    return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const rows = data ?? [];
  const outstanding = rows
    .filter((r) => r.status !== "approved")
    .reduce((sum, r) => sum + Number(r.total_due), 0);

  if (rows.length === 0) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        No fee challans issued yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && target) upload.mutate({ challan: target, file });
          setTarget(null);
        }}
      />

      <div className="mtis-card flex items-center justify-between p-4">
        <div>
          <p className="mtis-eyebrow">Outstanding balance</p>
          <p className="mt-1 font-display text-xl font-bold">{money(outstanding, currency)}</p>
        </div>
        <p className="text-xs text-muted-foreground">{rows.length} challan(s)</p>
      </div>

      <ul className="space-y-3">
        {rows.map((c) => (
          <li key={c.id} className="mtis-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-semibold">{formatPeriod(c.period)}</h2>
                  <Badge variant={statusTone(c.status)}>{formatStatus(c.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {money(c.total_due, currency)} payable
                  {Number(c.discount_applied) > 0
                    ? ` · ${money(c.discount_applied, currency)} discount applied`
                    : ""}
                </p>
                {c.status === "rejected" && c.rejection_reason && (
                  <p className="mt-1 text-sm text-destructive">Rejected: {c.rejection_reason}</p>
                )}
                {c.status === "pending_review" && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Proof uploaded — waiting for the school office to verify.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => download(c)}>
                  <Download className="mr-2 size-4" /> Challan
                </Button>
                {c.status !== "approved" && (
                  <Button
                    size="sm"
                    disabled={upload.isPending}
                    onClick={() => {
                      setTarget(c);
                      fileRef.current?.click();
                    }}
                  >
                    <Upload className="mr-2 size-4" />
                    {c.uploaded_proof_url ? "Replace proof" : "Upload proof"}
                  </Button>
                )}
              </div>
            </div>
            <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
              {(c.constituent_breakdown ?? []).map((l, i) => (
                <li key={i} className="flex justify-between">
                  <span>{l.name}</span>
                  <span>{money(l.amount, currency)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
