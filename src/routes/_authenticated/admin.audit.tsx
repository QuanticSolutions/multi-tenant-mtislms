import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Activity } from "lucide-react";

import { AppShell } from "@/components/admin/app-shell";
import { formatDateTime, formatStatus } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log" },
      { name: "description", content: "Track administrative actions across the school system." },
    ],
  }),
  component: AuditPage,
});

type Row = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

const ACTION_CLS: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-primary-pale text-primary",
  logout: "bg-muted text-muted-foreground",
};

function AuditPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntity] = useState("all");
  const [actionFilter, setAction] = useState("all");

  const q = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data as unknown) as Row[];
    },
  });

  const rows = q.data ?? [];
  const entities = useMemo(() => Array.from(new Set(rows.map((r) => r.entity_type))).sort(), [rows]);
  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (entityFilter !== "all" && r.entity_type !== entityFilter) return false;
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (r.actor_email ?? "").toLowerCase().includes(s) ||
        r.action.toLowerCase().includes(s) ||
        r.entity_type.toLowerCase().includes(s) ||
        (r.entity_id ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, entityFilter, actionFilter, search]);

  const filterCount = (entityFilter !== "all" ? 1 : 0) + (actionFilter !== "all" ? 1 : 0) + (search ? 1 : 0);
  function clearFilters() {
    setEntity("all"); setAction("all"); setSearch("");
  }

  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Compliance</p>
        <h1 className="mtis-section-title mt-1">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chronological record of administrative actions. Read-only.</p>
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <Select value={entityFilter} onValueChange={setEntity}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {entities.map((e) => <SelectItem key={e} value={e}>{formatStatus(e)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setAction}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map((a) => <SelectItem key={a} value={a}>{formatStatus(a)}</SelectItem>)}
            </SelectContent>
          </Select>
          {filterCount > 1 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
          )}
          <div className="ml-auto relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, action, entity…" className="pl-9" />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  {q.isLoading ? "Loading…" : "No audit entries yet. Events will appear here once actions are logged."}
                </td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-primary-pale/20 align-top">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-foreground">{r.actor_email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.actor_id?.slice(0, 8)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={ACTION_CLS[r.action.toLowerCase()] ?? "bg-muted text-muted-foreground"}>
                      <Activity className="mr-1 size-3" />{formatStatus(r.action)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{formatStatus(r.entity_type)}</div>
                    {r.entity_id && <div className="text-xs text-muted-foreground font-mono">{r.entity_id.slice(0, 8)}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-md">
                    {r.details && Object.keys(r.details).length > 0 && (
                      <pre className="bg-background rounded border border-border p-2 overflow-x-auto max-h-24">
                        {JSON.stringify(r.details, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Showing latest {rows.length} entries.</p>
      </div>
    </AppShell>
  );
}
