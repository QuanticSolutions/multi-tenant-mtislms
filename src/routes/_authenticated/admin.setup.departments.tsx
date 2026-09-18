import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/setup/departments")({
  head: () => ({
    meta: [
      { title: "Departments — School LMS" },
      {
        name: "description",
        content: "Create teaching and non-teaching departments used across employee records.",
      },
      { property: "og:title", content: "Departments — School LMS" },
      { property: "og:description", content: "Manage school departments and their teaching flag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DepartmentsPage,
});

type Department = { id: string; name: string; is_teaching: boolean };

function DepartmentsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [isTeaching, setIsTeaching] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      return data as Department[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Department name is required");
      const { error } = await supabase
        .from("departments")
        .insert({ name: name.trim(), is_teaching: isTeaching });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setIsTeaching(false);
      toast.success("Department added");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (d: Department) => {
      const { error } = await supabase
        .from("departments")
        .update({ is_teaching: !d.is_teaching })
        .eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department removed");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Configuration</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Departments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark a department as teaching to show Subject and Fee Group on its employees; otherwise
            employees get a Designation field.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/settings">
            <ArrowLeft /> Back to settings
          </Link>
        </Button>
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label className="text-xs font-semibold">Department name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Teaching Staff, Front Desk, Cleaning…"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={isTeaching} onCheckedChange={setIsTeaching} id="is-teaching" />
            <Label htmlFor="is-teaching" className="text-sm">
              Teaching department
            </Label>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus /> Add department
          </Button>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <Building2 className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">No departments yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first department above — every employee must belong to one.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Conditional fields</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-primary-pale/40">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={d.is_teaching ? "success" : "secondary"}>
                      {d.is_teaching ? "Teaching" : "Non-teaching"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.is_teaching ? "Subject + Fee group" : "Designation"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => toggle.mutate(d)}>
                      Make {d.is_teaching ? "non-teaching" : "teaching"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => {
                        if (confirm(`Remove ${d.name}?`)) remove.mutate(d.id);
                      }}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
