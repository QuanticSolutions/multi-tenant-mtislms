import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Megaphone, LogOut, Pin, Wallet, Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatClass, formatDateTime, formatStatus } from "@/lib/format";
import { money, formatPeriod } from "@/lib/finance";
import { buildDocument, printDocument } from "@/lib/print";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Student Portal — School LMS" },
      {
        name: "description",
        content: "Student portal for School LMS: view your class timetable and school announcements.",
      },
      { property: "og:title", content: "Student Portal — School LMS" },
      {
        property: "og:description",
        content: "View your class timetable and school announcements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalPage,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function PortalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["portal-me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("students")
        .select("id, full_name, admission_no, class_id, classes(name, section)")
        .eq("user_id", u.user.id)
        .maybeSingle();
      return {
        email: u.user.email ?? null,
        name: (u.user.user_metadata?.full_name as string | undefined) ?? null,
        student: data ?? null,
      };
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const student = me?.student as any;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface shadow-card">
        <div className="mx-auto flex h-full max-w-[1100px] items-center gap-3 px-6">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary font-display font-bold text-primary-foreground">
            M
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight text-primary">
              School LMS
            </div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Student Portal
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold">{student?.full_name ?? me?.name ?? "—"}</div>
              <div className="text-[11px] text-muted-foreground">
                {student?.classes?.name
                  ? formatClass(student.classes.name, student.classes.section)
                  : "Student"}
              </div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 px-6 py-8">
        <Tabs defaultValue="timetable" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timetable">
              <CalendarDays className="mr-2 size-4" /> Timetable
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <Megaphone className="mr-2 size-4" /> Announcements
            </TabsTrigger>
            <TabsTrigger value="books">
              <Wallet className="mr-2 size-4" /> Account Books
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timetable">
            <TimetableTab classId={student?.class_id ?? null} />
          </TabsContent>
          <TabsContent value="announcements">
            <AnnouncementsTab classId={student?.class_id ?? null} />
          </TabsContent>
          <TabsContent value="books">
            <AccountBooksTab student={student ?? null} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TimetableTab({ classId }: { classId: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-timetable", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, subject, day_of_week, period_no, start_time, end_time, room, teachers(full_name)")
        .eq("class_id", classId!)
        .order("day_of_week")
        .order("period_no");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!classId) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        Your account isn't linked to a student record yet. Please ask the school office.
      </div>
    );
  }
  if (isLoading) {
    return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const slots = (data ?? []) as any[];

  return (
    <div className="space-y-4">
      {DAYS.map((day, idx) => {
        const dayNo = idx + 1;
        const rows = slots.filter((s) => s.day_of_week === dayNo);
        if (rows.length === 0) return null;
        return (
          <div key={day} className="mtis-card p-4">
            <p className="mtis-eyebrow mb-3">{day}</p>
            <ul className="space-y-2">
              {rows.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="grid size-7 place-items-center rounded-md bg-primary-pale text-xs font-semibold text-primary">
                    {s.period_no}
                  </span>
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-sm text-muted-foreground">
                    {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}
                  </span>
                  {s.teachers?.full_name && (
                    <span className="text-sm text-muted-foreground">{s.teachers.full_name}</span>
                  )}
                  {s.room && <Badge variant="secondary">{s.room}</Badge>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {slots.length === 0 && (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
          No timetable published for your class yet.
        </div>
      )}
    </div>
  );
}

function AnnouncementsTab({ classId }: { classId: string | null }) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["portal-announcements", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, audience, class_id, pinned, published_at, created_at")
        .not("published_at", "is", null)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter(
        (a) => a.audience === "all" || (a.audience === "class" && a.class_id === classId),
      );
    },
  });

  if (isLoading) {
    return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const items = data ?? [];
  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((a) => a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s));
  }, [items, search]);

  if (items.length === 0) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        No announcements right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mtis-card p-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search announcements…" className="pl-9" />
        </div>
      </div>
      <ul className="space-y-3">
      {filtered.map((a) => (
        <li key={a.id} className="mtis-card p-4">
          <div className="flex items-start gap-2">
            {a.pinned && <Pin className="mt-1 size-4 text-accent" />}
            <div>
              <h2 className="font-display text-base font-semibold">{a.title}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(a.published_at ?? a.created_at)}
              </p>
            </div>
          </div>
        </li>
      ))}
      </ul>
    </div>
  );
}

type ChallanLine = { name: string; amount: number };
type PortalChallan = {
  id: string;
  period: string;
  constituent_breakdown: ChallanLine[];
  subtotal: number;
  discount_applied: number;
  total_due: number;
  status: "unpaid" | "pending_review" | "approved" | "rejected";
  uploaded_proof_url: string | null;
  rejection_reason: string | null;
  created_at: string;
};

function statusTone(s: PortalChallan["status"]) {
  if (s === "approved") return "default" as const;
  if (s === "rejected") return "destructive" as const;
  if (s === "pending_review") return "secondary" as const;
  return "outline" as const;
}

function AccountBooksTab({ student }: { student: any | null }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [target, setTarget] = useState<PortalChallan | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["portal-school-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("school_settings")
        .select("school_name, currency")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
  const schoolName = settings?.school_name ?? "School LMS";
  const currency = settings?.currency ?? "PKR";

  const { data, isLoading } = useQuery({
    queryKey: ["portal-challans", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_challans")
        .select(
          "id, period, constituent_breakdown, subtotal, discount_applied, total_due, status, uploaded_proof_url, rejection_reason, created_at",
        )
        .eq("student_id", student.id)
        .order("period", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PortalChallan[];
    },
  });

  const upload = useMutation({
    mutationFn: async ({ challan, file }: { challan: PortalChallan; file: File }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${u.user.id}/${challan.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("fee_challans")
        .update({ uploaded_proof_url: path, status: "pending_review", rejection_reason: null })
        .eq("id", challan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment proof uploaded — awaiting review");
      qc.invalidateQueries({ queryKey: ["portal-challans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function download(c: PortalChallan) {
    const html = buildDocument({
      title: "Fee Challan",
      schoolName,
      subtitle: `Billing period ${formatPeriod(c.period)}`,
      meta: [
        { label: "Student", value: student?.full_name ?? "—" },
        { label: "Admission no", value: student?.admission_no ?? "—" },
        {
          label: "Class",
          value: student?.classes
            ? formatClass(student.classes.name, student.classes.section)
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
    try {
      printDocument(html);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!student?.id) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        Your account isn't linked to a student record yet. Please ask the school office.
      </div>
    );
  }
  if (isLoading) {
    return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const rows = data ?? [];
  const outstanding = rows
    .filter((r) => r.status !== "approved")
    .reduce((sum, r) => sum + Number(r.total_due), 0);

  if (rows.length === 0) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        No fee challans issued yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && target) upload.mutate({ challan: target, file });
          setTarget(null);
        }}
      />

      <div className="mtis-card flex items-center justify-between p-4">
        <div>
          <p className="mtis-eyebrow">Outstanding balance</p>
          <p className="mt-1 font-display text-xl font-bold">{money(outstanding, currency)}</p>
        </div>
        <p className="text-xs text-muted-foreground">{rows.length} challan(s)</p>
      </div>

      <ul className="space-y-3">
        {rows.map((c) => (
          <li key={c.id} className="mtis-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-semibold">{formatPeriod(c.period)}</h2>
                  <Badge variant={statusTone(c.status)}>{formatStatus(c.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {money(c.total_due, currency)} payable
                  {Number(c.discount_applied) > 0
                    ? ` · ${money(c.discount_applied, currency)} discount applied`
                    : ""}
                </p>
                {c.status === "rejected" && c.rejection_reason && (
                  <p className="mt-1 text-sm text-destructive">Rejected: {c.rejection_reason}</p>
                )}
                {c.status === "pending_review" && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Proof uploaded — waiting for the school office to verify.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => download(c)}>
                  <Download className="mr-2 size-4" /> Challan
                </Button>
                {c.status !== "approved" && (
                  <Button
                    size="sm"
                    disabled={upload.isPending}
                    onClick={() => {
                      setTarget(c);
                      fileRef.current?.click();
                    }}
                  >
                    <Upload className="mr-2 size-4" />
                    {c.uploaded_proof_url ? "Replace proof" : "Upload proof"}
                  </Button>
                )}
              </div>
            </div>
            <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
              {(c.constituent_breakdown ?? []).map((l, i) => (
                <li key={i} className="flex justify-between">
                  <span>{l.name}</span>
                  <span>{money(l.amount, currency)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
