import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CalendarX, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import type { CalcType } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/admin/setup/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll Deductions" },
      {
        name: "description",
        content: "Configure persistent payroll deductions and stepped attendance deduction rules.",
      },
      { property: "og:title", content: "Payroll Deductions" },
      {
        property: "og:description",
        content: "Persistent deduction components and absence-based payroll rules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayrollSetupPage,
});

type Deduction = {
  id: string;
  name: string;
  calc_type: CalcType;
  value: number;
  is_active: boolean;
};
type Rule = {
  id: string;
  name: string;
  per_n_absences: number;
  step_type: CalcType;
  step_value: number;
  is_active: boolean;
};

function PayrollSetupPage() {
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Configuration</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Payroll deductions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Persistent deductions apply to every run until deactivated. Attendance rules are stepped
            against each employee&apos;s base salary.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/settings">
            <ArrowLeft /> Back to settings
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="deductions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deductions">
            <Minus className="mr-2 size-4" /> Deductions
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <CalendarX className="mr-2 size-4" /> Attendance rules
          </TabsTrigger>
        </TabsList>
        <TabsContent value="deductions">
          <DeductionsTab />
        </TabsContent>
        <TabsContent value="attendance">
          <RulesTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function DeductionsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", calc_type: "flat" as CalcType, value: "" });

  const { data } = useQuery({
    queryKey: ["deduction_components"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deduction_components")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as Deduction[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("deduction_components").insert({
        name: form.name.trim(),
        calc_type: form.calc_type,
        value: Number(form.value || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", calc_type: "flat", value: "" });
      toast.success("Deduction added");
      qc.invalidateQueries({ queryKey: ["deduction_components"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (d: Deduction) => {
      const { error } = await supabase
        .from("deduction_components")
        .update({ is_active: !d.is_active })
        .eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deduction_components"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deduction_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deduction removed");
      qc.invalidateQueries({ queryKey: ["deduction_components"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-xs font-semibold">Deduction name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Income Tax, Provident Fund…"
            />
          </div>
          <div className="w-36 space-y-1.5">
            <Label className="text-xs font-semibold">Type</Label>
            <Select
              value={form.calc_type}
              onValueChange={(v) => setForm({ ...form, calc_type: v as CalcType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="percent">Percent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1.5">
            <Label className="text-xs font-semibold">Value</Label>
            <Input
              type="number"
              min="0"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus /> Add
          </Button>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No persistent deductions configured.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">
                    {d.calc_type === "percent" ? `${d.value}% of base` : d.value}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={d.is_active ? "success" : "secondary"}>
                      {d.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Switch checked={d.is_active} onCheckedChange={() => toggle.mutate(d)} />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => remove.mutate(d.id)}
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

function RulesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "Absence deduction",
    per_n_absences: "2",
    step_type: "percent" as CalcType,
    step_value: "2",
  });

  const { data } = useQuery({
    queryKey: ["attendance_deduction_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_deduction_rules")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as Rule[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance_deduction_rules").insert({
        name: form.name.trim() || "Absence deduction",
        per_n_absences: Math.max(1, Number(form.per_n_absences || 1)),
        step_type: form.step_type,
        step_value: Number(form.step_value || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule added");
      qc.invalidateQueries({ queryKey: ["attendance_deduction_rules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (r: Rule) => {
      const { error } = await supabase
        .from("attendance_deduction_rules")
        .update({ is_active: !r.is_active })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance_deduction_rules"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance_deduction_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance_deduction_rules"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4">
        <p className="text-sm text-muted-foreground">
          Stepped rule: <code>deduction = floor(absences / every N) × step</code>. Example: every 2
          absences deducts 2% — 4 absences deduct 4%.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1 space-y-1.5">
            <Label className="text-xs font-semibold">Rule name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="w-36 space-y-1.5">
            <Label className="text-xs font-semibold">Every N absences</Label>
            <Input
              type="number"
              min="1"
              value={form.per_n_absences}
              onChange={(e) => setForm({ ...form, per_n_absences: e.target.value })}
            />
          </div>
          <div className="w-36 space-y-1.5">
            <Label className="text-xs font-semibold">Step type</Label>
            <Select
              value={form.step_type}
              onValueChange={(v) => setForm({ ...form, step_type: v as CalcType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="percent">Percent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1.5">
            <Label className="text-xs font-semibold">Step value</Label>
            <Input
              type="number"
              min="0"
              value={form.step_value}
              onChange={(e) => setForm({ ...form, step_value: e.target.value })}
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus /> Add rule
          </Button>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No attendance rules configured.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Step</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Every {r.per_n_absences} absences → {r.step_value}
                    {r.step_type === "percent" ? "%" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.is_active ? "success" : "secondary"}>
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Switch checked={r.is_active} onCheckedChange={() => toggle.mutate(r)} />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => remove.mutate(r.id)}
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
