import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  FileText,
  Plus,
  Receipt,
  Settings2,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/admin/fees")({
  head: () => ({
    meta: [
      { title: "Fees — Madina Tul Ilm" },
      { name: "description", content: "Manage class fee structures, invoices, and payments." },
    ],
  }),
  component: FeesPage,
});

type InvoiceStatus = "pending" | "paid" | "partial" | "overdue" | "cancelled";
type Frequency = "one_time" | "monthly" | "quarterly" | "annual";
type PaymentMethod = "cash" | "bank_transfer" | "card" | "cheque" | "online" | "other";

type ClassRow = { id: string; name: string; section: string | null; grade_level: number | null };
type StudentRow = { id: string; full_name: string; admission_no: string; class_id: string | null };
type FeeStructureRow = {
  id: string;
  class_id: string;
  name: string;
  description: string | null;
  amount: number;
  frequency: Frequency;
  due_day: number | null;
  academic_year: string;
  is_active: boolean;
  classes?: { name: string; section: string | null } | null;
};
type InvoiceRow = {
  id: string;
  invoice_no: string;
  student_id: string;
  fee_structure_id: string | null;
  title: string;
  amount: number;
  discount: number;
  amount_paid: number;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  notes: string | null;
  students?: { full_name: string; admission_no: string; class_id: string | null } | null;
};
type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paid_on: string;
  notes: string | null;
};

const INVOICE_STATUSES: InvoiceStatus[] = ["pending", "paid", "partial", "overdue", "cancelled"];
const FREQUENCIES: Frequency[] = ["one_time", "monthly", "quarterly", "annual"];
const METHODS: PaymentMethod[] = ["cash", "bank_transfer", "card", "cheque", "online", "other"];

const money = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(n || 0));

function classLabel(c?: { name: string; section: string | null } | null) {
  if (!c) return "—";
  return c.section ? `${c.name} · ${c.section}` : c.name;
}

function statusVariant(s: InvoiceStatus) {
  switch (s) {
    case "paid":
      return "success" as const;
    case "partial":
      return "warning" as const;
    case "overdue":
      return "destructive" as const;
    case "cancelled":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function FeesPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-1">
        <p className="mtis-eyebrow">Finance</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Fees</h1>
        <p className="text-sm text-muted-foreground">
          Build class fee structures, issue invoices, and record payments — overdue is tracked automatically.
        </p>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">
            <Receipt className="mr-2 size-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="structures">
            <Settings2 className="mr-2 size-4" /> Fee Structures
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="space-y-6">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="structures" className="space-y-6">
          <StructuresTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ─────────────────────────── Invoices ─────────────────────────── */

function InvoicesTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRow | null>(null);

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section, grade_level")
        .order("grade_level");
      if (error) throw error;
      return data as ClassRow[];
    },
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", classFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("invoices")
        .select(
          "id, invoice_no, student_id, fee_structure_id, title, amount, discount, amount_paid, issue_date, due_date, status, notes, students!inner(full_name, admission_no, class_id)",
        )
        .order("issue_date", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (classFilter !== "all") q = q.eq("students.class_id", classFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as InvoiceRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invoices ?? [];
    return (invoices ?? []).filter(
      (i) =>
        i.invoice_no.toLowerCase().includes(term) ||
        i.title.toLowerCase().includes(term) ||
        i.students?.full_name.toLowerCase().includes(term) ||
        i.students?.admission_no.toLowerCase().includes(term),
    );
  }, [invoices, search]);

  const stats = useMemo(() => {
    const list = invoices ?? [];
    return {
      total: list.length,
      billed: list.reduce((a, b) => a + Number(b.amount) - Number(b.discount), 0),
      collected: list.reduce((a, b) => a + Number(b.amount_paid), 0),
      overdue: list.filter((x) => x.status === "overdue").length,
    };
  }, [invoices]);

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice deleted");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Invoices" value={stats.total.toString()} icon={FileText} />
        <Stat label="Billed" value={money(stats.billed)} icon={Wallet} />
        <Stat label="Collected" value={money(stats.collected)} icon={Banknote} />
        <Stat label="Overdue" value={stats.overdue.toString()} icon={CreditCard} tone="danger" />
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search invoice, student, admission no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={classFilter} onValueChange={(v) => setClassFilter(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {classLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {INVOICE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <BulkInvoiceDialog classes={classes ?? []} />
            <CreateInvoiceDialog classes={classes ?? []} />
          </div>

        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary-pale/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Issued / Due</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading invoices…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No invoices yet. Create one to get started.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const net = Number(inv.amount) - Number(inv.discount);
                const due = net - Number(inv.amount_paid);
                const isOverdue = inv.status === "overdue";
                return (
                  <tr key={inv.id} className="hover:bg-primary-pale/20">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{inv.invoice_no}</div>
                      <div className="text-xs text-muted-foreground">{inv.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{inv.students?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{inv.students?.admission_no}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{new Date(inv.issue_date).toLocaleDateString()}</div>
                      <div className={isOverdue ? "font-semibold text-destructive" : ""}>
                        Due {new Date(inv.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{money(net)}</div>
                      <div className="text-xs text-muted-foreground">
                        Paid {money(inv.amount_paid)} · Bal {money(due)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(inv.status)} className="capitalize">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPaymentInvoice(inv)}
                          disabled={inv.status === "paid" || inv.status === "cancelled"}
                        >
                          <CreditCard className="mr-1 size-3.5" /> Pay
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete invoice"
                          onClick={() => {
                            if (confirm(`Delete invoice ${inv.invoice_no}?`)) deleteInvoice.mutate(inv.id);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {paymentInvoice && (
        <PaymentDialog
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "danger";
}) {
  return (
    <div className="mtis-card flex items-center gap-3 p-4">
      <div
        className={`grid size-10 place-items-center rounded-md ${
          tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary-pale text-primary"
        }`}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────── Create Invoice ─────────────────────────── */

function CreateInvoiceDialog({ classes }: { classes: ClassRow[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [structureId, setStructureId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [discount, setDiscount] = useState<string>("0");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");

  const { data: students } = useQuery({
    enabled: !!classId,
    queryKey: ["students-of-class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_no, class_id")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data as StudentRow[];
    },
  });

  const { data: structures } = useQuery({
    enabled: !!classId,
    queryKey: ["structures-of-class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_structures")
        .select("id, class_id, name, amount, frequency, due_day, is_active, academic_year, description")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as FeeStructureRow[];
    },
  });

  useEffect(() => {
    if (!structureId) return;
    const s = structures?.find((x) => x.id === structureId);
    if (s) {
      setTitle(s.name);
      setAmount(String(s.amount));
    }
  }, [structureId, structures]);

  function reset() {
    setClassId("");
    setStudentId("");
    setStructureId("");
    setTitle("");
    setAmount("");
    setDiscount("0");
    setNotes("");
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!studentId || !title || !amount || !dueDate) throw new Error("Fill student, title, amount and due date");
      const amt = Number(amount);
      const disc = Number(discount || 0);
      if (amt < 0 || disc < 0) throw new Error("Amounts must be positive");
      if (disc > amt) throw new Error("Discount cannot exceed amount");

      const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
      const today = new Date().toISOString().slice(0, 10);
      const status: InvoiceStatus = dueDate < today ? "overdue" : "pending";

      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("invoices").insert({
        invoice_no: invoiceNo,
        student_id: studentId,
        fee_structure_id: structureId || null,
        title,
        amount: amt,
        discount: disc,
        issue_date: issueDate,
        due_date: dueDate,
        status,
        notes: notes || null,
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice created");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      reset();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 size-4" /> New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
          <DialogDescription>
            Pick a class to load students. Optionally bind a fee structure to auto-fill the amount.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Class">
            <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); setStructureId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{classLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Student">
            <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder={classId ? "Select student" : "Pick class first"} /></SelectTrigger>
              <SelectContent>
                {(students ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name} · {s.admission_no}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fee structure (optional)" className="sm:col-span-2">
            <Select value={structureId} onValueChange={setStructureId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="None (custom invoice)" /></SelectTrigger>
              <SelectContent>
                {(structures ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — {money(s.amount)} ({s.frequency})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title" className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Term 1 Tuition" />
          </Field>
          <Field label="Amount">
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Discount">
            <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="Issue date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────── Bulk Invoice Generator ─────────────────── */

function BulkInvoiceDialog({ classes }: { classes: ClassRow[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState<string>("");
  const [structureId, setStructureId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [discounts, setDiscounts] = useState<Record<string, string>>({});

  const { data: students } = useQuery({
    enabled: !!classId,
    queryKey: ["bulk-students-of-class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_no, class_id")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data as StudentRow[];
    },
  });

  const { data: structures } = useQuery({
    enabled: !!classId,
    queryKey: ["bulk-structures-of-class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_structures")
        .select("id, class_id, name, amount, frequency, due_day, is_active, academic_year, description")
        .eq("class_id", classId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as FeeStructureRow[];
    },
  });

  // Auto-select all students when the list loads
  useEffect(() => {
    if (!students) return;
    setSelected((prev) => {
      if (Object.keys(prev).length) return prev;
      const next: Record<string, boolean> = {};
      students.forEach((s) => (next[s.id] = true));
      return next;
    });
  }, [students]);

  useEffect(() => {
    if (!structureId) return;
    const s = structures?.find((x) => x.id === structureId);
    if (s) {
      setTitle(s.name);
      setAmount(String(s.amount));
    }
  }, [structureId, structures]);

  function resetAll() {
    setClassId("");
    setStructureId("");
    setTitle("");
    setAmount("");
    setSelected({});
    setDiscounts({});
  }

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  const generate = useMutation({
    mutationFn: async () => {
      if (!classId || !title.trim() || !amount || !dueDate) {
        throw new Error("Class, title, amount and due date are required");
      }
      if (selectedIds.length === 0) throw new Error("Select at least one student");
      const amt = Number(amount);
      if (amt < 0) throw new Error("Amount must be positive");
      const today = new Date().toISOString().slice(0, 10);
      const status: InvoiceStatus = dueDate < today ? "overdue" : "pending";
      const { data: userRes } = await supabase.auth.getUser();
      const base = Date.now().toString().slice(-8);

      const rows = selectedIds.map((sid, i) => {
        const disc = Number(discounts[sid] ?? "0") || 0;
        if (disc < 0 || disc > amt) throw new Error("Invalid discount for a student");
        return {
          invoice_no: `INV-${base}-${(i + 1).toString().padStart(3, "0")}`,
          student_id: sid,
          fee_structure_id: structureId || null,
          title: title.trim(),
          amount: amt,
          discount: disc,
          issue_date: issueDate,
          due_date: dueDate,
          status,
          created_by: userRes.user?.id ?? null,
        };
      });
      const { error } = await supabase.from("invoices").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} invoice${n === 1 ? "" : "s"} generated`);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      resetAll();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allChecked = (students?.length ?? 0) > 0 && selectedIds.length === students!.length;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetAll(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Receipt className="mr-1 size-4" /> Bulk generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk generate invoices</DialogTitle>
          <DialogDescription>
            Pick a class to auto-list every active student. Unselect anyone who shouldn't be billed and set per-student discounts as needed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Class">
            <Select value={classId} onValueChange={(v) => { setClassId(v); setStructureId(""); setSelected({}); setDiscounts({}); }}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{classLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fee structure (optional)">
            <Select value={structureId} onValueChange={setStructureId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="None (custom)" /></SelectTrigger>
              <SelectContent>
                {(structures ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — {money(s.amount)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title" className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Term 1 Tuition" />
          </Field>
          <Field label="Amount">
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Issue date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Due date" className="sm:col-span-2">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>

        {classId && (
          <div className="mt-2 rounded-md border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{selectedIds.length} of {students?.length ?? 0} students selected</span>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  if (!students) return;
                  const next: Record<string, boolean> = {};
                  if (!allChecked) students.forEach((s) => (next[s.id] = true));
                  setSelected(next);
                }}
              >
                {allChecked ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {(students ?? []).map((s) => {
                    const on = !!selected[s.id];
                    return (
                      <tr key={s.id} className="border-b border-border/60 last:border-b-0">
                        <td className="px-3 py-2 w-8">
                          <Checkbox
                            checked={on}
                            onCheckedChange={(c) =>
                              setSelected((prev) => ({ ...prev, [s.id]: !!c }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{s.full_name}</div>
                          <div className="text-xs text-muted-foreground">{s.admission_no}</div>
                        </td>
                        <td className="px-3 py-2 w-40">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Discount"
                            disabled={!on}
                            value={discounts[s.id] ?? ""}
                            onChange={(e) =>
                              setDiscounts((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {students?.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                        No active students in this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending || !classId}>
            {generate.isPending ? "Generating…" : `Generate ${selectedIds.length || ""} invoice${selectedIds.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



/* ─────────────────────────── Payment ─────────────────────────── */

function PaymentDialog({ invoice, onClose }: { invoice: InvoiceRow; onClose: () => void }) {
  const qc = useQueryClient();
  const net = Number(invoice.amount) - Number(invoice.discount);
  const balance = Math.max(0, net - Number(invoice.amount_paid));
  const [amount, setAmount] = useState<string>(balance.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const { data: payments } = useQuery({
    queryKey: ["payments", invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, invoice_id, amount, method, reference, paid_on, notes")
        .eq("invoice_id", invoice.id)
        .order("paid_on", { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
  });

  const record = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a positive amount");
      if (amt > balance + 0.001) throw new Error(`Amount exceeds balance (${money(balance)})`);
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("payments").insert({
        invoice_id: invoice.id,
        amount: amt,
        method,
        reference: reference || null,
        paid_on: paidOn,
        notes: notes || null,
        recorded_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payments", invoice.id] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payments", invoice.id] });
      toast.success("Payment removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record payment — {invoice.invoice_no}</DialogTitle>
          <DialogDescription>
            {invoice.students?.full_name} · Net {money(net)} · Paid {money(invoice.amount_paid)} · Balance{" "}
            <span className="font-semibold text-foreground">{money(balance)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount">
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn / cheque #" />
          </Field>
          <Field label="Paid on">
            <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-md border border-border">
          <div className="border-b border-border bg-primary-pale/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Payment history
          </div>
          {(payments ?? []).length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">No payments recorded.</p>
          ) : (
            <ul className="divide-y divide-border">
              {payments!.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="font-semibold">{money(p.amount)}</span>
                  <Badge variant="outline" className="capitalize">{p.method.replace("_", " ")}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(p.paid_on).toLocaleDateString()}</span>
                  {p.reference && <span className="text-xs text-muted-foreground">· {p.reference}</span>}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto"
                    aria-label="Remove payment"
                    onClick={() => removePayment.mutate(p.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => record.mutate()} disabled={record.isPending || balance <= 0}>
            {record.isPending ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Structures ─────────────────────────── */

function StructuresTab() {
  const qc = useQueryClient();
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section, grade_level")
        .order("grade_level");
      if (error) throw error;
      return data as ClassRow[];
    },
  });

  const { data: structures, isLoading } = useQuery({
    queryKey: ["fee_structures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_structures")
        .select("id, class_id, name, description, amount, frequency, due_day, academic_year, is_active, classes(name, section)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as FeeStructureRow[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_structures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["fee_structures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (row: FeeStructureRow) => {
      const { error } = await supabase
        .from("fee_structures")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee_structures"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="mtis-card flex items-center justify-between p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Class fee structures</h2>
          <p className="text-sm text-muted-foreground">
            Templates per class — bind them when creating invoices to auto-fill amounts.
          </p>
        </div>
        <AddStructureDialog classes={classes ?? []} />
      </div>

      <div className="mtis-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary-pale/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Due day</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : (structures ?? []).length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No structures yet.</td></tr>
            ) : (
              structures!.map((s) => (
                <tr key={s.id} className="hover:bg-primary-pale/20">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{s.name}</div>
                    {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                  </td>
                  <td className="px-4 py-3">{classLabel(s.classes)}</td>
                  <td className="px-4 py-3 font-semibold">{money(s.amount)}</td>
                  <td className="px-4 py-3 capitalize">{s.frequency.replace("_", " ")}</td>
                  <td className="px-4 py-3">{s.due_day ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.is_active ? "success" : "secondary"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(s)}>
                        {s.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete structure"
                        onClick={() => { if (confirm(`Delete "${s.name}"?`)) remove.mutate(s.id); }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AddStructureDialog({ classes }: { classes: ClassRow[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [dueDay, setDueDay] = useState<string>("5");
  const [academicYear, setAcademicYear] = useState("2025-26");

  function reset() {
    setClassId(""); setName(""); setDescription(""); setAmount("");
    setFrequency("monthly"); setDueDay("5"); setAcademicYear("2025-26");
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!classId || !name || !amount) throw new Error("Fill class, name and amount");
      const dd = dueDay ? Number(dueDay) : null;
      if (dd !== null && (dd < 1 || dd > 31)) throw new Error("Due day must be 1–31");
      const { error } = await supabase.from("fee_structures").insert({
        class_id: classId,
        name,
        description: description || null,
        amount: Number(amount),
        frequency,
        due_day: dd,
        academic_year: academicYear,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fee structure added");
      qc.invalidateQueries({ queryKey: ["fee_structures"] });
      reset();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 size-4" /> Add structure</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New fee structure</DialogTitle>
          <DialogDescription>Reusable template tied to a class.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Class" className="sm:col-span-2">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{classLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Name" className="sm:col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Monthly tuition" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Amount">
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Frequency">
            <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f} className="capitalize">{f.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Due day (1–31)">
            <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </Field>
          <Field label="Academic year">
            <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
