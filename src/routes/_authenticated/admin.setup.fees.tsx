import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Layers, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatClass } from "@/lib/format";
import { money, round2 } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/admin/setup/fees")({
  head: () => ({
    meta: [
      { title: "Fee Groups & Constituents — Madina Tul Ilm" },
      {
        name: "description",
        content: "Configure reusable fee constituents and class-based fee groups with amounts.",
      },
      { property: "og:title", content: "Fee Groups & Constituents — Madina Tul Ilm" },
      {
        property: "og:description",
        content: "Set up class-based fee groups and their constituent amounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeeSetupPage,
});

type Constituent = { id: string; name: string; is_active: boolean };
type Group = { id: string; name: string; class_ids: string[]; is_active: boolean };
type GroupConstituent = { id: string; group_id: string; constituent_id: string; amount: number };
type ClassRow = { id: string; name: string; section: string | null };

export function useFeeGroups() {
  return useQuery({
    queryKey: ["fee_groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_groups").select("*").order("name");
      if (error) throw error;
      return data as Group[];
    },
  });
}

function FeeSetupPage() {
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Configuration</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Fee groups &amp; constituents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Constituents are a shared list; each group sets its own amount per constituent.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/settings">
            <ArrowLeft /> Back to settings
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">
            <Layers className="mr-2 size-4" /> Fee groups
          </TabsTrigger>
          <TabsTrigger value="constituents">
            <Wallet className="mr-2 size-4" /> Constituents
          </TabsTrigger>
        </TabsList>
        <TabsContent value="groups">
          <GroupsTab />
        </TabsContent>
        <TabsContent value="constituents">
          <ConstituentsTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ConstituentsTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data } = useQuery({
    queryKey: ["fee_constituents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_constituents").select("*").order("name");
      if (error) throw error;
      return data as Constituent[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("fee_constituents").insert({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success("Constituent added");
      qc.invalidateQueries({ queryKey: ["fee_constituents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (c: Constituent) => {
      const { error } = await supabase
        .from("fee_constituents")
        .update({ is_active: !c.is_active })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee_constituents"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_constituents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Constituent removed");
      qc.invalidateQueries({ queryKey: ["fee_constituents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label className="text-xs font-semibold">Constituent name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tuition Fee, Sports Equipment…"
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus /> Add constituent
          </Button>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No constituents yet. Add reusable items like “Tuition Fee”.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-primary-pale/40">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.is_active ? "success" : "secondary"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Switch checked={c.is_active} onCheckedChange={() => toggle.mutate(c)} />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => {
                          if (confirm(`Remove ${c.name}?`)) remove.mutate(c.id);
                        }}
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function GroupsTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data: groups } = useFeeGroups();
  const { data: classes } = useQuery({
    queryKey: ["classes-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section")
        .order("name");
      if (error) throw error;
      return data as ClassRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Group name is required");
      const { error } = await supabase.from("fee_groups").insert({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success("Fee group created");
      qc.invalidateQueries({ queryKey: ["fee_groups"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedGroup(null);
      toast.success("Group removed");
      qc.invalidateQueries({ queryKey: ["fee_groups"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = groups ?? [];
  const active = rows.find((g) => g.id === selectedGroup) ?? null;

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label className="text-xs font-semibold">Group name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Primary Classes, Secondary Classes…"
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus /> Create group
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="mtis-card overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Groups
          </div>
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No groups yet.</p>
          ) : (
            <ul>
              {rows.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => setSelectedGroup(g.id)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                      selectedGroup === g.id
                        ? "bg-primary-pale font-semibold text-primary"
                        : "hover:bg-primary-pale/50"
                    }`}
                  >
                    <span>{g.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {g.class_ids?.length ?? 0} classes
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {active ? (
          <GroupDetail
            group={active}
            classes={classes ?? []}
            onDeleted={() => remove.mutate(active.id)}
          />
        ) : (
          <div className="mtis-card grid place-items-center p-12 text-center text-sm text-muted-foreground">
            Select a group to assign classes and constituent amounts.
          </div>
        )}
      </div>
    </div>
  );
}

function GroupDetail({
  group,
  classes,
  onDeleted,
}: {
  group: Group;
  classes: ClassRow[];
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const [newConstituent, setNewConstituent] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const { data: constituents } = useQuery({
    queryKey: ["fee_constituents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_constituents").select("*").order("name");
      if (error) throw error;
      return data as Constituent[];
    },
  });

  const { data: lines } = useQuery({
    queryKey: ["fee_group_constituents", group.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_group_constituents")
        .select("*")
        .eq("group_id", group.id);
      if (error) throw error;
      return data as GroupConstituent[];
    },
  });

  const nameOf = (id: string) => constituents?.find((c) => c.id === id)?.name ?? "—";
  const total = useMemo(
    () => round2((lines ?? []).reduce((s, l) => s + Number(l.amount || 0), 0)),
    [lines],
  );

  const setClasses = useMutation({
    mutationFn: async (classIds: string[]) => {
      const { error } = await supabase
        .from("fee_groups")
        .update({ class_ids: classIds })
        .eq("id", group.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee_groups"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addLine = useMutation({
    mutationFn: async () => {
      if (!newConstituent) throw new Error("Pick a constituent");
      const { error } = await supabase.from("fee_group_constituents").insert({
        group_id: group.id,
        constituent_id: newConstituent,
        amount: Number(newAmount || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewConstituent("");
      setNewAmount("");
      qc.invalidateQueries({ queryKey: ["fee_group_constituents", group.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateAmount = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase.from("fee_group_constituents").update({ amount }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee_group_constituents", group.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_group_constituents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee_group_constituents", group.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const selected = group.class_ids ?? [];
  const available = (constituents ?? []).filter(
    (c) => c.is_active && !(lines ?? []).some((l) => l.constituent_id === c.id),
  );

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">{group.name}</h2>
            <p className="text-sm text-muted-foreground">
              Students in the selected classes are billed with this group automatically.
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Delete group" onClick={onDeleted}>
            <Trash2 className="size-4 text-danger" />
          </Button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => {
            const checked = selected.includes(c.id);
            return (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() =>
                    setClasses.mutate(
                      checked ? selected.filter((id) => id !== c.id) : [...selected, c.id],
                    )
                  }
                />
                {formatClass(c.name, c.section)}
              </label>
            );
          })}
          {classes.length === 0 && (
            <p className="text-sm text-muted-foreground">No classes created yet.</p>
          )}
        </div>
      </div>

      <div className="mtis-card p-4">
        <h3 className="font-display text-base font-semibold">Constituents in this group</h3>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2">Constituent</th>
              <th className="py-2 w-40">Amount</th>
              <th className="py-2 text-right">—</th>
            </tr>
          </thead>
          <tbody>
            {(lines ?? []).map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="py-2">{nameOf(l.constituent_id)}</td>
                <td className="py-2">
                  <Input
                    type="number"
                    min="0"
                    defaultValue={String(l.amount)}
                    onBlur={(e) =>
                      updateAmount.mutate({ id: l.id, amount: Number(e.target.value || 0) })
                    }
                  />
                </td>
                <td className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove"
                    onClick={() => removeLine.mutate(l.id)}
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </td>
              </tr>
            ))}
            {(lines ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-sm text-muted-foreground">
                  No constituents added to this group yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-xs font-semibold">Constituent</Label>
            <Select value={newConstituent} onValueChange={setNewConstituent}>
              <SelectTrigger>
                <SelectValue placeholder="Select constituent" />
              </SelectTrigger>
              <SelectContent>
                {available.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1.5">
            <Label className="text-xs font-semibold">Amount</Label>
            <Input
              type="number"
              min="0"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
            />
          </div>
          <Button onClick={() => addLine.mutate()} disabled={addLine.isPending}>
            <Plus /> Add
          </Button>
          <div className="ml-auto text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Group total</p>
            <p className="font-display text-xl font-bold">{money(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
