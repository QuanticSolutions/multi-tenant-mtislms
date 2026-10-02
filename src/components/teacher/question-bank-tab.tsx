import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Edit3 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

type QType = "mcq" | "short_answer" | "long_answer";
type Difficulty = "easy" | "medium" | "hard";
type Option = { id: string; text: string };

type Question = {
  id: string; question_type: QType; question_text: string; options: any;
  correct_option_id: string | null; marks: number; difficulty: Difficulty;
  tags: string[]; is_shared: boolean;
};

export function QuestionBankTab({ classId, subject }: { classId: string; subject: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);

  const { data: questions, isLoading } = useQuery({
    queryKey: ["question-bank", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("question_bank")
        .select("*")
        .eq("class_id", classId)
        .eq("subject", subject)
        .or(`created_by.eq.${u.user?.id},is_shared.eq.true`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("question_bank").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Question deleted"); qc.invalidateQueries({ queryKey: ["question-bank", classId, subject] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = questions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="mr-2 size-4" /> New question</Button>
      </div>

      {isLoading ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : list.length === 0 ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">No questions yet. Build your question bank to create quizzes and papers.</div>
      ) : (
        <div className="space-y-2">
          {list.map((q) => (
            <div key={q.id} className="mtis-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{q.question_type.replace("_", " ")}</Badge>
                    <Badge variant="secondary" className="capitalize">{q.difficulty}</Badge>
                    <span className="text-xs text-muted-foreground">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                    {q.is_shared && <Badge variant="outline" className="bg-primary-pale text-primary">Shared</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-foreground">{q.question_text}</p>
                  {q.question_type === "mcq" && Array.isArray(q.options) && (
                    <ul className="mt-2 space-y-1">
                      {(q.options as Option[]).map((o) => (
                        <li key={o.id} className={`text-xs ${o.id === q.correct_option_id ? "font-semibold text-success" : "text-muted-foreground"}`}>
                          {o.id === q.correct_option_id ? "✓" : "·"} {o.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.tags?.length > 0 && (
                    <div className="mt-2 flex gap-1">{q.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(q); setShowForm(true); }}><Edit3 className="size-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete question?")) deleteMut.mutate(q.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <QuestionDialog
          classId={classId}
          subject={subject}
          question={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => qc.invalidateQueries({ queryKey: ["question-bank", classId, subject] })}
        />
      )}
    </div>
  );
}

function QuestionDialog({ classId, subject, question, onClose, onSaved }: {
  classId: string; subject: string; question: Question | null; onClose: () => void; onSaved: () => void;
}) {
  const [type, setType] = useState<QType>(question?.question_type ?? "mcq");
  const [text, setText] = useState(question?.question_text ?? "");
  const [options, setOptions] = useState<Option[]>(
    question?.options && Array.isArray(question.options)
      ? question.options
      : [{ id: "a", text: "" }, { id: "b", text: "" }, { id: "c", text: "" }, { id: "d", text: "" }],
  );
  const [correctId, setCorrectId] = useState(question?.correct_option_id ?? "a");
  const [marks, setMarks] = useState(question?.marks ?? 1);
  const [difficulty, setDifficulty] = useState<Difficulty>(question?.difficulty ?? "medium");
  const [tagsStr, setTagsStr] = useState((question?.tags ?? []).join(", "));
  const [isShared, setIsShared] = useState(question?.is_shared ?? false);

  const save = useMutation({
    mutationFn: async () => {
      if (!text.trim()) throw new Error("Question text is required");
      const payload = {
        class_id: classId, subject, question_type: type, question_text: text.trim(),
        options: type === "mcq" ? options.filter(o => o.text.trim()) : null,
        correct_option_id: type === "mcq" ? correctId : null,
        marks, difficulty, tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean),
        is_shared: isShared,
      };
      if (question) {
        const { error } = await supabase.from("question_bank").update(payload).eq("id", question.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("question_bank").insert({ ...payload, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Question saved"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{question ? "Edit question" : "New question"}</DialogTitle>
          <DialogDescription>Add a reusable question to your bank.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as QType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple choice</SelectItem>
                  <SelectItem value="short_answer">Short answer</SelectItem>
                  <SelectItem value="long_answer">Long answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Difficulty</label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Question text *</label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} />
          </div>
          {type === "mcq" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Options (click to mark correct)</label>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <button type="button" onClick={() => setCorrectId(o.id)}
                      className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${correctId === o.id ? "border-success bg-success-soft text-success" : "border-border text-muted-foreground"}`}>
                      {String.fromCharCode(65 + i)}
                    </button>
                    <Input value={o.text} onChange={(e) => { const n = [...options]; n[i] = { ...n[i], text: e.target.value }; setOptions(n); }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                    {options.length > 2 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setOptions(options.filter((_, k) => k !== i))}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setOptions([...options, { id: String.fromCharCode(97 + options.length), text: "" }])}>
                    <Plus className="mr-1 size-3.5" /> Add option
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Marks</label><Input type="number" step="0.5" min={0.5} value={marks} onChange={(e) => setMarks(Number(e.target.value))} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Tags (comma-separated)</label><Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="algebra, equations" /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isShared} onCheckedChange={setIsShared} />
            <span className="text-sm">Share with other teachers of this subject</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save question</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
