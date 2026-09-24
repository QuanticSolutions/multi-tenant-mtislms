import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bell, Send, Mail, Phone, Smartphone, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications" },
      { name: "description", content: "Email, SMS and push delivery log for school messaging." },
    ],
  }),
  component: NotificationsPage,
});

type Channel = "email" | "sms" | "push" | "in_app";
type Status = "queued" | "sent" | "failed" | "delivered";

type Row = {
  id: string;
  channel: Channel;
  recipient: string;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  status: Status;
  related_module: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

const CH_ICON: Record<Channel, typeof Mail> = {
  email: Mail, sms: Phone, push: Smartphone, in_app: MessageCircle,
};

const STATUS_CLS: Record<Status, string> = {
  queued: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function NotificationsPage() {
  const qc = useQueryClient();
  const [composeOpen, setCompose] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Channel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Row[];
    },
  });

  const rows = q.data ?? [];
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.channel !== tab) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return r.recipient.toLowerCase().includes(s) || (r.subject ?? "").toLowerCase().includes(s) || r.body.toLowerCase().includes(s);
    });
  }, [rows, tab, statusFilter, search]);

  const filterCount = (tab !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (search ? 1 : 0);
  function clearFilters() {
    setTab("all"); setStatusFilter("all"); setSearch("");
  }

  const stats = useMemo(() => {
    const s: Record<string, number> = { total: rows.length, sent: 0, failed: 0, queued: 0 };
    for (const r of rows) s[r.status] = (s[r.status] ?? 0) + 1;
    return s;
  }, [rows]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Delivery layer</p>
          <h1 className="mtis-section-title mt-1">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log of every email, SMS, push and in-app notification queued from the school.</p>
        </div>
        <Button onClick={() => setCompose(true)}><Send className="mr-2 size-4" /> New notification</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Sent / delivered" value={(stats.sent ?? 0) + (stats.delivered ?? 0)} tone="success" />
        <Stat label="Queued" value={stats.queued ?? 0} tone="warn" />
        <Stat label="Failed" value={stats.failed ?? 0} tone="danger" />
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          {(["all", "email", "sms", "push", "in_app"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary-pale hover:text-primary"
              }`}>{t === "all" ? "All" : formatStatus(t)}</button>
          ))}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(["queued", "sent", "delivered", "failed"] as const).map((s) => (
                <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterCount > 1 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
          )}
          <div className="ml-auto relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recipient or content…" className="pl-9" />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Subject / body</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                  {q.isLoading ? "Loading…" : "No notifications yet."}
                </td></tr>
              )}
              {filtered.map((r) => {
                const Icon = CH_ICON[r.channel];
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-primary-pale/30">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 text-foreground">
                        <Icon className="size-4 text-primary" />
                        <span>{formatStatus(r.channel)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{r.recipient_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.recipient}</div>
                    </td>
                    <td className="px-3 py-2 max-w-md">
                      {r.subject && <div className="font-medium text-foreground truncate">{r.subject}</div>}
                      <div className="text-xs text-muted-foreground line-clamp-2">{r.body}</div>
                      {r.error_message && <div className="mt-1 text-xs text-destructive">Error: {r.error_message}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={STATUS_CLS[r.status]}>{formatStatus(r.status)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(r.sent_at ?? r.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ComposeDialog open={composeOpen} onOpenChange={setCompose}
        onSent={() => qc.invalidateQueries({ queryKey: ["notifications"] })} />
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" | "danger" }) {
  const cls = tone === "success" ? "text-green-700" : tone === "warn" ? "text-yellow-700" : tone === "danger" ? "text-red-700" : "text-primary";
  return (
    <div className="mtis-card p-4">
      <p className="mtis-eyebrow">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function ComposeDialog({ open, onOpenChange, onSent }: { open: boolean; onOpenChange: (o: boolean) => void; onSent: () => void }) {
  const [channel, setChannel] = useState<Channel>("email");
  const [recipient, setRecipient] = useState("");
  const [recipient_name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: async () => {
      if (!recipient.trim() || !body.trim()) throw new Error("Recipient and message are required");
      const { error } = await supabase.from("notifications").insert({
        channel, recipient: recipient.trim(), recipient_name: recipient_name || null,
        subject: subject || null, body: body.trim(),
        status: "queued", related_module: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification queued");
      onSent(); onOpenChange(false);
      setRecipient(""); setName(""); setSubject(""); setBody("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bell className="size-5 text-primary" /> New notification</DialogTitle>
          <DialogDescription>Queue a message via any delivery channel. Providers can be wired later.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Channel</span>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="in_app">In-app</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Recipient ({channel === "email" ? "email" : channel === "sms" ? "phone" : "user id"}) *</span>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Recipient name</span>
            <Input value={recipient_name} onChange={(e) => setName(e.target.value)} />
          </label>
          {channel === "email" && (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Subject</span>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Message *</span>
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => send.mutate()} disabled={send.isPending}>
            {send.isPending ? "Queuing…" : "Queue notification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
