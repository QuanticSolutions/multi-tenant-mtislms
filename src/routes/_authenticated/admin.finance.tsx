import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  GraduationCap,
  Check,
  Download,
  FileSpreadsheet,
  Receipt,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate, formatStatus } from "@/lib/format";
import { buildDocument, docBrand, printDocument, type DocBrand } from "@/lib/print";
import { useBranding } from "@/hooks/use-branding";
import { saveBrandedWorkbook } from "@/lib/xlsx-brand";
import {
  MONTHS,
  challanTotals,
  computePayrollForEmployee,
  currentPeriod,
  formatPeriod,
  money,
  round2,
  type CalcType,
  type ChallanBreakdownLine,
} from "@/lib/finance";
import { LedgerTab } from "@/components/admin/finance-ledger-tab";
import { ScholarshipsTab } from "@/components/admin/finance-scholarships-tab";

const FINANCE_TABS = ["income", "outgoing", "ledger", "scholarships"] as const;
type FinanceTab = (typeof FINANCE_TABS)[number];

export const Route = createFileRoute("/_authenticated/admin/finance")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: FINANCE_TABS.includes(search["tab"] as FinanceTab)
      ? (search["tab"] as FinanceTab)
      : ("income" as FinanceTab),
  }),
  head: () => ({
    meta: [
      { title: "Finance — School LMS" },
      {
        name: "description",
        content:
          "Track incoming student fee challans and outgoing staff payroll in one finance workspace.",
      },
      { property: "og:title", content: "Finance — School LMS" },
      {
        property: "og:description",
        content: "Student fee income and employee payroll for School LMS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancePage,
});

/* ------------------------------------------------------------------ types */

type ChallanStatus = "unpaid" | "pending_review" | "approved" | "rejected";

type Challan = {
  id: string;
  student_id: string;
  group_id: string | null;
  period: string;
  constituent_breakdown: ChallanBreakdownLine[];
  subtotal: number;
  discount_applied: number;
  total_due: number;
  status: ChallanStatus;
  uploaded_proof_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  students: { full_name: string; admission_no: string; classes: { name: string; section: string | null } | null } | null;
};

type StudentLite = {
  id: string;
  full_name: string;
  admission_no: string;
  class_id: string | null;
  status: string;
  discount_type: CalcType | null;
  discount_value: number;
};

function challanTone(s: ChallanStatus) {
  if (s === "approved") return "success" as const;
  if (s === "rejected") return "danger" as const;
  if (s === "pending_review") return "warning" as const;
  return "secondary" as const;
}

/* ------------------------------------------------------------------- page */

function FinancePage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { currency: ledgerCurrency } = useSchoolName();
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Module</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Finance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Income from student fees and outgoing staff payroll, with review before anything is committed.
          </p>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => navigate({ search: { tab: v as FinanceTab } })}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="income">
            <ArrowDownCircle className="mr-2 size-4" /> Income — student fees
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            <ArrowUpCircle className="mr-2 size-4" /> Outgoing — payroll
          </TabsTrigger>
          <TabsTrigger value="ledger">
            <BookOpen className="mr-2 size-4" /> Income & expenses
          </TabsTrigger>
          <TabsTrigger value="scholarships">
            <GraduationCap className="mr-2 size-4" /> Scholarships
          </TabsTrigger>
        </TabsList>
        <TabsContent value="income">
          <IncomeTab />
        </TabsContent>
        <TabsContent value="outgoing">
          <OutgoingTab />
        </TabsContent>
        <TabsContent value="ledger">
          <LedgerTab currency={ledgerCurrency} />
        </TabsContent>
        <TabsContent value="scholarships">
          <ScholarshipsTab currency={ledgerCurrency} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ----------------------------------------------------------------- income */

/** School profile used for document headers and currency formatting. */
function useSchoolBrand() {
  const { branding } = useBranding();
  return { brand: docBrand(branding), currency: branding?.currency ?? "PKR" };
}

function IncomeTab() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { brand, currency } = useSchoolBrand();
  const [period, setPeriod] = useState(currentPeriod());
  const [statusFilter, setStatusFilter] = useState("all");
  const [genOpen, setGenOpen] = useState(false);
  const [reviewing, setReviewing] = useState<Challan | null>(null);

  const { data: challans, isLoading } = useQuery({
    queryKey: ["fee_challans", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_challans")
        .select(
          "*, students(full_name, admission_no, classes(name, section))",
        )
        .eq("period", period)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Challan[];
    },
  });

  const rows = challans ?? [];
  const filtered = rows.filter((r) => statusFilter === "all" || r.status === statusFilter);

  const totals = useMemo(() => {
    const billed = round2(rows.reduce((s, r) => s + Number(r.total_due), 0));
    const collected = round2(
      rows.filter((r) => r.status === "approved").reduce((s, r) => s + Number(r.total_due), 0),
    );
    const pending = rows.filter((r) => r.status === "pending_review").length;
    return { billed, collected, outstanding: round2(billed - collected), pending };
  }, [rows]);

  const decide = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: ChallanStatus;
      reason?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("fee_challans")
        .update({
          status,
          rejection_reason: status === "rejected" ? reason ?? null : null,
          reviewed_by: u.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challan updated");
      setReviewing(null);
      qc.invalidateQueries({ queryKey: ["fee_challans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function printChallan(c: Challan) {
    const html = buildDocument({
      title: "Fee Challan",
      brand,
      subtitle: `Billing period ${formatPeriod(c.period)}`,
      meta: [
        { label: "Student", value: c.students?.full_name ?? "—" },
        { label: "Admission no", value: c.students?.admission_no ?? "—" },
        {
          label: "Class",
          value: c.students?.classes
            ? `${c.students.classes.name}${c.students.classes.section ? ` — ${c.students.classes.section}` : ""}`
            : "—",
        },
        { label: "Status", value: formatStatus(c.status) },
      ],
      tableHead: ["Fee constituent", "Amount"],
      tableRows: (c.constituent_breakdown ?? []).map((l) => [l.name, money(l.amount, currency)]),
      totals: [
        { label: "Subtotal", value: money(c.subtotal, currency) },
        { label: "Discount", value: `- ${money(c.discount_applied, currency)}` },
        { label: "Total payable", value: money(c.total_due, currency), strong: true },
      ],
      footnote: "Please attach the deposit slip when uploading your payment proof.",
    });
    printDocument(html);
  }

  async function openProof(path: string) {
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 300);
    if (error || !data) {
      toast.error(error?.message ?? "Could not open proof");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-4">
      <div className="mtis-card flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Billing period</Label>
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-[170px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(["unpaid", "pending_review", "approved", "rejected"] as ChallanStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/setup/fees">
              <Settings2 /> Configure fee groups
            </Link>
          </Button>
          {can("finance", "write") && (
            <Button onClick={() => setGenOpen(true)}>
              <Sparkles /> Generate challans
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Billed" value={money(totals.billed, currency)} />
        <Stat label="Collected" value={money(totals.collected, currency)} />
        <Stat label="Outstanding" value={money(totals.outstanding, currency)} />
        <Stat label="Awaiting review" value={String(totals.pending)} />
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading challans…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <Receipt className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">
              No challans for {formatPeriod(period)}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Generate challans to bill every student from their class fee group.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Payable</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-primary-pale/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.students?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.students?.admission_no ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.students?.classes?.name ?? "—"}
                    {c.students?.classes?.section ? ` — ${c.students.classes.section}` : ""}
                  </td>
                  <td className="px-4 py-3 text-right">{money(c.subtotal, currency)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {c.discount_applied ? `- ${money(c.discount_applied, currency)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{money(c.total_due, currency)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={challanTone(c.status)}>{formatStatus(c.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => printChallan(c)}>
                        <Download className="size-4" /> PDF
                      </Button>
                      {c.uploaded_proof_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openProof(c.uploaded_proof_url!)}
                        >
                          Proof
                        </Button>
                      )}
                      {c.status === "pending_review" && can("finance", "update") && (
                        <Button variant="outline" size="sm" onClick={() => setReviewing(c)}>
                          Review
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {genOpen && (
        <GenerateChallansDialog
          period={period}
          existing={rows}
          currency={currency}
          onClose={() => setGenOpen(false)}
        />
      )}

      {reviewing && (
        <ReviewChallanDialog
          challan={reviewing}
          currency={currency}
          onOpenProof={openProof}
          onClose={() => setReviewing(null)}
          onDecide={(status, reason) => decide.mutate({ id: reviewing.id, status, reason })}
          pending={decide.isPending}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mtis-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}

type PreviewRow = {
  student: StudentLite;
  groupId: string | null;
  groupName: string | null;
  lines: ChallanBreakdownLine[];
  subtotal: number;
  discount: number;
  total: number;
  skipped: boolean;
  reason?: string;
};

function GenerateChallansDialog({
  period,
  existing,
  currency,
  onClose,
}: {
  period: string;
  existing: Challan[];
  currency: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["challan-preview-source"],
    queryFn: async () => {
      const [students, groups, gc, constituents] = await Promise.all([
        supabase
          .from("students")
          .select("id, full_name, admission_no, class_id, status, discount_type, discount_value")
          .eq("status", "active"),
        supabase.from("fee_groups").select("id, name, class_ids, is_active").eq("is_active", true),
        supabase.from("fee_group_constituents").select("group_id, constituent_id, amount"),
        supabase.from("fee_constituents").select("id, name, is_active"),
      ]);
      if (students.error) throw students.error;
      if (groups.error) throw groups.error;
      if (gc.error) throw gc.error;
      if (constituents.error) throw constituents.error;
      return {
        students: (students.data ?? []) as unknown as StudentLite[],
        groups: (groups.data ?? []) as { id: string; name: string; class_ids: string[] }[],
        gc: (gc.data ?? []) as { group_id: string; constituent_id: string; amount: number }[],
        constituents: (constituents.data ?? []) as { id: string; name: string; is_active: boolean }[],
      };
    },
  });

  const preview: PreviewRow[] = useMemo(() => {
    if (!data) return [];
    const already = new Set(existing.map((c) => c.student_id));
    const cName = new Map(data.constituents.map((c) => [c.id, c]));
    return data.students.map((s) => {
      if (already.has(s.id)) {
        return {
          student: s,
          groupId: null,
          groupName: null,
          lines: [],
          subtotal: 0,
          discount: 0,
          total: 0,
          skipped: true,
          reason: "Already billed",
        };
      }
      const group = s.class_id
        ? data.groups.find((g) => (g.class_ids ?? []).includes(s.class_id!))
        : undefined;
      if (!group) {
        return {
          student: s,
          groupId: null,
          groupName: null,
          lines: [],
          subtotal: 0,
          discount: 0,
          total: 0,
          skipped: true,
          reason: s.class_id ? "No fee group for class" : "No class assigned",
        };
      }
      const lines: ChallanBreakdownLine[] = data.gc
        .filter((x) => x.group_id === group.id)
        .map((x) => ({ name: cName.get(x.constituent_id)?.name ?? "Fee", amount: Number(x.amount) }))
        .filter((l) => cName.size === 0 || l.amount >= 0);
      const t = challanTotals(lines, s.discount_type, Number(s.discount_value ?? 0));
      return {
        student: s,
        groupId: group.id,
        groupName: group.name,
        lines,
        subtotal: t.subtotal,
        discount: t.discount,
        total: t.total,
        skipped: lines.length === 0,
        reason: lines.length === 0 ? "Fee group has no constituents" : undefined,
      };
    });
  }, [data, existing]);

  const billable = preview.filter((p) => !p.skipped);
  const skipped = preview.filter((p) => p.skipped);

  const commit = useMutation({
    mutationFn: async () => {
      if (billable.length === 0) throw new Error("Nothing to generate");
      const payload = billable.map((p) => ({
        student_id: p.student.id,
        group_id: p.groupId,
        period,
        constituent_breakdown: p.lines,
        subtotal: p.subtotal,
        discount_applied: p.discount,
        total_due: p.total,
        status: "unpaid" as ChallanStatus,
      }));
      for (let i = 0; i < payload.length; i += 200) {
        const { error } = await supabase.from("fee_challans").insert(payload.slice(i, i + 200));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`${billable.length} challans generated`);
      qc.invalidateQueries({ queryKey: ["fee_challans"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grand = round2(billable.reduce((s, p) => s + p.total, 0));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generate challans — {formatPeriod(period)}</DialogTitle>
          <DialogDescription>
            Review the computed billing below. Nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Building preview…</div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="To generate" value={String(billable.length)} />
              <Stat label="Skipped" value={String(skipped.length)} />
              <Stat label="Total billed" value={money(grand, currency)} />
            </div>

            <div className="max-h-[320px] overflow-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Fee group</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {billable.map((p) => (
                    <tr key={p.student.id} className="border-t border-border">
                      <td className="px-3 py-2">{p.student.full_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.groupName}</td>
                      <td className="px-3 py-2 text-right">{money(p.subtotal, currency)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {p.discount ? `- ${money(p.discount, currency)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{money(p.total, currency)}</td>
                    </tr>
                  ))}
                  {skipped.map((p) => (
                    <tr key={p.student.id} className="border-t border-border text-muted-foreground">
                      <td className="px-3 py-2">{p.student.full_name}</td>
                      <td className="px-3 py-2" colSpan={4}>
                        <Badge variant="secondary">{p.reason}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={commit.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => commit.mutate()}
            disabled={commit.isPending || billable.length === 0}
          >
            {commit.isPending ? "Generating…" : `Generate ${billable.length} challans`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewChallanDialog({
  challan,
  currency,
  onClose,
  onDecide,
  onOpenProof,
  pending,
}: {
  challan: Challan;
  currency: string;
  onClose: () => void;
  onDecide: (status: ChallanStatus, reason?: string) => void;
  onOpenProof: (path: string) => void;
  pending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review payment</DialogTitle>
          <DialogDescription>
            {challan.students?.full_name} — {formatPeriod(challan.period)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-md border border-border p-3 text-sm">
          {(challan.constituent_breakdown ?? []).map((l, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-muted-foreground">{l.name}</span>
              <span>{money(l.amount, currency)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total payable</span>
            <span>{money(challan.total_due, currency)}</span>
          </div>
        </div>

        {challan.uploaded_proof_url ? (
          <Button variant="outline" onClick={() => onOpenProof(challan.uploaded_proof_url!)}>
            View uploaded proof
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No proof uploaded.</p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Rejection reason (if rejecting)</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onDecide("rejected", reason)}
            disabled={pending}
          >
            <X className="size-4" /> Reject
          </Button>
          <Button onClick={() => onDecide("approved")} disabled={pending}>
            <Check className="size-4" /> Approve payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- outgoing */

type Employee = {
  id: string;
  full_name: string;
  employee_no: string;
  designation: string | null;
  base_salary: number;
  status: string;
  departments: { name: string; is_teaching: boolean } | null;
};

type RunRow = {
  id: string;
  period_month: number;
  period_year: number;
  status: string;
  notes: string | null;
  created_at: string;
};

function OutgoingTab() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { brand, currency } = useSchoolBrand();
  const [genOpen, setGenOpen] = useState(false);
  const [openRun, setOpenRun] = useState<RunRow | null>(null);

  const { data: runs, isLoading } = useQuery({
    queryKey: ["payroll_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_runs")
        .select("*")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RunRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll_runs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payroll run deleted");
      qc.invalidateQueries({ queryKey: ["payroll_runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="mtis-card flex flex-wrap items-center gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          Payroll uses each employee&apos;s base salary, stepped attendance deductions, persistent
          deduction components and any one-off bonuses you add during review.
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/setup/payroll">
              <Settings2 /> Configure deductions
            </Link>
          </Button>
          {can("payroll", "write") && (
            <Button onClick={() => setGenOpen(true)}>
              <Sparkles /> Generate payroll
            </Button>
          )}
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading payroll runs…</div>
        ) : (runs ?? []).length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <ArrowUpCircle className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">No payroll runs yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Generate a monthly run to review salaries before committing them.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(runs ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-primary-pale/40">
                  <td className="px-4 py-3 font-medium">
                    {MONTHS[r.period_month - 1]} {r.period_year}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === "paid" ? "success" : r.status === "finalized" ? "info" : "secondary"}>
                      {formatStatus(r.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setOpenRun(r)}>
                      Open
                    </Button>
                    {can("payroll", "delete") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this payroll run?")) del.mutate(r.id);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {genOpen && (
        <GeneratePayrollDialog currency={currency} onClose={() => setGenOpen(false)} />
      )}
      {openRun && (
        <RunDetailDialog
          run={openRun}
          currency={currency}
          brand={brand}
          onClose={() => setOpenRun(null)}
        />
      )}
    </div>
  );
}

type BonusDraft = { key: string; employeeId: string | "all"; name: string; calc_type: CalcType; value: string };

function GeneratePayrollDialog({
  currency,
  onClose,
}: {
  currency: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [bonuses, setBonuses] = useState<BonusDraft[]>([]);
  const [notes, setNotes] = useState("");

  const m = Number(month);
  const y = Number(year);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const monthEnd = new Date(y, m, 0).toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["payroll-source", y, m],
    queryFn: async () => {
      const [emps, deductions, rules, attendance] = await Promise.all([
        supabase
          .from("teachers")
          .select("id, full_name, employee_no, designation, base_salary, status, departments(name, is_teaching)")
          .in("status", ["active", "probation", "on_leave"]),
        supabase.from("deduction_components").select("name, calc_type, value").eq("is_active", true),
        supabase
          .from("attendance_deduction_rules")
          .select("name, per_n_absences, step_type, step_value")
          .eq("is_active", true),
        supabase
          .from("staff_attendance")
          .select("staff_id, status")
          .gte("date", monthStart)
          .lte("date", monthEnd),
      ]);
      if (emps.error) throw emps.error;
      if (deductions.error) throw deductions.error;
      if (rules.error) throw rules.error;
      if (attendance.error) throw attendance.error;
      return {
        employees: (emps.data ?? []) as unknown as Employee[],
        deductions: (deductions.data ?? []) as { name: string; calc_type: CalcType; value: number }[],
        rules: (rules.data ?? []) as {
          name: string;
          per_n_absences: number;
          step_type: CalcType;
          step_value: number;
        }[],
        attendance: (attendance.data ?? []) as { staff_id: string; status: string }[],
      };
    },
  });

  const computed = useMemo(() => {
    if (!data) return [];
    return data.employees.map((e) => {
      const records = data.attendance.filter((a) => a.staff_id === e.id);
      const absences = records.filter((a) => a.status === "absent").length;
      const present = records.filter((a) => a.status !== "absent").length;
      const applicable = bonuses
        .filter((b) => b.employeeId === "all" || b.employeeId === e.id)
        .map((b) => ({ name: b.name || "Bonus", calc_type: b.calc_type, value: Number(b.value || 0) }));
      const result = computePayrollForEmployee({
        baseSalary: Number(e.base_salary ?? 0),
        absences,
        attendanceRules: data.rules,
        deductions: data.deductions,
        bonuses: applicable,
      });
      return { employee: e, absences, workingDays: records.length, presentDays: present, ...result };
    });
  }, [data, bonuses]);

  const grandNet = round2(computed.reduce((s, c) => s + c.net, 0));

  const commit = useMutation({
    mutationFn: async () => {
      if (computed.length === 0) throw new Error("No employees to pay");
      const { data: u } = await supabase.auth.getUser();
      const { data: run, error: runErr } = await supabase
        .from("payroll_runs")
        .insert({
          period_month: m,
          period_year: y,
          status: "finalized",
          notes: notes || null,
          processed_by: u.user?.id ?? null,
          processed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (runErr) throw runErr;
      const runId = run.id as string;

      if (bonuses.length > 0) {
        const { error } = await supabase.from("payroll_run_bonus_lines").insert(
          bonuses.map((b) => ({
            payroll_run_id: runId,
            employee_id: b.employeeId === "all" ? null : b.employeeId,
            name: b.name || "Bonus",
            calc_type: b.calc_type,
            value: Number(b.value || 0),
          })),
        );
        if (error) throw error;
      }

      const { data: items, error: itemsErr } = await supabase
        .from("payroll_items")
        .insert(
          computed.map((c) => ({
            run_id: runId,
            staff_id: c.employee.id,
            basic_salary: c.base,
            allowances: 0,
            deductions: c.deductions,
            bonus: c.bonus,
            net_pay: c.net,
            working_days: c.workingDays,
            present_days: c.presentDays,
          })),
        )
        .select("id, staff_id");
      if (itemsErr) throw itemsErr;

      const byStaff = new Map((items ?? []).map((i) => [i.staff_id as string, i.id as string]));
      const lines = computed.flatMap((c) =>
        c.lines.map((l) => ({
          payroll_item_id: byStaff.get(c.employee.id)!,
          label: l.label,
          type: l.type,
          source: l.source,
          amount: l.amount,
        })),
      );
      for (let i = 0; i < lines.length; i += 300) {
        const { error } = await supabase.from("payroll_item_lines").insert(lines.slice(i, i + 300));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Payroll run created");
      qc.invalidateQueries({ queryKey: ["payroll_runs"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Generate payroll</DialogTitle>
          <DialogDescription>
            Review computed salaries, add one-off bonuses, then commit the run.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, i) => (
                  <SelectItem key={name} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Year</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-[110px]"
            />
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total net pay</p>
            <p className="font-display text-xl font-bold">{money(grandNet, currency)}</p>
          </div>
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">One-off bonuses for this run</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setBonuses((b) => [
                  ...b,
                  {
                    key: crypto.randomUUID(),
                    employeeId: "all",
                    name: "",
                    calc_type: "flat",
                    value: "",
                  },
                ])
              }
            >
              Add bonus
            </Button>
          </div>
          {bonuses.length > 0 && (
            <div className="mt-3 space-y-2">
              {bonuses.map((b) => (
                <div key={b.key} className="flex flex-wrap items-center gap-2">
                  <Select
                    value={b.employeeId}
                    onValueChange={(v) =>
                      setBonuses((list) =>
                        list.map((x) => (x.key === b.key ? { ...x, employeeId: v } : x)),
                      )
                    }
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All employees</SelectItem>
                      {(data?.employees ?? []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Label (Eid bonus)"
                    value={b.name}
                    onChange={(e) =>
                      setBonuses((list) =>
                        list.map((x) => (x.key === b.key ? { ...x, name: e.target.value } : x)),
                      )
                    }
                    className="w-[200px]"
                  />
                  <Select
                    value={b.calc_type}
                    onValueChange={(v) =>
                      setBonuses((list) =>
                        list.map((x) => (x.key === b.key ? { ...x, calc_type: v as CalcType } : x)),
                      )
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="percent">Percent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="0"
                    value={b.value}
                    onChange={(e) =>
                      setBonuses((list) =>
                        list.map((x) => (x.key === b.key ? { ...x, value: e.target.value } : x)),
                      )
                    }
                    className="w-[120px]"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove bonus"
                    onClick={() => setBonuses((list) => list.filter((x) => x.key !== b.key))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Computing payroll…</div>
        ) : (
          <div className="max-h-[300px] overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2 text-right">Base</th>
                  <th className="px-3 py-2 text-right">Absences</th>
                  <th className="px-3 py-2 text-right">Deductions</th>
                  <th className="px-3 py-2 text-right">Bonus</th>
                  <th className="px-3 py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {computed.map((c) => (
                  <tr key={c.employee.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{c.employee.full_name}</div>
                      <div className="text-xs text-muted-foreground">{c.employee.employee_no}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {c.employee.departments?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{money(c.base, currency)}</td>
                    <td className="px-3 py-2 text-right">{c.absences}</td>
                    <td className="px-3 py-2 text-right text-danger">
                      {c.deductions ? `- ${money(c.deductions, currency)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{c.bonus ? money(c.bonus, currency) : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{money(c.net, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={commit.isPending}>
            Cancel
          </Button>
          <Button onClick={() => commit.mutate()} disabled={commit.isPending || computed.length === 0}>
            {commit.isPending ? "Saving…" : `Commit payroll (${computed.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ItemRow = {
  id: string;
  staff_id: string;
  basic_salary: number;
  deductions: number;
  bonus: number;
  net_pay: number;
  working_days: number | null;
  present_days: number | null;
  teachers: { full_name: string; employee_no: string; designation: string | null } | null;
  payroll_item_lines: { label: string; type: string; amount: number }[];
};

function RunDetailDialog({
  run,
  currency,
  brand,
  onClose,
}: {
  run: RunRow;
  currency: string;
  brand: DocBrand;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { can } = usePermissions();

  const { data, isLoading } = useQuery({
    queryKey: ["payroll_items", run.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_items")
        .select(
          "id, staff_id, basic_salary, deductions, bonus, net_pay, working_days, present_days, teachers(full_name, employee_no, designation), payroll_item_lines(label, type, amount)",
        )
        .eq("run_id", run.id);
      if (error) throw error;
      return (data ?? []) as unknown as ItemRow[];
    },
  });

  const items = data ?? [];
  const total = round2(items.reduce((s, i) => s + Number(i.net_pay), 0));
  const periodLabel = `${MONTHS[run.period_month - 1]} ${run.period_year}`;

  const markPaid = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payroll_runs").update({ status: "paid" }).eq("id", run.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Run marked as paid");
      qc.invalidateQueries({ queryKey: ["payroll_runs"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportXlsx() {
    const rows = items.map((i) => ({
      "Employee no": i.teachers?.employee_no ?? "",
      Employee: i.teachers?.full_name ?? "",
      Designation: i.teachers?.designation ?? "",
      "Basic salary": Number(i.basic_salary),
      "Working days": i.working_days ?? 0,
      "Present days": i.present_days ?? 0,
      Deductions: Number(i.deductions),
      Bonus: Number(i.bonus),
      "Net pay": Number(i.net_pay),
    }));
    saveBrandedWorkbook(
      brand,
      "Payroll",
      `Payroll — ${periodLabel}`,
      rows,
      `payroll-${run.period_year}-${String(run.period_month).padStart(2, "0")}.xlsx`,
    );
  }

  function payslip(i: ItemRow) {
    const html = buildDocument({
      title: "Payslip",
      brand,
      subtitle: periodLabel,
      meta: [
        { label: "Employee", value: i.teachers?.full_name ?? "—" },
        { label: "Employee no", value: i.teachers?.employee_no ?? "—" },
        { label: "Designation", value: i.teachers?.designation ?? "—" },
        {
          label: "Attendance",
          value: `${i.present_days ?? 0}/${i.working_days ?? 0} days`,
        },
      ],
      tableHead: ["Description", "Type", "Amount"],
      tableRows: (i.payroll_item_lines ?? []).map((l) => [
        l.label,
        l.type,
        money(l.amount, currency),
      ]),
      totals: [
        { label: "Basic salary", value: money(i.basic_salary, currency) },
        { label: "Deductions", value: `- ${money(i.deductions, currency)}` },
        { label: "Bonus", value: money(i.bonus, currency) },
        { label: "Net pay", value: money(i.net_pay, currency), strong: true },
      ],
      footnote: "Payslip generated by the school finance system.",
    });
    printDocument(html);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payroll — {periodLabel}</DialogTitle>
          <DialogDescription>
            {items.length} employees · total net {money(total, currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportXlsx} disabled={items.length === 0}>
            <FileSpreadsheet className="size-4" /> Export master table (XLSX)
          </Button>
          {run.status !== "paid" && can("payroll", "update") && (
            <Button variant="outline" onClick={() => markPaid.mutate()} disabled={markPaid.isPending}>
              <Check className="size-4" /> Mark as paid
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="max-h-[380px] overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2 text-right">Basic</th>
                  <th className="px-3 py-2 text-right">Deductions</th>
                  <th className="px-3 py-2 text-right">Bonus</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{i.teachers?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.teachers?.employee_no ?? ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{money(i.basic_salary, currency)}</td>
                    <td className="px-3 py-2 text-right text-danger">
                      {i.deductions ? `- ${money(i.deductions, currency)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{i.bonus ? money(i.bonus, currency) : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{money(i.net_pay, currency)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => payslip(i)}>
                        <Download className="size-4" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
