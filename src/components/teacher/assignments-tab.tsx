import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Save, Upload, Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatStatus } from "@/lib/format";

type HW = {
  id: string; title: string; description: string | null; due_date: string;
  max_marks: number; status: string; allow_late: boolean; max_attempts: number;
  instructions_file_url: string | null;
};

type Submission = {
  id: string; student_id: string; status: string; marks: number | null;
  remarks: string | null; submission_text: string | null; submission_file_url: string | null;
  attempt_number: number; graded_at: string | null;
  students: { full_name: string; admission_no: string } | null;
};

export function AssignmentsTab({ classId, subject }: { classId: string; subject: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["hw-assignments", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework")
        .select("id, title, description, due_date, max_marks, status, allow_late, max_attempts, instructions_file_url")
        .eq("class_id", classId)
        .eq("subject", subject)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HW[];
    },
  });

  const createMut = useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("homework").insert({
        ...payload, class_id: classId, subject, created_by: u.user?.id,
        assigned_date: new Date().toISOString().slice(0, 10),
        status: "assigned",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assignment created"); setShowForm(false); qc.invalidateQueries({ queryKey: ["hw-assignments", classId, subject] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homework").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assignment deleted"); qc.invalidateQueries({ queryKey: ["hw-assignments", classId, subject] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = assignments ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 size-4" /> New assignment</Button>
      </div>

      {isLoading ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : list.length === 0 ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">No assignments yet.</div>
      ) : (
        <div className="space-y-2">
          {list.map((hw) => (
            <div key={hw.id} className="mtis-card p-4">
              <div className="flex items-start justify-between gap-2">
                <button
                  className="flex items-center gap-2 text-left"
                  onClick={() => setExpanded(expanded === hw.id ? null : hw.id)}
                >
                  {expanded === hw.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <div>
                    <p className="font-medium text-foreground">{hw.title}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(hw.due_date)} · {hw.max_marks} marks</p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{formatStatus(hw.status)}</Badge>
                  {hw.allow_late && <Badge variant="secondary">Late OK</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this assignment?")) deleteMut.mutate(hw.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {hw.description && <p className="mt-2 text-sm text-muted-foreground">{hw.description}</p>}
              {expanded === hw.id && <SubmissionsList hwId={hw.id} maxMarks={hw.max_marks} />}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AssignmentDialog
          onClose={() => setShowForm(false)}
          onSave={(payload) => createMut.mutate(payload)}
          saving={createMut.isPending}
        />
      )}
    </div>
  );
}

function SubmissionsList({ hwId, maxMarks }: { hwId: string; maxMarks: number }) {
  const qc = useQueryClient();
  const [grading, setGrading] = useState<string | null>(null);
  const [marks, setMarks] = useState("");
  const [remarks, setRemarks] = useState("");

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["hw-submissions", hwId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework_submissions")
        .select("id, student_id, status, marks, remarks, submission_text, submission_file_url, attempt_number, graded_at, students(full_name, admission_no)")
        .eq("homework_id", hwId)
        .order("submitted_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  const gradeMut = useMutation({
    mutationFn: async (subId: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("homework_submissions")
        .update({
          marks: parseFloat(marks), remarks: remarks || null,
          graded_by: u.user?.id, graded_at: new Date().toISOString(),
          status: "graded",
        })
        .eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Graded"); setGrading(null); setMarks(""); setRemarks(""); qc.invalidateQueries({ queryKey: ["hw-submissions", hwId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="mt-3 text-xs text-muted-foreground">Loading submissions…</p>;
  const subs = submissions ?? [];

  if (subs.length === 0) return <p className="mt-3 text-xs text-muted-foreground">No submissions yet.</p>;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-1">Student</th>
            <th className="px-2 py-1">Status</th>
            <th className="px-2 py-1">Submission</th>
            <th className="px-2 py-1">Marks</th>
            <th className="px-2 py-1 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="px-2 py-2 text-foreground">{s.students?.full_name ?? "—"}</td>
              <td className="px-2 py-2"><Badge variant="outline" className="capitalize">{formatStatus(s.status)}</Badge></td>
              <td className="px-2 py-2">
                {s.submission_text && <p className="max-w-xs truncate text-xs text-muted-foreground">{s.submission_text}</p>}
                {s.submission_file_url && <a href={s.submission_file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View file</a>}
              </td>
              <td className="px-2 py-2">
                {s.marks != null ? `${s.marks}/${maxMarks}` : "—"}
                {s.graded_at && <p className="text-[10px] text-muted-foreground">{formatDate(s.graded_at)}</p>}
              </td>
              <td className="px-2 py-2 text-right">
                {s.status !== "graded" && (
                  grading === s.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <Input type="number" max={maxMarks} min={0} value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="Marks" className="w-20" />
                      <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks" className="w-28" />
                      <Button size="sm" onClick={() => gradeMut.mutate(s.id)} disabled={gradeMut.isPending}>Save</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setGrading(s.id); setMarks(s.marks?.toString() ?? ""); setRemarks(s.remarks ?? ""); }}>Grade</Button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentDialog({ onClose, onSave, saving }: { onClose: () => void; onSave: (p: any) => void; saving: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState(10);
  const [allowLate, setAllowLate] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `instructions/${u.user?.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("assignments").upload(path, file, { upsert: false });
      if (error) throw error;
      setFileUrl(path);
      toast.success("File uploaded");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New assignment</DialogTitle>
          <DialogDescription>Create a homework assignment for this class and subject.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 5 exercises" /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Due date *</label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Max marks</label><Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={allowLate} onCheckedChange={setAllowLate} />
              <span className="text-sm">Allow late submissions</span>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Max attempts</label><Input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} /></div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Instructions file (optional)</label>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => {
                const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".pdf,.doc,.docx,.png,.jpg";
                inp.onchange = () => { if (inp.files?.[0]) uploadFile(inp.files[0]); }; inp.click();
              }}>{uploading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}Upload</Button>
              {fileUrl && <span className="text-xs text-success">File ready</span>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ title, description: description || null, due_date: dueDate, max_marks: maxMarks, allow_late: allowLate, max_attempts: maxAttempts, instructions_file_url: fileUrl })} disabled={saving || !title.trim() || !dueDate}>
            {saving ? "Creating…" : "Create assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
