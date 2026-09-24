import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, User, Search, Link2, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/parents")({
  head: () => ({ meta: [{ title: "Parents" }, { name: "description", content: "Manage parents and link them to students." }] }),
  component: ParentsPage,
});

type Parent = { id: string; full_name: string; email: string | null; phone: string | null; cnic: string | null; profession: string | null; employer: string | null; address: string | null };
type Student = { id: string; full_name: string; admission_no: string | null };
type Link = { id: string; parent_id: string; student_id: string; relation: string; is_primary: boolean };

function ParentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [relationFilter, setRelationFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [linkFor, setLinkFor] = useState<Parent | null>(null);

  const parentsQ = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parents").select("*").order("full_name");
      if (error) throw error;
      return data as Parent[];
    },
  });
  const linksQ = useQuery({
    queryKey: ["student_parents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_parents").select("*");
      if (error) throw error;
      return data as Link[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Parent removed"); qc.invalidateQueries({ queryKey: ["parents"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const parents = parentsQ.data ?? [];
  const links = linksQ.data ?? [];

  const professions = useMemo(() => {
    const set = new Set<string>();
    parents.forEach((p) => { if (p.profession) set.add(p.profession); });
    return Array.from(set).sort();
  }, [parents]);

  const relations = useMemo(() => {
    const set = new Set<string>();
    links.forEach((l) => { if (l.relation) set.add(l.relation); });
    return Array.from(set).sort();
  }, [links]);

  const parentRelations = (pid: string) => links.filter((l) => l.parent_id === pid).map((l) => l.relation);

  const activeFilterCount = [professionFilter, relationFilter].filter((v) => v !== "all").length + (search.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return parents.filter((p) => {
      const matchesQ = !s || p.full_name.toLowerCase().includes(s) || (p.phone ?? "").includes(s) || (p.email ?? "").toLowerCase().includes(s);
      const matchesProfession = professionFilter === "all" || p.profession === professionFilter;
      const matchesRelation = relationFilter === "all" || parentRelations(p.id).includes(relationFilter);
      return matchesQ && matchesProfession && matchesRelation;
    });
  }, [parents, search, professionFilter, relationFilter, links]);

  const clearFilters = () => {
    setSearch("");
    setProfessionFilter("all");
    setRelationFilter("all");
  };

  const linkCount = (pid: string) => links.filter((l) => l.parent_id === pid).length;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">People</p>
          <h1 className="mtis-section-title mt-1">Parents & Guardians</h1>
          <p className="mt-1 text-sm text-muted-foreground">{parents.length} records · {links.length} student links</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 size-4" /> Add parent</Button>
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, email…" className="pl-9" />
          </div>
          <Select value={relationFilter} onValueChange={setRelationFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Relation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All relations</SelectItem>
              {relations.map((r) => (
                <SelectItem key={r} value={r}>{formatStatus(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={professionFilter} onValueChange={setProfessionFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Profession" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All professions</SelectItem>
              {professions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilterCount > 1 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" /> Clear filters
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {parents.length} parents
          </div>
        </div>
      </div>

      <div className="mtis-card p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Name</th><th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Profession</th><th className="px-3 py-2">Linked students</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">{parentsQ.isLoading ? "Loading…" : "No parents found."}</td></tr>}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-primary-pale/30">
                  <td className="px-3 py-2 font-medium flex items-center gap-2"><User className="size-4 text-primary" />{p.full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.phone ?? "—"}{p.email ? ` · ${p.email}` : ""}</td>
                  <td className="px-3 py-2">{p.profession ?? "—"}{p.employer ? ` @ ${p.employer}` : ""}</td>
                  <td className="px-3 py-2"><Badge variant="secondary">{linkCount(p.id)}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setLinkFor(p)}><Link2 className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${p.full_name}?`)) del.mutate(p.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && <ParentDialog parent={editing} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["parents"] })} />}
      {linkFor && <LinkDialog parent={linkFor} onClose={() => setLinkFor(null)} />}
    </AppShell>
  );
}

function ParentDialog({ parent, onClose, onSaved }: { parent: Parent | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    full_name: parent?.full_name ?? "", email: parent?.email ?? "", phone: parent?.phone ?? "",
    cnic: parent?.cnic ?? "", profession: parent?.profession ?? "", employer: parent?.employer ?? "", address: parent?.address ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = useMutation({
    mutationFn: async () => {
      if (!f.full_name.trim()) throw new Error("Name is required");
      const payload = { ...f, full_name: f.full_name.trim(), email: f.email || null, phone: f.phone || null, cnic: f.cnic || null, profession: f.profession || null, employer: f.employer || null, address: f.address || null };
      if (parent) {
        const { error } = await supabase.from("parents").update(payload).eq("id", parent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("parents").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{parent ? "Edit parent" : "Add parent"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <F label="Full name *"><Input value={f.full_name} onChange={set("full_name")} /></F>
          <F label="CNIC / National ID"><Input value={f.cnic} onChange={set("cnic")} /></F>
          <F label="Phone"><Input value={f.phone} onChange={set("phone")} /></F>
          <F label="Email"><Input type="email" value={f.email} onChange={set("email")} /></F>
          <F label="Profession"><Input value={f.profession} onChange={set("profession")} /></F>
          <F label="Employer"><Input value={f.employer} onChange={set("employer")} /></F>
          <F label="Address" className="md:col-span-2"><Input value={f.address} onChange={set("address")} /></F>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkDialog({ parent, onClose }: { parent: Parent; onClose: () => void }) {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [relation, setRelation] = useState("father");
  const [isPrimary, setIsPrimary] = useState(false);

  const studentsQ = useQuery({
    queryKey: ["students-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, full_name, admission_no").order("full_name");
      if (error) throw error;
      return data as Student[];
    },
  });
  const linksQ = useQuery({
    queryKey: ["student_parents", parent.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_parents").select("*").eq("parent_id", parent.id);
      if (error) throw error;
      return data as Link[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Pick a student");
      const { error } = await supabase.from("student_parents").insert({ parent_id: parent.id, student_id: studentId, relation, is_primary: isPrimary });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Linked");
      setStudentId(""); setIsPrimary(false);
      qc.invalidateQueries({ queryKey: ["student_parents"] });
      linksQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_parents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["student_parents"] }); linksQ.refetch(); },
  });

  const students = studentsQ.data ?? [];
  const links = linksQ.data ?? [];
  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name ?? id;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Link students to {parent.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-[1fr_140px_120px_auto]">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}{s.admission_no ? ` (${s.admission_no})` : ""}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["father", "mother", "guardian", "other"].map((r) => <SelectItem key={r} value={r}>{formatStatus(r)}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} /> Primary</label>
            <Button onClick={() => add.mutate()} disabled={add.isPending}>Link</Button>
          </div>
          <div className="rounded-md border border-border">
            {links.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No students linked yet.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {links.map((l) => (
                    <tr key={l.id} className="border-b last:border-0 border-border">
                      <td className="px-3 py-2">{studentName(l.student_id)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatStatus(l.relation)}{l.is_primary ? " · primary" : ""}</td>
                      <td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => removeLink.mutate(l.id)}><Trash2 className="size-4 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm ${className}`}><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
