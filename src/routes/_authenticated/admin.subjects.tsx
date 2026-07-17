import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/subjects")({
  head: () => ({ meta: [{ title: "Subjects — Madina Tul Ilm" }, { name: "description", content: "Manage subjects per class and teacher allocation." }] }),
  component: SubjectsPage,
});

type Subject = { id: string; class_id: string; name: string; code: string | null; teacher_id: string | null; credit_hours: number | null; is_optional: boolean };

function SubjectsPage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);

  const classesQ = useQuery({
    queryKey: ["classes-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const teachersQ = useQuery({
    queryKey: ["teachers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("id, full_name").order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });
  const subjectsQ = useQuery({
    queryKey: ["subjects", classId],
    queryFn: async () => {
      let q = supabase.from("subjects").select("*").order("name");
      if (classId !== "all") q = q.eq("class_id", classId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Subject[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Subject removed"); qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const classes = classesQ.data ?? [];
  const teachers = teachersQ.data ?? [];
  const subjects = subjectsQ.data ?? [];
  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "—";
  const teacherName = (id: string | null) => teachers.find((t) => t.id === id)?.full_name ?? "Unassigned";

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Academics</p>
          <h1 className="mtis-section-title mt-1">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Define subjects per class and assign teachers.</p>
        </div>
        <div className="flex gap-2">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 size-4" /> Add subject</Button>
        </div>
      </div>

      <div className="mtis-card p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Subject</th><th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Class</th><th className="px-3 py-2">Teacher</th>
              <th className="px-3 py-2">Credit</th><th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {subjects.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">{subjectsQ.isLoading ? "Loading…" : "No subjects yet."}</td></tr>}
              {subjects.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-primary-pale/30">
                  <td className="px-3 py-2 font-medium flex items-center gap-2"><BookOpen className="size-4 text-primary" />{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.code ?? "—"}</td>
                  <td className="px-3 py-2">{className(s.class_id)}</td>
                  <td className="px-3 py-2">{teacherName(s.teacher_id)}</td>
                  <td className="px-3 py-2">{s.credit_hours ?? "—"}</td>
                  <td className="px-3 py-2">{s.is_optional ? "Optional" : "Core"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${s.name}?`)) del.mutate(s.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && <SubjectDialog subject={editing} classes={classes} teachers={teachers} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["subjects"] })} />}
    </AppShell>
  );
}

function SubjectDialog({ subject, classes, teachers, onClose, onSaved }: {
  subject: Subject | null; classes: { id: string; name: string }[]; teachers: { id: string; full_name: string }[];
  onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(subject?.name ?? "");
  const [code, setCode] = useState(subject?.code ?? "");
  const [classId, setClassId] = useState(subject?.class_id ?? classes[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(subject?.teacher_id ?? "none");
  const [credit, setCredit] = useState(subject?.credit_hours?.toString() ?? "");
  const [optional, setOptional] = useState(subject?.is_optional ?? false);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !classId) throw new Error("Name and class required");
      const payload = {
        name: name.trim(), code: code || null, class_id: classId,
        teacher_id: teacherId === "none" ? null : teacherId,
        credit_hours: credit ? Number(credit) : null, is_optional: optional,
      };
      if (subject) {
        const { error } = await supabase.from("subjects").update(payload).eq("id", subject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subjects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{subject ? "Edit subject" : "Add subject"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <F label="Name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics" /></F>
          <F label="Code"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH-9" /></F>
          <F label="Class *">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Teacher">
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Unassigned —</SelectItem>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Credit hours"><Input type="number" step="0.5" value={credit} onChange={(e) => setCredit(e.target.value)} /></F>
          <F label="Type">
            <Select value={optional ? "opt" : "core"} onValueChange={(v) => setOptional(v === "opt")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="opt">Optional</SelectItem>
              </SelectContent>
            </Select>
          </F>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
