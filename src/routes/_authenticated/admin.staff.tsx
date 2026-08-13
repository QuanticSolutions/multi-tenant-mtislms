import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDate, formatStatus } from "@/lib/format";
import { StaffAttendancePanel } from "@/components/admin/staff-attendance-panel";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff Attendance & Payroll — Madina Tul Ilm" },
      { name: "description", content: "Track staff attendance and process monthly payroll runs." },
    ],
  }),
  component: StaffPage,
});

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function StaffPage() {
  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Module</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Staff Attendance & Payroll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily staff roll-call and monthly salary processing.
        </p>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <StaffAttendancePanel />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4 space-y-4">
          <PayrollTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* -------------------- PAYROLL -------------------- */

type PayrollRun = {
  id: string;
  period_month: number;
  period_year: number;
  status: "draft" | "finalized" | "paid";
  notes: string | null;
  processed_at: string | null;
};

type PayrollItem = {
  id: string;
  run_id: string;
  staff_id: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  bonus: number;
  net_pay: number;
  working_days: number | null;
  present_days: number | null;
  notes: string | null;
};

function PayrollTab() {
  const qc = useQueryClient();
  const now = new Date();
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [newMonth, setNewMonth] = useState<number>(now.getMonth() + 1);
  const [newYear, setNewYear] = useState<number>(now.getFullYear());

  const { data: runs } = useQuery({
    queryKey: ["payroll-runs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payroll_runs")
        .select("*")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      if (error) throw error;
      return data as PayrollRun[];
    },
  });

  useEffect(() => {
    if (!selectedRunId && runs?.length) setSelectedRunId(runs[0].id);
  }, [runs, selectedRunId]);

  const selectedRun = runs?.find((r) => r.id === selectedRunId);

  const { data: items } = useQuery({
    queryKey: ["payroll-items", selectedRunId],
    enabled: !!selectedRunId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payroll_items")
        .select("*, teachers:staff_id(full_name, employee_no)")
        .eq("run_id", selectedRunId)
        .order("created_at");
      if (error) throw error;
      return data as (PayrollItem & { teachers: { full_name: string; employee_no: string } })[];
    },
  });

  const createRun = useMutation({
    mutationFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
      const { data, error } = await (supabase as any)
        .from("payroll_runs")
        .insert({ period_month: newMonth, period_year: newYear, status: "draft", processed_by: uid })
        .select()
        .single();
      if (error) throw error;
      return data as PayrollRun;
    },
    onSuccess: (r) => {
      toast.success("Payroll run created");
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      setSelectedRunId(r.id);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create run"),
  });

  const generateItems = useMutation({
    mutationFn: async () => {
      if (!selectedRun) throw new Error("Pick a run");
      const { data: staff, error: se } = await supabase
        .from("teachers")
        .select("id")
        .eq("status", "active");
      if (se) throw se;

      // working days = days in month; present days from attendance
      const daysInMonth = new Date(selectedRun.period_year, selectedRun.period_month, 0).getDate();
      const start = `${selectedRun.period_year}-${String(selectedRun.period_month).padStart(2,"0")}-01`;
      const end = `${selectedRun.period_year}-${String(selectedRun.period_month).padStart(2,"0")}-${String(daysInMonth).padStart(2,"0")}`;

      const { data: att, error: ae } = await (supabase as any)
        .from("staff_attendance")
        .select("staff_id, status")
        .gte("date", start)
        .lte("date", end);
      if (ae) throw ae;

      const presentMap: Record<string, number> = {};
      for (const a of (att ?? []) as { staff_id: string; status: string }[]) {
        const inc = a.status === "present" || a.status === "late" ? 1 : a.status === "half_day" ? 0.5 : 0;
        presentMap[a.staff_id] = (presentMap[a.staff_id] ?? 0) + inc;
      }

      const payload = (staff ?? []).map((s) => ({
        run_id: selectedRun.id,
        staff_id: s.id,
        basic_salary: 0,
        allowances: 0,
        deductions: 0,
        bonus: 0,
        net_pay: 0,
        working_days: daysInMonth,
        present_days: Math.round(presentMap[s.id] ?? 0),
      }));
      const { error } = await (supabase as any)
        .from("payroll_items")
        .upsert(payload, { onConflict: "run_id,staff_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payroll items generated");
      qc.invalidateQueries({ queryKey: ["payroll-items", selectedRunId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const updateItem = useMutation({
    mutationFn: async (item: Partial<PayrollItem> & { id: string }) => {
      const net =
        Number(item.basic_salary ?? 0) +
        Number(item.allowances ?? 0) +
        Number(item.bonus ?? 0) -
        Number(item.deductions ?? 0);
      const { error } = await (supabase as any)
        .from("payroll_items")
        .update({ ...item, net_pay: net })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll-items", selectedRunId] }),
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const setStatus = useMutation({
    mutationFn: async (status: PayrollRun["status"]) => {
      if (!selectedRun) return;
      const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
      const { error } = await (supabase as any)
        .from("payroll_runs")
        .update({
          status,
          processed_by: uid,
          processed_at: status === "draft" ? null : new Date().toISOString(),
        })
        .eq("id", selectedRun.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Run updated");
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const deleteRun = useMutation({
    mutationFn: async () => {
      if (!selectedRun) return;
      const { error } = await (supabase as any).from("payroll_runs").delete().eq("id", selectedRun.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Run deleted");
      setSelectedRunId("");
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const totals = useMemo(() => {
    const t = { basic: 0, allow: 0, ded: 0, bonus: 0, net: 0 };
    for (const it of items ?? []) {
      t.basic += Number(it.basic_salary);
      t.allow += Number(it.allowances);
      t.ded += Number(it.deductions);
      t.bonus += Number(it.bonus);
      t.net += Number(it.net_pay);
    }
    return t;
  }, [items]);

  const locked = selectedRun?.status !== "draft";
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <>
      <div className="mtis-card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_140px_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Existing runs</label>
              <Select value={selectedRunId} onValueChange={setSelectedRunId}>
                <SelectTrigger><SelectValue placeholder="Select a payroll run" /></SelectTrigger>
                <SelectContent>
                  {(runs ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {MONTHS[r.period_month - 1]} {r.period_year} — {formatStatus(r.status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">New month</label>
              <Select value={String(newMonth)} onValueChange={(v) => setNewMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Year</label>
              <Select value={String(newYear)} onValueChange={(v) => setNewYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => createRun.mutate()} disabled={createRun.isPending}>
                <Plus /> New run
              </Button>
            </div>
          </div>
          <div className="flex items-end gap-2">
            {selectedRun && !locked && (
              <>
                <Button variant="outline" onClick={() => generateItems.mutate()} disabled={generateItems.isPending}>
                  <Calculator /> Generate items
                </Button>
                <Button onClick={() => setStatus.mutate("finalized")}>
                  <CheckCircle2 /> Finalize
                </Button>
                <Button variant="ghost" size="icon" onClick={() => {
                  if (confirm("Delete this payroll run?")) deleteRun.mutate();
                }}>
                  <Trash2 />
                </Button>
              </>
            )}
            {selectedRun?.status === "finalized" && (
              <>
                <Button variant="outline" onClick={() => setStatus.mutate("draft")}>Reopen</Button>
                <Button onClick={() => setStatus.mutate("paid")}>Mark paid</Button>
              </>
            )}
            {selectedRun?.status === "paid" && (
              <Badge variant="success">Paid on {formatDate(selectedRun.processed_at)}</Badge>
            )}
          </div>
        </div>

        {selectedRun && (
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            <Kpi label="Basic" value={totals.basic} />
            <Kpi label="Allowances" value={totals.allow} />
            <Kpi label="Bonus" value={totals.bonus} />
            <Kpi label="Deductions" value={totals.ded} />
            <Kpi label="Net payout" value={totals.net} highlight />
          </div>
        )}
      </div>

      <div className="mtis-card overflow-hidden">
        {!selectedRun ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Create or select a payroll run to begin.
          </div>
        ) : !items || items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No items yet. Click <b>Generate items</b> to prefill from active staff and attendance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-background">
                  <Th>Staff</Th>
                  <Th className="w-[90px]">Days</Th>
                  <Th className="w-[130px]">Basic</Th>
                  <Th className="w-[130px]">Allowances</Th>
                  <Th className="w-[130px]">Bonus</Th>
                  <Th className="w-[130px]">Deductions</Th>
                  <Th className="w-[130px]">Net pay</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <PayrollRow
                    key={it.id}
                    item={it}
                    locked={!!locked}
                    onSave={(patch) => updateItem.mutate({ id: it.id, ...patch })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function PayrollRow({
  item,
  locked,
  onSave,
}: {
  item: PayrollItem & { teachers: { full_name: string; employee_no: string } };
  locked: boolean;
  onSave: (patch: Partial<PayrollItem>) => void;
}) {
  const [basic, setBasic] = useState(String(item.basic_salary));
  const [allow, setAllow] = useState(String(item.allowances));
  const [bonus, setBonus] = useState(String(item.bonus));
  const [ded, setDed] = useState(String(item.deductions));

  useEffect(() => {
    setBasic(String(item.basic_salary));
    setAllow(String(item.allowances));
    setBonus(String(item.bonus));
    setDed(String(item.deductions));
  }, [item.basic_salary, item.allowances, item.bonus, item.deductions]);

  const net =
    (Number(basic) || 0) + (Number(allow) || 0) + (Number(bonus) || 0) - (Number(ded) || 0);

  function commit() {
    onSave({
      basic_salary: Number(basic) || 0,
      allowances: Number(allow) || 0,
      bonus: Number(bonus) || 0,
      deductions: Number(ded) || 0,
    });
  }

  return (
    <tr className="border-t border-border hover:bg-primary-pale/40">
      <Td>
        <div className="font-medium">{item.teachers?.full_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{item.teachers?.employee_no}</div>
      </Td>
      <Td className="text-xs text-muted-foreground">
        {item.present_days ?? 0} / {item.working_days ?? 0}
      </Td>
      <Td><NumInput value={basic} onChange={setBasic} onBlur={commit} disabled={locked} /></Td>
      <Td><NumInput value={allow} onChange={setAllow} onBlur={commit} disabled={locked} /></Td>
      <Td><NumInput value={bonus} onChange={setBonus} onBlur={commit} disabled={locked} /></Td>
      <Td><NumInput value={ded} onChange={setDed} onBlur={commit} disabled={locked} /></Td>
      <Td className="font-semibold text-primary">{net.toLocaleString()}</Td>
    </tr>
  );
}

function NumInput({
  value, onChange, onBlur, disabled,
}: { value: string; onChange: (v: string) => void; onBlur: () => void; disabled?: boolean }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      className="h-9"
    />
  );
}

function Kpi({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md border border-border p-3 ${highlight ? "bg-primary-pale" : "bg-background"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold ${highlight ? "text-primary" : ""}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

