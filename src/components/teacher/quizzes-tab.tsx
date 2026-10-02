import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Clock, BarChart3, Eye, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

type Quiz = {
  id: string; title: string; description: string | null; duration_minutes: number;
  available_from: string | null; available_until: string | null; status: string;
  total_marks: number | null; shuffle_questions: boolean;
};

type Attempt = {
  id: string; student_id: string; status: string; score: number | null;
  max_score: number | null; submitted_at: string | null;
  students: { full_name: string; admission_no: string } | null;
};

export function QuizzesTab({ classId, subject }: { classId: string; subject: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [reviewing, setReviewing] = useState<Quiz | null>(null);

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["quizzes", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("class_id", classId)
        .eq("subject", subject)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quiz[];
    },
  });

  const publishMut = useMutation({
    mutationFn: async (quizId: string) => {
      const { data: qs } = await supabase.from("quiz_questions").select("id").eq("quiz_id", quizId);
      if (!qs?.length) throw new Error("Add questions before publishing");
      const { error } = await supabase.from("quizzes").update({ status: "published" }).eq("id", quizId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Quiz published"); qc.invalidateQueries({ queryKey: ["quizzes", classId, subject] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMut = useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase.from("quizzes").update({ status: "closed" }).eq("id", quizId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Quiz closed"); qc.invalidateQueries({ queryKey: ["quizzes", classId, subject] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Quiz deleted"); qc.invalidateQueries({ queryKey: ["quizzes", classId, subject] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = quizzes ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 size-4" /> New quiz</Button>
      </div>

      {isLoading ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : list.length === 0 ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">No quizzes yet.</div>
      ) : (
        <div className="space-y-2">
          {list.map((q) => (
            <div key={q.id} className="mtis-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{q.title}</p>
                    <Badge variant="outline" className="capitalize">{q.status}</Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> {q.duration_minutes} min
                    {q.available_from && <> · From {formatDateTime(q.available_from)}</>}
                    {q.available_until && <> · Until {formatDateTime(q.available_until)}</>}
                  </p>
                  {q.total_marks != null && <p className="text-xs text-muted-foreground">{q.total_marks} total marks</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => setReviewing(q)}>
                    <BarChart3 className="mr-1 size-3.5" /> Attempts
                  </Button>
                  {q.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => publishMut.mutate(q.id)}>Publish</Button>
                  )}
                  {q.status === "published" && (
                    <Button size="sm" variant="outline" onClick={() => closeMut.mutate(q.id)}>Close</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete quiz?")) deleteMut.mutate(q.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <QuizDialog classId={classId} subject={subject} onClose={() => setShowForm(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["quizzes", classId, subject] })} />
      )}

      {reviewing && (
        <AttemptsDialog quiz={reviewing} onClose={() => setReviewing(null)} />
      )}
    </div>
  );
}

function QuizDialog({ classId, subject, onClose, onSaved }: {
  classId: string; subject: string; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [shuffle, setShuffle] = useState(true);
  const [selectedQs, setSelectedQs] = useState<string[]>([]);

  const { data: questions } = useQuery({
    queryKey: ["question-bank", classId, subject],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("question_bank")
        .select("id, question_text, question_type, marks, difficulty")
        .eq("class_id", classId).eq("subject", subject)
        .or(`created_by.eq.${u.user?.id},is_shared.eq.true`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      if (selectedQs.length === 0) throw new Error("Select at least one question");
      const { data: u } = await supabase.auth.getUser();
      const total = (questions ?? []).filter(q => selectedQs.includes(q.id)).reduce((s, q) => s + Number(q.marks), 0);
      const { data: quiz, error: qErr } = await supabase.from("quizzes").insert({
        class_id: classId, subject, title: title.trim(), description: description || null,
        duration_minutes: duration, total_marks: total,
        available_from: availableFrom || null, available_until: availableUntil || null,
        shuffle_questions: shuffle, status: "draft", created_by: u.user?.id,
      }).select("id").single();
      if (qErr) throw qErr;
      const { error: qqErr } = await supabase.from("quiz_questions").insert(
        selectedQs.map((qid, i) => ({ quiz_id: quiz!.id, question_bank_id: qid, order_index: i })),
      );
      if (qqErr) throw qqErr;
    },
    onSuccess: () => { toast.success("Quiz created as draft"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const qs = questions ?? [];
  const totalMarks = qs.filter(q => selectedQs.includes(q.id)).reduce((s, q) => s + Number(q.marks), 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New quiz</DialogTitle>
          <DialogDescription>Build a quiz from your question bank. Starts as draft — publish when ready.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 5 Quiz" /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Duration (min)</label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Available from</label><Input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Available until</label><Input type="datetime-local" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={shuffle} onCheckedChange={setShuffle} />
            <span className="text-sm">Shuffle question order</span>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Questions ({selectedQs.length} selected, {totalMarks} marks)</label>
            </div>
            <ScrollArea className="h-48 rounded-md border border-border">
              <ul className="divide-y divide-border">
                {qs.map((q) => {
                  const sel = selectedQs.includes(q.id);
                  return (
                    <li key={q.id}>
                      <button type="button" onClick={() => setSelectedQs(prev => prev.includes(q.id) ? prev.filter(x => x !== q.id) : [...prev, q.id])}
                        className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${sel ? "bg-primary-pale" : "hover:bg-muted"}`}>
                        <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border text-[10px] ${sel ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                          {sel ? "✓" : ""}
                        </span>
                        <div className="flex-1">
                          <p className="text-foreground">{q.question_text}</p>
                          <div className="mt-0.5 flex gap-2 text-[10px] text-muted-foreground">
                            <span className="capitalize">{q.question_type.replace("_", " ")}</span>
                            <span>{q.marks} marks</span>
                            <span className="capitalize">{q.difficulty}</span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {qs.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted-foreground">No questions in your bank yet. Add some first.</li>}
              </ul>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Create quiz (draft)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttemptsDialog({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [gradeMarks, setGradeMarks] = useState<Record<string, string>>({});

  const { data: attempts } = useQuery({
    queryKey: ["quiz-attempts", quiz.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, student_id, status, score, max_score, submitted_at, students(full_name, admission_no)")
        .eq("quiz_id", quiz.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
  });

  const gradeMut = useMutation({
    mutationFn: async ({ answerId, marks }: { answerId: string; marks: number }) => {
      const { error } = await supabase
        .from("quiz_attempt_answers")
        .update({ marks_awarded: marks, is_correct: marks > 0 })
        .eq("id", answerId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Answer graded"); qc.invalidateQueries({ queryKey: ["quiz-attempt-answers", expanded] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const scores = (attempts ?? []).filter(a => a.score != null).map(a => Number(a.score));
  const avg = scores.length ? (scores.reduce((s, x) => s + x, 0) / scores.length).toFixed(1) : "—";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{quiz.title} — Attempts & Stats</DialogTitle>
          <DialogDescription>
            {attempts?.length ?? 0} attempt(s) · Average score: {avg}/{attempts?.[0]?.max_score ?? "?"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {(attempts ?? []).map((a) => (
              <div key={a.id} className="rounded-md border border-border p-3">
                <button className="flex w-full items-center justify-between" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                  <div className="flex items-center gap-2">
                    {expanded === a.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="text-sm font-medium">{a.students?.full_name ?? "—"}</span>
                    <Badge variant="outline" className="capitalize">{a.status.replace("_", " ")}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{a.score ?? "—"}/{a.max_score ?? "?"}</span>
                </button>
                {expanded === a.id && <AttemptDetail attemptId={a.id} gradeMut={gradeMut} gradeMarks={gradeMarks} setGradeMarks={setGradeMarks} />}
              </div>
            ))}
            {(!attempts || attempts.length === 0) && (
              <p className="py-6 text-center text-sm text-muted-foreground">No attempts yet.</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttemptDetail({ attemptId, gradeMut, gradeMarks, setGradeMarks }: {
  attemptId: string;
  gradeMut: any;
  gradeMarks: Record<string, string>;
  setGradeMarks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const { data: answers } = useQuery({
    queryKey: ["quiz-attempt-answers", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempt_answers")
        .select("id, question_id, selected_option_id, answer_text, is_correct, marks_awarded, question_bank(question_text, question_type, options, correct_option_id, marks)")
        .eq("attempt_id", attemptId);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {(answers ?? []).map((a: any) => {
        const qb = a.question_bank;
        const needsGrading = qb?.question_type !== "mcq" && a.marks_awarded === null;
        return (
          <div key={a.id} className="rounded border border-border p-2 text-xs">
            <p className="font-medium text-foreground">{qb?.question_text}</p>
            <p className="mt-1 text-muted-foreground">Type: {qb?.question_type?.replace("_", " ")}</p>
            {qb?.question_type === "mcq" ? (
              <p className={a.is_correct ? "text-success" : "text-destructive"}>
                {a.is_correct ? "Correct" : "Incorrect"} — {a.marks_awarded}/{qb?.marks} marks
              </p>
            ) : (
              <div>
                <p className="mt-1 text-muted-foreground">Answer: {a.answer_text || "—"}</p>
                {needsGrading ? (
                  <div className="mt-1 flex items-center gap-1">
                    <Input type="number" max={qb?.marks} min={0} placeholder="Marks" className="w-20"
                      value={gradeMarks[a.id] ?? ""}
                      onChange={(e) => setGradeMarks(prev => ({ ...prev, [a.id]: e.target.value }))} />
                    <Button size="sm" onClick={() => gradeMut.mutate({ answerId: a.id, marks: parseFloat(gradeMarks[a.id] ?? "0") })}>Grade</Button>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">Graded: {a.marks_awarded}/{qb?.marks}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
