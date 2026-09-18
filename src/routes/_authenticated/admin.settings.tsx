import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Settings, Save, Plus, Trash2, Shield, GraduationCap,
  ChevronRight, Building2, Wallet, Banknote, UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — School LMS" },
      { name: "description", content: "School profile, session, grading scales and role management." },
    ],
  }),
  component: SettingsPage,
});

type Settings = {
  id: string;
  school_name: string;
  tagline: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  current_session: string;
  session_start_date: string | null;
  session_end_date: string | null;
  timezone: string;
  currency: string;
};

type Band = { grade: string; min: number; max: number };
type Scale = { id: string; name: string; description: string | null; is_default: boolean; bands: Band[] };

type Role = "admin" | "teacher" | "student" | "parent" | "librarian" | "accountant";

type RoleRow = {
  id: string;
  user_id: string;
  role: Role;
  profile: { full_name: string | null; email: string | null } | null;
};

const ROLES: Role[] = ["admin", "teacher", "student", "parent", "librarian", "accountant"];

const TABS = ["profile", "session", "grading", "roles"] as const;
type Tab = (typeof TABS)[number];

const SETUP_LINKS = [
  {
    to: "/admin/setup/departments",
    icon: Building2,
    title: "Departments",
    description: "Teaching and non-teaching departments for employee records.",
  },
  {
    to: "/admin/setup/fees",
    icon: Wallet,
    title: "Fee groups & constituents",
    description: "Global fee heads and per-class group amounts.",
  },
  {
    to: "/admin/setup/payroll",
    icon: Banknote,
    title: "Payroll deductions",
    description: "Persistent deductions and stepped attendance rules.",
  },
  {
    to: "/admin/setup/roles",
    icon: UserCog,
    title: "Roles & permissions",
    description: "Module permission matrix and user role assignment.",
  },
] as const;

function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Configuration</p>
        <h1 className="mtis-section-title mt-1">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">School profile, academic session, grading scales and role assignments.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SETUP_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="mtis-card group p-4 transition-colors hover:border-primary">
            <div className="flex items-center gap-2">
              <l.icon className="size-4 text-primary" />
              <p className="font-display text-sm font-semibold">{l.title}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Configure <ChevronRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary-pale hover:text-primary"
              }`}>
              {t === "grading" ? "Grading scales" : t === "roles" ? "Roles & users" : t}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {tab === "profile" && <ProfileTab />}
          {tab === "session" && <SessionTab />}
          {tab === "grading" && <GradingTab />}
          {tab === "roles" && <RolesTab />}
        </div>
      </div>
    </AppShell>
  );
}

function useSettings() {
  return useQuery({
    queryKey: ["school_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });
}

function ProfileTab() {
  const qc = useQueryClient();
  const { data } = useSettings();
  const [form, setForm] = useState<Partial<Settings>>({});

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Loading…");
      const { error } = await supabase.from("school_settings").update({
        school_name: form.school_name, tagline: form.tagline, address: form.address,
        city: form.city, phone: form.phone, email: form.email, website: form.website, logo_url: form.logo_url,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["school_settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="School name"><Input value={form.school_name ?? ""} onChange={(e) => setForm({ ...form, school_name: e.target.value })} /></Field>
      <Field label="Tagline"><Input value={form.tagline ?? ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
      <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Website"><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
      <Field label="City"><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
      <div className="md:col-span-2">
        <Field label="Address"><Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      </div>
      <Field label="Logo URL"><Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></Field>
      <div className="md:col-span-2 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 size-4" /> Save profile</Button>
      </div>
    </div>
  );
}

function SessionTab() {
  const qc = useQueryClient();
  const { data } = useSettings();
  const [form, setForm] = useState<Partial<Settings>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const { error } = await supabase.from("school_settings").update({
        current_session: form.current_session, session_start_date: form.session_start_date || null,
        session_end_date: form.session_end_date || null, timezone: form.timezone, currency: form.currency,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session saved"); qc.invalidateQueries({ queryKey: ["school_settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Current session"><Input value={form.current_session ?? ""} onChange={(e) => setForm({ ...form, current_session: e.target.value })} placeholder="2025-26" /></Field>
      <Field label="Timezone"><Input value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></Field>
      <Field label="Session start"><Input type="date" value={form.session_start_date ?? ""} onChange={(e) => setForm({ ...form, session_start_date: e.target.value })} /></Field>
      <Field label="Session end"><Input type="date" value={form.session_end_date ?? ""} onChange={(e) => setForm({ ...form, session_end_date: e.target.value })} /></Field>
      <Field label="Currency"><Input value={form.currency ?? ""} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="PKR" /></Field>
      <div className="md:col-span-2 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 size-4" /> Save session</Button>
      </div>
    </div>
  );
}

function GradingTab() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Scale | null>(null);

  const q = useQuery({
    queryKey: ["grading_scales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grading_scales").select("*").order("created_at");
      if (error) throw error;
      return (data as unknown) as Scale[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grading_scales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Scale removed"); qc.invalidateQueries({ queryKey: ["grading_scales"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("grading_scales").update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("grading_scales").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Default scale updated"); qc.invalidateQueries({ queryKey: ["grading_scales"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const scales = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 size-4" /> New scale</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {scales.map((s) => (
          <div key={s.id} className="mtis-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-4 text-primary" />
                  <p className="font-medium text-foreground">{s.name}</p>
                  {s.is_default && <Badge variant="outline" className="bg-primary-pale text-primary">Default</Badge>}
                </div>
                {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Edit</Button>
                {!s.is_default && <Button size="sm" variant="ghost" onClick={() => setDefault.mutate(s.id)}>Set default</Button>}
                <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${s.name}?`)) del.mutate(s.id); }}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              {(s.bands ?? []).map((b, i) => (
                <div key={i} className="rounded border border-border bg-background px-2 py-1.5">
                  <div className="font-mono font-semibold text-foreground">{b.grade}</div>
                  <div className="text-xs text-muted-foreground">{b.min}–{b.max}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {scales.length === 0 && !q.isLoading && (
          <p className="text-sm text-muted-foreground">No scales configured.</p>
        )}
      </div>
      {(addOpen || editing) && (
        <ScaleDialog scale={editing} onClose={() => { setAddOpen(false); setEditing(null); }}
          onSaved={() => qc.invalidateQueries({ queryKey: ["grading_scales"] })} />
      )}
    </div>
  );
}

function ScaleDialog({ scale, onClose, onSaved }: { scale: Scale | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(scale?.name ?? "");
  const [description, setDescription] = useState(scale?.description ?? "");
  const [bands, setBands] = useState<Band[]>(
    scale?.bands ?? [{ grade: "A", min: 80, max: 100 }, { grade: "B", min: 60, max: 79 }, { grade: "F", min: 0, max: 59 }],
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const payload = { name: name.trim(), description: description || null, bands };
      if (scale) {
        const { error } = await supabase.from("grading_scales").update(payload).eq("id", scale.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grading_scales").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Scale saved"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{scale ? "Edit scale" : "New grading scale"}</DialogTitle>
          <DialogDescription>Define grade bands with min/max percentages.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name *"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div>
            <p className="mtis-eyebrow mb-2">Bands</p>
            <div className="space-y-2">
              {bands.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Grade" value={b.grade} onChange={(e) => {
                    const n = [...bands]; n[i] = { ...n[i], grade: e.target.value }; setBands(n);
                  }} className="w-20" />
                  <Input type="number" placeholder="Min" value={b.min} onChange={(e) => {
                    const n = [...bands]; n[i] = { ...n[i], min: Number(e.target.value) }; setBands(n);
                  }} className="w-24" />
                  <Input type="number" placeholder="Max" value={b.max} onChange={(e) => {
                    const n = [...bands]; n[i] = { ...n[i], max: Number(e.target.value) }; setBands(n);
                  }} className="w-24" />
                  <Button size="sm" variant="ghost" onClick={() => setBands(bands.filter((_, k) => k !== i))}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setBands([...bands, { grade: "", min: 0, max: 0 }])}>
                <Plus className="mr-1 size-4" /> Add band
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save scale</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesTab() {
  const qc = useQueryClient();
  const [assignOpen, setAssign] = useState(false);

  const q = useQuery({
    queryKey: ["user_roles_full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role").order("role");
      if (error) throw error;
      const rows = data as { id: string; user_id: string; role: Role }[];
      const ids = rows.map((r) => r.user_id);
      if (ids.length === 0) return [] as RoleRow[];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: map.get(r.user_id) ?? null })) as RoleRow[];
    },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries({ queryKey: ["user_roles_full"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAssign(true)}><Plus className="mr-2 size-4" /> Assign role</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                {q.isLoading ? "Loading…" : "No role assignments."}
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 text-foreground">{r.profile?.full_name ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.profile?.email ?? r.user_id}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="capitalize bg-primary-pale text-primary"><Shield className="mr-1 size-3" />{r.role}</Badge></td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Revoke ${r.role} from ${r.profile?.email}?`)) revoke.mutate(r.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {assignOpen && <AssignRoleDialog onClose={() => setAssign(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["user_roles_full"] })} />}
    </div>
  );
}

function AssignRoleDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("teacher");

  const profilesQ = useQuery({
    queryKey: ["profiles-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string | null; email: string | null }[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Select a user");
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role assigned"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign role</DialogTitle>
          <DialogDescription>Grant a role to an existing user.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="User">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                {(profilesQ.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Role">
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Assign</Button>
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
