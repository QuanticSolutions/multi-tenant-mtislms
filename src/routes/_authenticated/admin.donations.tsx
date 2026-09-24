import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { HeartHandshake, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { IntakeTabs } from "@/components/admin/intake-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDate, formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/donations")({
  head: () => ({
    meta: [
      { title: "Donations" },
      {
        name: "description",
        content: "Track donor pledges and received donations, and share an embeddable donation form.",
      },
      { property: "og:title", content: "Donations" },
      {
        property: "og:description",
        content: "Track donor pledges and received donations for the school.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DonationsPage,
});

const STATUSES = ["pledged", "received", "cancelled"] as const;
export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "card",
  "cheque",
  "online",
  "other",
] as const;

type DonationRow = {
  id: string;
  donor_name: string;
  donor_phone: string | null;
  donor_email: string | null;
  amount: number;
  purpose: string | null;
  method: (typeof PAYMENT_METHODS)[number];
  reference: string | null;
  donation_date: string;
  status: (typeof STATUSES)[number];
  notes: string | null;
  source: string;
};

function DonationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DonationRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("donation_date", { ascending: false });
      if (error) throw error;
      return data as DonationRow[];
    },
  });

  const rows = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((d) => {
      const matchesQ =
        !q ||
        d.donor_name.toLowerCase().includes(q) ||
        (d.donor_email?.toLowerCase().includes(q) ?? false) ||
        (d.donor_phone?.toLowerCase().includes(q) ?? false) ||
        (d.purpose?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesMethod = methodFilter === "all" || d.method === methodFilter;
      return matchesQ && matchesStatus && matchesMethod;
    });
  }, [rows, search, statusFilter, methodFilter]);

  const received = rows
    .filter((d) => d.status === "received")
    .reduce((s, d) => s + Number(d.amount), 0);
  const pledged = rows
    .filter((d) => d.status === "pledged")
    .reduce((s, d) => s + Number(d.amount), 0);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("donations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Donation removed");
      qc.invalidateQueries({ queryKey: ["donations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeFilters =
    (statusFilter !== "all" ? 1 : 0) + (methodFilter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Intake</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Donations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pledges, receipts and donor contacts — including submissions from the embedded form.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus /> Record donation
            </Button>
          </DialogTrigger>
          <DonationDialog
            key={editing?.id ?? "new"}
            existing={editing}
            onDone={() => {
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </div>

      <IntakeTabs active="donations" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total donations" value={String(rows.length)} />
        <StatCard label="Received" value={received.toLocaleString()} />
        <StatCard label="Pledged" value={pledged.toLocaleString()} />
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search donor, email, purpose…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatStatus(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilters > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setMethodFilter("all");
              }}
            >
              <X className="size-4" /> Clear filters
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {rows.length} donations
          </div>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading donations…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <HeartHandshake className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">No donations yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Record a donation manually, or share the embeddable donation form.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Donor</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-primary-pale/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{d.donor_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.donor_phone ?? d.donor_email ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{Number(d.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.purpose ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatStatus(d.method)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(d.donation_date)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        d.status === "received"
                          ? "success"
                          : d.status === "cancelled"
                            ? "secondary"
                            : "warning"
                      }
                    >
                      {formatStatus(d.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatStatus(d.source)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(d);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => {
                        if (confirm(`Remove donation from ${d.donor_name}?`)) deleteMut.mutate(d.id);
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="mtis-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function DonationDialog({
  existing,
  onDone,
}: {
  existing: DonationRow | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    donor_name: existing?.donor_name ?? "",
    donor_phone: existing?.donor_phone ?? "",
    donor_email: existing?.donor_email ?? "",
    amount: existing ? String(existing.amount) : "",
    purpose: existing?.purpose ?? "",
    method: existing?.method ?? "cash",
    reference: existing?.reference ?? "",
    donation_date: existing?.donation_date ?? new Date().toISOString().slice(0, 10),
    status: existing?.status ?? "received",
    notes: existing?.notes ?? "",
  }));

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.donor_name.trim()) throw new Error("Donor name is required");
      const amount = Number(form.amount || 0);
      if (Number.isNaN(amount) || amount < 0) throw new Error("Enter a valid amount");
      const payload = {
        donor_name: form.donor_name.trim(),
        donor_phone: form.donor_phone || null,
        donor_email: form.donor_email || null,
        amount,
        purpose: form.purpose || null,
        method: form.method as DonationRow["method"],
        reference: form.reference || null,
        donation_date: form.donation_date,
        status: form.status as DonationRow["status"],
        notes: form.notes || null,
      };
      if (existing) {
        const { error } = await supabase.from("donations").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("donations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existing ? "Donation updated" : "Donation recorded");
      qc.invalidateQueries({ queryKey: ["donations"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{existing ? "Edit donation" : "Record donation"}</DialogTitle>
        <DialogDescription>Donor details and payment information.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldBox label="Donor name *">
          <Input value={form.donor_name} onChange={(e) => set("donor_name", e.target.value)} />
        </FieldBox>
        <FieldBox label="Phone">
          <Input value={form.donor_phone} onChange={(e) => set("donor_phone", e.target.value)} />
        </FieldBox>
        <FieldBox label="Email">
          <Input
            type="email"
            value={form.donor_email}
            onChange={(e) => set("donor_email", e.target.value)}
          />
        </FieldBox>
        <FieldBox label="Amount *">
          <Input
            type="number"
            min="0"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </FieldBox>
        <FieldBox label="Purpose">
          <Input
            value={form.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            placeholder="Scholarship fund"
          />
        </FieldBox>
        <FieldBox label="Method">
          <Select value={form.method} onValueChange={(v) => set("method", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatStatus(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldBox>
        <FieldBox label="Reference">
          <Input value={form.reference} onChange={(e) => set("reference", e.target.value)} />
        </FieldBox>
        <FieldBox label="Donation date">
          <Input
            type="date"
            value={form.donation_date}
            onChange={(e) => set("donation_date", e.target.value)}
          />
        </FieldBox>
        <FieldBox label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldBox>
        <FieldBox label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
        </FieldBox>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={saveMut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Saving…" : existing ? "Update donation" : "Save donation"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function FieldBox({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}
