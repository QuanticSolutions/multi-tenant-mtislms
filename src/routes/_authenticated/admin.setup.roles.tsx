import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Save, Shield, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, PERMISSION_ACTIONS, moduleLabel, type PermissionAction } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/admin/setup/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — Madina Tul Ilm" },
      {
        name: "description",
        content: "Create roles and control read, write, update and delete access per module.",
      },
      { property: "og:title", content: "Roles & Permissions — Madina Tul Ilm" },
      {
        property: "og:description",
        content: "Module-level permission matrix for every staff role.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RolesSetupPage,
});

type Role = { id: string; name: string; description: string | null };
type PermRow = {
  id?: string;
  role_id: string;
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_update: boolean;
  can_delete: boolean;
};

const COLUMN: Record<PermissionAction, keyof PermRow> = {
  read: "can_read",
  write: "can_write",
  update: "can_update",
  delete: "can_delete",
};

function RolesSetupPage() {
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Configuration</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Roles &amp; permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define roles once, then tick exactly what each role may do in every module.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/settings">
            <ArrowLeft /> Back to settings
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix">
            <Shield className="mr-2 size-4" /> Permission matrix
          </TabsTrigger>
          <TabsTrigger value="assign">
            <Users className="mr-2 size-4" /> Assign to users
          </TabsTrigger>
        </TabsList>
        <TabsContent value="matrix">
          <MatrixTab />
        </TabsContent>
        <TabsContent value="assign">
          <AssignTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("name");
      if (error) throw error;
      return data as Role[];
    },
  });
}

function MatrixTab() {
  const qc = useQueryClient();
  const { data: roles } = useRoles();
  const [roleId, setRoleId] = useState<string>("");
  const [newRole, setNewRole] = useState("");
  const [draft, setDraft] = useState<Record<string, PermRow>>({});

  useEffect(() => {
    if (!roleId && roles && roles.length > 0) setRoleId(roles[0]!.id);
  }, [roles, roleId]);

  const { data: perms } = useQuery({
    queryKey: ["role_permissions", roleId],
    enabled: !!roleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role_id", roleId);
      if (error) throw error;
      return data as PermRow[];
    },
  });

  useEffect(() => {
    if (!roleId) return;
    const map: Record<string, PermRow> = {};
    for (const m of MODULES) {
      const found = perms?.find((p) => p.module === m);
      map[m] = found ?? {
        role_id: roleId,
        module: m,
        can_read: false,
        can_write: false,
        can_update: false,
        can_delete: false,
      };
    }
    setDraft(map);
  }, [perms, roleId]);

  const createRole = useMutation({
    mutationFn: async () => {
      const name = newRole.trim();
      if (!name) throw new Error("Role name is required");
      const { data, error } = await supabase.from("roles").insert({ name }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Role created");
      setNewRole("");
      setRoleId(id);
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role deleted");
      setRoleId("");
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!roleId) throw new Error("Pick a role first");
      const rows = Object.values(draft).map((r) => ({
        role_id: roleId,
        module: r.module,
        can_read: r.can_read,
        can_write: r.can_write,
        can_update: r.can_update,
        can_delete: r.can_delete,
      }));
      const { error } = await supabase
        .from("role_permissions")
        .upsert(rows, { onConflict: "role_id,module" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permissions saved");
      qc.invalidateQueries({ queryKey: ["role_permissions", roleId] });
      qc.invalidateQueries({ queryKey: ["my-role-permissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle(module: string, action: PermissionAction, value: boolean) {
    setDraft((d) => {
      const row = d[module]!;
      const next: PermRow = { ...row, [COLUMN[action]]: value } as PermRow;
      // Granting any write-ish action implies read access.
      if (value && action !== "read") next.can_read = true;
      if (!value && action === "read") {
        next.can_write = false;
        next.can_update = false;
        next.can_delete = false;
      }
      return { ...d, [module]: next };
    });
  }

  function setAll(action: PermissionAction, value: boolean) {
    setDraft((d) => {
      const next: Record<string, PermRow> = {};
      for (const [k, row] of Object.entries(d)) {
        const r: PermRow = { ...row, [COLUMN[action]]: value } as PermRow;
        if (value && action !== "read") r.can_read = true;
        if (!value && action === "read") {
          r.can_write = false;
          r.can_update = false;
          r.can_delete = false;
        }
        next[k] = r;
      }
      return next;
    });
  }

  const current = roles?.find((r) => r.id === roleId) ?? null;

  return (
    <div className="space-y-4">
      <div className="mtis-card flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {(roles ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">New role</Label>
          <div className="flex gap-2">
            <Input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Accountant"
              className="w-[200px]"
            />
            <Button variant="outline" onClick={() => createRole.mutate()} disabled={createRole.isPending}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </div>
        {current && (
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm(`Delete role "${current.name}"?`)) deleteRole.mutate(current.id);
            }}
          >
            <Trash2 className="size-4 text-danger" /> Delete role
          </Button>
        )}
        <Button className="ml-auto" onClick={() => save.mutate()} disabled={!roleId || save.isPending}>
          <Save className="mr-2 size-4" /> {save.isPending ? "Saving…" : "Save permissions"}
        </Button>
      </div>

      {!roleId ? (
        <div className="mtis-card p-10 text-center text-sm text-muted-foreground">
          Create a role to start assigning permissions.
        </div>
      ) : (
        <div className="mtis-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Module</th>
                {PERMISSION_ACTIONS.map((a) => (
                  <th key={a} className="px-4 py-3 text-center">
                    <div>{a}</div>
                    <div className="mt-1 flex justify-center gap-1 text-[10px] normal-case">
                      <button className="hover:text-primary" onClick={() => setAll(a, true)}>
                        all
                      </button>
                      <span>/</span>
                      <button className="hover:text-primary" onClick={() => setAll(a, false)}>
                        none
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => {
                const row = draft[m];
                if (!row) return null;
                return (
                  <tr key={m} className="border-t border-border hover:bg-primary-pale/40">
                    <td className="px-4 py-2.5 font-medium">{moduleLabel(m)}</td>
                    {PERMISSION_ACTIONS.map((a) => (
                      <td key={a} className="px-4 py-2.5 text-center">
                        <Checkbox
                          checked={Boolean(row[COLUMN[a]])}
                          onCheckedChange={(v) => toggle(m, a, Boolean(v))}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role_id: string | null;
};

function AssignTab() {
  const qc = useQueryClient();
  const { data: roles } = useRoles();
  const [search, setSearch] = useState("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role_id")
        .order("full_name");
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const assign = useMutation({
    mutationFn: async ({ id, roleId }: { id: string; roleId: string | null }) => {
      const { error } = await supabase.from("profiles").update({ role_id: roleId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role assigned");
      qc.invalidateQueries({ queryKey: ["profiles-roles"] });
      qc.invalidateQueries({ queryKey: ["my-role-permissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (profiles ?? []).filter(
      (p) =>
        !q ||
        (p.full_name?.toLowerCase().includes(q) ?? false) ||
        (p.email?.toLowerCase().includes(q) ?? false),
    );
  }, [profiles, search]);

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="max-w-xs"
        />
      </div>
      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading users…</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 w-[240px]">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{p.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={p.role_id ?? "none"}
                      onValueChange={(v) =>
                        assign.mutate({ id: p.id, roleId: v === "none" ? null : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No role</SelectItem>
                        {(roles ?? []).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        <Badge variant="secondary" className="mr-2">
          Note
        </Badge>
        Users holding the built-in admin role always have full access regardless of this matrix.
      </p>
    </div>
  );
}
