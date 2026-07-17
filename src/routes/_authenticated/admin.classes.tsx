import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, School, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/classes")({
  head: () => ({ meta: [{ title: "Classes — Madina Tul Ilm" }, { name: "description", content: "Manage classes, sections and class teachers." }] }),
  component: ClassesPage,
});

type ClassRow = {
  id: string; name: string; section: string | null; grade_level: number | null;
  capacity: number | null; academic_year: string | null; class_teacher_id: string | null;
};
type Teacher = { id: string; full_name: string };

function ClassesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);

  const classesQ = useQuery({
    queryKey: ["classes-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("grade_level").order("name");
      if (error) throw error;
      return data as ClassRow[];
    },
  });
  const teachersQ = useQuery({
    queryKey: ["teachers-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("id, full_name").order("full_name");
      if (error) throw error;
      return data as Teacher[];
    },
  });
  const countsQ = useQuery({
    queryKey: ["class-student-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("class_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data ?? []) if (r.class_id) map[r.class_id] = (map[r.class_id] ?? 0) + 1;
      return map;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class removed"); qc.invalidateQueries({ queryKey: ["classes-full"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const classes = classesQ.data ?? [];
  const teachers = teachersQ.data ?? [];
  const counts = countsQ.data ?? {};
  const teacherName = (id: string | null) => teachers.find((t) => t.id === id)?.full_name ?? "—";

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Academics</p>
          <h1 className="mtis-section-title mt-1">Classes & Sections</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every class row represents a section. Assign a class teacher for the year.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 size-4" /> Add class</Button>
      </div>

      <div className="mtis-card p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Grade</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Class teacher</th>
                <th className="px-3 py-2">Students</th>
                <th className="px-3 py-2">Capacity</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  {classesQ.isLoading ? "Loading…" : "No classes yet."}
                </td></tr>
              )}
              {classes.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-primary-pale/30">
                  <td className="px-3 py-2 font-medium text-foreground flex items-center gap-2">
                    <School className="size-4 text-primary" /> {c.name}
                  </td>
                  <td className="px-3 py-2">{c.section ?? "—"}</td>
                  <td className="px-3 py-2">{c.grade_level ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.academic_year ?? "—"}</td>
                  <td className="px-3 py-2">{teacherName(c.class_teacher_id)}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1"><Users className="size-3 text-muted-foreground" />{counts[c.id] ?? 0}</span></td>
                  <td className="px-3 py-2">{c.capacity ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id); }}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <ClassDialog cls={editing} teachers={teachers} onClose={() => setOpen(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["classes-full"] })} />
      )}
    </AppShell>
  );
}

function ClassDialog({ cls, teachers, onClose, onSaved }: {
  cls: ClassRow | null; teachers: Teacher[]; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(cls?.name ?? "");
  const [section, setSection] = useState(cls?.section ?? "");
  const [grade, setGrade] = useState<string>(cls?.grade_level?.toString() ?? "");
  const [year, setYear] = useState(cls?.academic_year ?? "2025-26");
  const [capacity, setCapacity] = useState<string>(cls?.capacity?.toString() ?? "");
  const [teacherId, setTeacherId] = useState(cls?.class_teacher_id ?? "none");

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const payload = {
        name: name.trim(), section: section || null,
        grade_level: grade ? Number(grade) : null,
        academic_year: year || null,
        capacity: capacity ? Number(capacity) : null,
        class_teacher_id: teacherId === "none" ? null : teacherId,
      };
      if (cls) {
        const { error } = await supabase.from("classes").update(payload as never).eq("id", cls.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("classes").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cls ? "Edit class" : "Add class"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <F label="Name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grade 9 - A" /></F>
          <F label="Section"><Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" /></F>
          <F label="Grade level"><Input type="number" value={grade} onChange={(e) => setGrade(e.target.value)} /></F>
          <F label="Academic year"><Input value={year} onChange={(e) => setYear(e.target.value)} /></F>
          <F label="Capacity"><Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></F>
          <F label="Class teacher">
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Unassigned —</SelectItem>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
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
