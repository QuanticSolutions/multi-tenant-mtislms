import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, Download, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";
import { docBrand } from "@/lib/print";
import { downloadPdf } from "@/lib/pdf";

type QType = "mcq" | "short_answer" | "long_answer";
type Difficulty = "easy" | "medium" | "hard";

type QBRow = {
  id: string; question_text: string; question_type: QType; options: any;
  correct_option_id: string | null; marks: number; difficulty: Difficulty; tags: string[];
};

export function PaperGenTab({ classId, subject }: { classId: string; subject: string }) {
  const qc = useQueryClient();
  const { branding } = useBranding();
  const brand = docBrand(branding);

  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [autoTarget, setAutoTarget] = useState<number>(50);
  const [autoMix, setAutoMix] = useState({ easy: 40, medium: 40, hard: 20 });

  const { data: questions } = useQuery({
    queryKey: ["question-bank", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("question_bank")
        .select("id, question_text, question_type, options, correct_option_id, marks, difficulty, tags")
        .eq("class_id", classId).eq("subject", subject)
        .or(`created_by.eq.${u.user?.id},is_shared.eq.true`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as QBRow[];
    },
  });

  const { data: classInfo } = useQuery({
    queryKey: ["class-info", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("name, section").eq("id", classId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const qs = questions ?? [];
  const filtered = filterDifficulty === "all" ? qs : qs.filter(q => q.difficulty === filterDifficulty);
  const selectedQs = selected.map(id => qs.find(q => q.id === id)).filter(Boolean) as QBRow[];
  const totalMarks = selectedQs.reduce((s, q) => s + Number(q.marks), 0);

  function autoSelect() {
    const pool = filterDifficulty === "all" ? qs : filtered;
    const easy = pool.filter(q => q.difficulty === "easy");
    const medium = pool.filter(q => q.difficulty === "medium");
    const hard = pool.filter(q => q.difficulty === "hard");
    const picked: QBRow[] = [];
    let remaining = autoTarget;
    const easyBudget = Math.round(autoTarget * autoMix.easy / 100);
    const medBudget = Math.round(autoTarget * autoMix.medium / 100);
    const hardBudget = autoTarget - easyBudget - medBudget;
    for (const [group, budget] of [[easy, easyBudget], [medium, medBudget], [hard, hardBudget]] as [QBRow[], number][]) {
      let groupMarks = 0;
      for (const q of group.sort(() => Math.random() - 0.5)) {
        if (groupMarks + Number(q.marks) <= budget) { picked.push(q); groupMarks += Number(q.marks); }
      }
      remaining -= groupMarks;
    }
    setSelected(picked.map(q => q.id));
    toast.success(`Selected ${picked.length} questions totaling ${picked.reduce((s, q) => s + Number(q.marks), 0)} marks`);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Give the paper a title");
      if (selectedQs.length === 0) throw new Error("Select at least one question");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("generated_papers").insert({
        created_by: u.user?.id, class_id: classId, subject,
        title: title.trim(), question_ids: selected, total_marks: totalMarks,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Paper saved"); qc.invalidateQueries({ queryKey: ["generated-papers", classId, subject] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function generatePdf() {
    if (selectedQs.length === 0) { toast.error("Select questions first"); return; }
    const docTitle = title.trim() || `${subject} Test`;
    const className = classInfo ? `${classInfo.name}${classInfo.section ? ` — ${classInfo.section}` : ""}` : "";

    const questionRows: string[][] = selectedQs.map((q, i) => {
      let cell = `${i + 1}. ${q.question_text}`;
      if (q.question_type === "mcq" && Array.isArray(q.options)) {
        const opts = (q.options as { id: string; text: string }[]).map((o, j) =>
          `   ${String.fromCharCode(65 + j)}) ${o.text}`,
        ).join("\n");
        cell += `\n${opts}`;
      } else if (q.question_type === "short_answer") {
        cell += "\n\n_____________________________________________";
      } else {
        cell += "\n\n_______________________________________________________________________\n_______________________________________________________________________";
      }
      return [cell, `${q.marks}`];
    });

    downloadPdf({
      brand,
      filename: `${docTitle.replace(/\s+/g, "-")}.pdf`,
      docs: [{
        title: docTitle,
        subtitle: `${subject} · ${className}`,
        meta: [
          { label: "Subject", value: subject },
          { label: "Class", value: className },
          { label: "Total marks", value: String(totalMarks) },
          { label: "Questions", value: String(selectedQs.length) },
        ],
        tables: [{
          head: ["Question", "Marks"],
          rows: questionRows,
        }],
        notes: "Instructions: Read each question carefully. Write your answers in the space provided.",
        footnote: "This is a computer generated exam paper.",
      }],
    }).catch((e: Error) => toast.error(e.message));
  }

  function moveQ(idx: number, dir: -1 | 1) {
    const newSel = [...selected];
    const swap = idx + dir;
    if (swap < 0 || swap >= newSel.length) return;
    [newSel[idx], newSel[swap]] = [newSel[swap], newSel[idx]];
    setSelected(newSel);
  }

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Paper title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mid-term Examination" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Filter by difficulty</label>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Target marks</label>
            <Input type="number" value={autoTarget} onChange={(e) => setAutoTarget(Number(e.target.value))} className="w-24" />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Easy %{autoMix.easy} · Medium %{autoMix.medium} · Hard %{autoMix.hard}
          </div>
          <Button variant="outline" size="sm" onClick={autoSelect}>Auto-select</Button>
          <Button variant="outline" size="sm" onClick={() => setSelected([])}>Clear</Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="mtis-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available questions ({filtered.length})</p>
          <ScrollArea className="h-72 rounded-md border border-border">
            <ul className="divide-y divide-border">
              {filtered.map((q) => {
                const sel = selected.includes(q.id);
                return (
                  <li key={q.id}>
                    <button type="button" onClick={() => setSelected(prev => sel ? prev.filter(x => x !== q.id) : [...prev, q.id])}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${sel ? "bg-primary-pale opacity-50" : "hover:bg-muted"}`}>
                      <span className="flex-1">{q.question_text}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{q.marks}m</Badge>
                      <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">{q.difficulty}</Badge>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted-foreground">No questions available.</li>}
            </ul>
          </ScrollArea>
        </div>

        <div className="mtis-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected ({selectedQs.length}, {totalMarks} marks)</p>
          </div>
          <ScrollArea className="h-72 rounded-md border border-border">
            <ol className="list-decimal space-y-1 p-3 text-sm">
              {selectedQs.map((q, i) => (
                <li key={q.id} className="flex items-start gap-1">
                  <span className="flex-1">{q.question_text} <span className="text-xs text-muted-foreground">({q.marks}m)</span></span>
                  <Button size="icon" variant="ghost" className="size-6" onClick={() => moveQ(i, -1)}><ArrowUp className="size-3" /></Button>
                  <Button size="icon" variant="ghost" className="size-6" onClick={() => moveQ(i, 1)}><ArrowDown className="size-3" /></Button>
                  <Button size="icon" variant="ghost" className="size-6" onClick={() => setSelected(prev => prev.filter(x => x !== q.id))}><Trash2 className="size-3 text-destructive" /></Button>
                </li>
              ))}
              {selectedQs.length === 0 && <li className="list-none text-center text-xs text-muted-foreground">No questions selected.</li>}
            </ol>
          </ScrollArea>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Save paper</Button>
        <Button onClick={generatePdf}><Download className="mr-2 size-4" /> Generate PDF</Button>
      </div>

      <SavedPapers classId={classId} subject={subject} brand={brand} classInfo={classInfo} />
    </div>
  );
}

function SavedPapers({ classId, subject, brand, classInfo }: { classId: string; subject: string; brand: any; classInfo: any }) {
  const { data: papers } = useQuery({
    queryKey: ["generated-papers", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_papers")
        .select("id, title, question_ids, total_marks, created_at")
        .eq("class_id", classId).eq("subject", subject)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function downloadPaper(p: any) {
    const qIds = p.question_ids ?? [];
    if (!qIds.length) { toast.error("No questions in this paper"); return; }
    supabase.from("question_bank").select("id, question_text, question_type, options, marks").in("id", qIds).then(({ data }) => {
      if (!data) return;
      const ordered = qIds.map((id: string) => data.find(q => q.id === id)).filter(Boolean) as any[];
      const questionRows: string[][] = ordered.map((q, i) => {
        let cell = `${i + 1}. ${q.question_text}`;
        if (q.question_type === "mcq" && Array.isArray(q.options)) {
          cell += "\n" + q.options.map((o: any, j: number) => `   ${String.fromCharCode(65 + j)}) ${o.text}`).join("\n");
        } else if (q.question_type === "short_answer") {
          cell += "\n\n_____________________________________________";
        } else {
          cell += "\n\n_______________________________________________________________________\n_______________________________________________________________________";
        }
        return [cell, `${q.marks}`];
      });
      const className = classInfo ? `${classInfo.name}${classInfo.section ? ` — ${classInfo.section}` : ""}` : "";
      downloadPdf({
        brand, filename: `${p.title.replace(/\s+/g, "-")}.pdf`,
        docs: [{
          title: p.title, subtitle: `${subject} · ${className}`,
          meta: [
            { label: "Subject", value: subject }, { label: "Class", value: className },
            { label: "Total marks", value: String(p.total_marks) }, { label: "Questions", value: String(ordered.length) },
          ],
          tables: [{ head: ["Question", "Marks"], rows: questionRows }],
          footnote: "This is a computer generated exam paper.",
        }],
      }).catch((e: Error) => toast.error(e.message));
    });
  }

  const list = papers ?? [];
  if (list.length === 0) return null;

  return (
    <div className="mtis-card p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved papers</p>
      <ul className="space-y-1">
        {list.map((p: any) => (
          <li key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <span className="text-sm font-medium">{p.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">{p.total_marks} marks · {p.question_ids?.length ?? 0} questions</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => downloadPaper(p)}>
              <Download className="mr-1.5 size-3.5" /> PDF
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
