import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { docBrand } from "@/lib/print";
import { useBranding } from "@/hooks/use-branding";
import { saveBrandedWorkbook } from "@/lib/xlsx-brand";

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
import { formatDate } from "@/lib/format";
import { money, round2 } from "@/lib/finance";

type EntryType = "income" | "expense";

type Entry = {
  id: string;
  name: string;
  entry_date: string;
  entry_type: EntryType;
  amount: number;
  notes: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function LedgerTab({ currency = "PKR" }: { currency?: string }) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [filter, setFilter] = useState<"all" | EntryType>("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["finance_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_entries")
        .select("id, name, entry_date, entry_type, amount, notes")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const rows = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.entry_type === filter)),
    [entries, filter],
  );

  const totals = useMemo(() => {
    const income = round2(
      entries.filter((e) => e.entry_type === "income").reduce((s, e) => s + Number(e.amount || 0), 0),
    );
    const expense = round2(
      entries.filter((e) => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount || 0), 0),
    );
    return { income, expense, net: round2(income - expense) };
  }, [entries]);

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry deleted");
      queryClient.invalidateQueries({ queryKey: ["finance_entries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportXlsx() {
    const sheetRows = rows.map((e) => ({
      Name: e.name,
      Date: e.entry_date,
      Type: e.entry_type === "income" ? "Income" : "Expense",
      Amount: Number(e.amount || 0),
      Notes: e.notes ?? "",
    }));
    sheetRows.push(
      { Name: "", Date: "", Type: "", Amount: null as never, Notes: "" },
      { Name: "Total income", Date: "", Type: "", Amount: totals.income, Notes: "" },
      { Name: "Total expense", Date: "", Type: "", Amount: totals.expense, Notes: "" },
      { Name: "Net", Date: "", Type: "", Amount: totals.net, Notes: "" },
    );
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `finance-ledger-${todayISO()}.xlsx`);
  }

  const canWrite = can("finance", "write");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total income" value={money(totals.income, currency)} tone="text-success" />
        <StatCard label="Total expense" value={money(totals.expense, currency)} tone="text-danger" />
        <StatCard
          label="Net"
          value={money(totals.net, currency)}
          tone={totals.net < 0 ? "text-danger" : "text-foreground"}
        />
      </div>

      <div className="mtis-card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px]">
          <Label className="text-xs">Show</Label>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entries</SelectItem>
              <SelectItem value="income">Income only</SelectItem>
              <SelectItem value="expense">Expense only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={exportXlsx} disabled={rows.length === 0}>
            <Download className="size-4" /> Export XLSX
          </Button>
          {canWrite && (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" /> Add entry
            </Button>
          )}
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background">
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No entries recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3">{formatDate(e.entry_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={e.entry_type === "income" ? "success" : "danger"}>
                        {e.entry_type === "income" ? "Income" : "Expense"}
                      </Badge>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        e.entry_type === "income" ? "text-success" : "text-danger"
                      }`}
                    >
                      {e.entry_type === "income" ? "" : "- "}
                      {money(e.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{e.notes ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(e);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMut.mutate(e.id)}
                            disabled={removeMut.isPending}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {dialogOpen && (
          <EntryDialog
            key={editing?.id ?? "new"}
            existing={editing}
            onDone={() => setDialogOpen(false)}
          />
        )}
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="mtis-card p-4">
      <p className="mtis-eyebrow">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function EntryDialog({ existing, onDone }: { existing: Entry | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    entry_date: existing?.entry_date ?? todayISO(),
    entry_type: (existing?.entry_type ?? "income") as EntryType,
    amount: existing ? String(existing.amount) : "",
    notes: existing?.notes ?? "",
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount");
      const payload = {
        name: form.name.trim(),
        entry_date: form.entry_date,
        entry_type: form.entry_type,
        amount,
        notes: form.notes.trim() || null,
      };
      if (existing) {
        const { error } = await supabase
          .from("finance_entries")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("finance_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existing ? "Entry updated" : "Entry recorded");
      queryClient.invalidateQueries({ queryKey: ["finance_entries"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{existing ? "Edit entry" : "Record income or expense"}</DialogTitle>
        <DialogDescription>
          Every entry counts towards the totals and the exported spreadsheet.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Stationery purchase, donation received…"
          />
        </div>
        <div>
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={form.entry_date}
            onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
          />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select
            value={form.entry_type}
            onValueChange={(v) => setForm((f) => ({ ...f, entry_type: v as EntryType }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Amount</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional details"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={saveMut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Saving…" : existing ? "Update entry" : "Save entry"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
