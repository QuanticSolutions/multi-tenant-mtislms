import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { docBrand } from "@/lib/print";
import { useBranding } from "@/hooks/use-branding";
import { saveBrandedWorkbook } from "@/lib/xlsx-brand";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatClass } from "@/lib/format";
import { money } from "@/lib/finance";

type Row = {
  id: string;
  full_name: string;
  admission_no: string;
  status: string;
  discount_type: "flat" | "percent" | null;
  discount_value: number;
  discount_reason: string | null;
  classes: { name: string; section: string | null } | null;
};

export function ScholarshipsTab({ currency = "PKR" }: { currency?: string }) {
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["scholarship-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "id, full_name, admission_no, status, discount_type, discount_value, discount_reason, classes(name, section)",
        )
        .not("discount_type", "is", null)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(term) ||
        r.admission_no.toLowerCase().includes(term) ||
        (r.discount_reason ?? "").toLowerCase().includes(term),
    );
  }, [rows, q]);

  const flatTotal = useMemo(
    () =>
      rows
        .filter((r) => r.discount_type === "flat")
        .reduce((s, r) => s + Number(r.discount_value || 0), 0),
    [rows],
  );
  const percentCount = rows.filter((r) => r.discount_type === "percent").length;

  function exportXlsx() {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        Student: r.full_name,
        "Admission no": r.admission_no,
        Class: formatClass(r.classes?.name, r.classes?.section),
        Type: r.discount_type === "percent" ? "Percentage" : "Flat",
        Value: Number(r.discount_value || 0),
        Reason: r.discount_reason ?? "",
        Status: r.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scholarships");
    XLSX.writeFile(wb, `scholarships-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Students on scholarship" value={String(rows.length)} />
        <Stat label="Flat scholarships value" value={money(flatTotal, currency)} />
        <Stat label="Percentage scholarships" value={String(percentCount)} />
      </div>

      <div className="mtis-card flex flex-wrap items-end gap-3 p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student, admission no or reason…"
          />
        </div>
        <Button variant="outline" onClick={exportXlsx} disabled={filtered.length === 0}>
          <Download className="size-4" /> Export XLSX
        </Button>
      </div>

      <div className="mtis-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background">
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No scholarships awarded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.admission_no}</div>
                    </td>
                    <td className="px-4 py-3">{formatClass(r.classes?.name, r.classes?.section)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {r.discount_type === "percent" ? "Percentage" : "Flat"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {r.discount_type === "percent"
                        ? `${Number(r.discount_value || 0)}%`
                        : money(r.discount_value, currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.discount_reason ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mtis-card p-4">
      <p className="mtis-eyebrow">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
