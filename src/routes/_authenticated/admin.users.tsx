import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Trash2, ShieldCheck, Search, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  createUser,
  deleteUser,
  listUsers,
  setUserRole,
  type ManagedUser,
} from "@/lib/api/users.functions";
import { formatDateTime, formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — School LMS" },
      {
        name: "description",
        content: "Create and manage portal accounts and assign admin, teacher or student roles.",
      },
      { property: "og:title", content: "User Management — School LMS" },
      {
        property: "og:description",
        content: "Create and manage portal accounts and assign roles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

const ROLE_OPTIONS = ["admin", "teacher", "student", "parent", "librarian", "accountant"] as const;
type Role = (typeof ROLE_OPTIONS)[number];

function UsersPage() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const updateRole = useServerFn(setUserRole);
  const removeUser = useServerFn(deleteUser);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["managed-users"],
    queryFn: () => fetchUsers(),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { user_id: string; role: Role }) => updateRole({ data: vars }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["managed-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (user_id: string) => removeUser({ data: { user_id } }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["managed-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = (data ?? []) as ManagedUser[];

  const activeFilterCount = (roleFilter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQ =
        !q ||
        (u.full_name?.toLowerCase().includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false);
      const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter as Role);
      return matchesQ && matchesRole;
    });
  }, [users, search, roleFilter]);

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mtis-eyebrow mb-1">Access control</p>
          <h1 className="font-display text-2xl font-bold tracking-tight">User management</h1>
          <p className="text-sm text-muted-foreground">
            Create portal accounts and assign roles for admins, teachers and students.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> New user
            </Button>
          </DialogTrigger>
          <AddUserDialog onDone={() => setOpen(false)} />
        </Dialog>
      </div>

      <div className="mtis-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{formatStatus(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilterCount > 1 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" /> Clear filters
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {users.length} users
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="mtis-card p-8 text-center text-sm text-destructive">
          {(error as Error).message}
        </div>
      ) : (
        <div className="mtis-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary-pale/50 text-left">
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Last sign-in</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={u.roles[0] ?? ""}
                        onValueChange={(v) =>
                          roleMutation.mutate({ user_id: u.id, role: v as Role })
                        }
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="No role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {formatStatus(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {u.roles.includes("admin") && (
                        <Badge variant="secondary">
                          <ShieldCheck className="size-3 mr-1" /> Admin
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${u.email}? This cannot be undone.`))
                          deleteMutation.mutate(u.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

function AddUserDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const addUser = useServerFn(createUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const { data: students } = useQuery({
    queryKey: ["students-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_no")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, employee_no")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () =>
      addUser({
        data: {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role,
          link_student_id: role === "student" && studentId ? studentId : null,
          link_teacher_id: role === "teacher" && teacherId ? teacherId : null,
        },
      }),
    onSuccess: () => {
      toast.success("User created");
      qc.invalidateQueries({ queryKey: ["managed-users"] });
      setEmail("");
      setPassword("");
      setFullName("");
      setStudentId("");
      setTeacherId("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New user</DialogTitle>
        <DialogDescription>
          The account is created immediately and can sign in right away.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
          </div>
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {formatStatus(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {role === "student" && (
          <div>
            <Label>Link to student record (optional)</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick student" />
              </SelectTrigger>
              <SelectContent>
                {(students ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} · {s.admission_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Linking lets the student see their own class timetable.
            </p>
          </div>
        )}
        {role === "teacher" && (
          <div>
            <Label>Link to teacher record (optional)</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick teacher" />
              </SelectTrigger>
              <SelectContent>
                {(teachers ?? []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name} · {t.employee_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create user"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
