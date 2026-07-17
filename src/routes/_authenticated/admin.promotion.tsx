import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/promotion")({
  head: () => ({ meta: [{ title: "Promotion — Madina Tul Ilm" }, { name: "description", content: "Bulk promote students from one class to another." }] }),
  component: PromotionPage,
});

type Student = { id: string; full_name: string; admission_no: string | null; class_id: string | null; status: string | null };
type Cls = { id: string; name: string };

function PromotionPage() {
  const qc = useQueryClient();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [session, setSession] = useState("2026-27");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const classesQ = useQuery({
    queryKey: ["classes-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data as Cls[];
    },
  });
  const studentsQ = useQuery({
    queryKey: ["students-in-class", fromId],
    enabled: !!fromId,
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, full_name, admission_no, class_id, status").eq("class_id", fromId).order("full_name");
      if (error) throw error;
      return data as Student[];
    },
  });

  const classes = classesQ.data ?? [];
  const students = studentsQ.data ?? [];
  const allChecked = students.length > 0 && selected.size === students.length;
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(students.map((s) => s.id)));
  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const promote = useMutation({
    mutationFn: async () => {
      if (!toId) throw new Error("Pick a target class");
      if (selected.size === 0) throw new Error("Select at least one student");
      const ids = Array.from(selected);
      const { error } = await supabase.from("students").update({ class_id: toId }).in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      toast.success(`Promoted ${n} student${n === 1 ? "" : "s"} to session ${session}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["students-in-class"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fromName = useMemo(() => classes.find((c) => c.id === fromId)?.name, [classes, fromId]);
  const toName = useMemo(() => classes.find((c) => c.id === toId)?.name, [classes, toId]);

  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Academics</p>
        <h1 className="mtis-section-title mt-1">Student promotion</h1>
        <p className="mt-1 text-sm text-muted-foreground">Move students from one class to the next at the start of a new session.</p>
      </div>

      <div className="mtis-card grid gap-4 p-4 md:grid-cols-[1fr_auto_1fr_auto]">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">From class</span>
          <Select value={fromId} onValueChange={(v) => { setFromId(v); setSelected(new Set()); }}>
            <SelectTrigger><SelectValue placeholder="Current class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <div className="hidden md:flex items-end pb-2"><ArrowRight className="size-5 text-muted-foreground" /></div>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">To class</span>
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger><SelectValue placeholder="Target class" /></SelectTrigger>
            <SelectContent>{classes.filter((c) => c.id !== fromId).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">New session</span>
          <Input value={session} onChange={(e) => setSession(e.target.value)} placeholder="2026-27" />
        </label>
      </div>

      {fromId && (
        <div className="mtis-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <GraduationCap className="size-4 text-primary" />
              <span className="font-medium">{students.length} student{students.length === 1 ? "" : "s"} in {fromName}</span>
              <span className="text-muted-foreground">· {selected.size} selected</span>
            </div>
            <Button onClick={() => promote.mutate()} disabled={promote.isPending || !toId || selected.size === 0}>
              Promote to {toName ?? "…"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                  <th className="px-3 py-2">Admission #</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">{studentsQ.isLoading ? "Loading…" : "No students in this class."}</td></tr>}
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} /></td>
                    <td className="px-3 py-2 text-muted-foreground">{s.admission_no ?? "—"}</td>
                    <td className="px-3 py-2 font-medium">{s.full_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.status ?? "active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
