import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  CalendarCheck,
  Wallet,
  BookOpen,
  FileText,
  TrendingUp,
  TrendingDown,
  Bus,
  ClipboardList,
  Download,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import { AppShell } from "@/components/admin/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";
import { docBrand, buildReportDocument, printDocument, type DocSection } from "@/lib/print";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics" },
      { name: "description", content: "Cross-module analytics: attendance, fees, exams, library, and transport insights." },
    ],
  }),
  component: ReportsPage,
});

type RangeKey = "7d" | "30d" | "90d" | "session";

const RANGE_LABEL: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  session: "This session (365 days)",
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Shared chart color tokens — mirrors the theme's chart-1..5 CSS variables. */
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};
const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

function ReportsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [exporting, setExporting] = useState(false);
  const { branding } = useBranding();
  const currency = branding?.currency ?? "PKR";

  const since = useMemo(() => {
    if (range === "7d") return daysAgo(7);
    if (range === "30d") return daysAgo(30);
    if (range === "90d") return daysAgo(90);
    return daysAgo(365);
  }, [range]);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const sections = await buildReportSections(since, currency);
      const html = buildReportDocument({
        title: "Reports & Analytics",
        brand: docBrand(branding),
        subtitle: "Cross-module summary — attendance, fees, exams and operations",
        meta: [
          { label: "Range", value: RANGE_LABEL[range] },
          { label: "From", value: since },
          { label: "Generated", value: new Date().toLocaleString() },
        ],
        sections,
        footnote: "This is a computer generated report.",
      });
      printDocument(html);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build the report");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Module</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A cross-module view of attendance, fee collection, academic performance and operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Time range</span>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="session">This session</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export PDF
          </Button>
        </div>
      </div>

      <OverviewTiles since={since} currency={currency} />

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance"><CalendarCheck className="size-4" /> Attendance</TabsTrigger>
          <TabsTrigger value="fees"><Wallet className="size-4" /> Fees</TabsTrigger>
          <TabsTrigger value="exams"><FileText className="size-4" /> Exams</TabsTrigger>
          <TabsTrigger value="operations"><BarChart3 className="size-4" /> Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceReport since={since} />
        </TabsContent>
        <TabsContent value="fees" className="space-y-4">
          <FeesReport since={since} currency={currency} />
        </TabsContent>
        <TabsContent value="exams" className="space-y-4">
          <ExamsReport />
        </TabsContent>
        <TabsContent value="operations" className="space-y-4">
          <OperationsReport />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ---------------- Overview ---------------- */

function OverviewTiles({ since, currency }: { since: string; currency: string }) {
  const { data } = useQuery({
    queryKey: ["reports-overview", since],
    queryFn: async () => {
      const [students, teachers, invoices, payments, attendance, books] = await Promise.all([
        supabase.from("students").select("id, status", { count: "exact" }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id, amount, amount_paid, status").gte("created_at", since),
        supabase.from("payments").select("amount, paid_on").gte("paid_on", since),
        supabase.from("attendance").select("status, date").gte("date", since),
        supabase.from("books").select("id, available_copies, total_copies", { count: "exact" }),
      ]);

      const activeStudents = (students.data ?? []).filter((s) => s.status === "active").length;
      const collected = (payments.data ?? []).reduce((a, p) => a + Number(p.amount ?? 0), 0);
      const outstanding = (invoices.data ?? []).reduce(
        (a, i) => a + Math.max(0, Number(i.amount ?? 0) - Number(i.amount_paid ?? 0)),
        0,
      );
      const attRows = attendance.data ?? [];
      const present = attRows.filter((a) => a.status === "present" || a.status === "late").length;
      const attRate = attRows.length ? Math.round((present / attRows.length) * 100) : 0;
      const bookRows = books.data ?? [];
      const totalCopies = bookRows.reduce((a, b) => a + Number(b.total_copies ?? 0), 0);
      const availCopies = bookRows.reduce((a, b) => a + Number(b.available_copies ?? 0), 0);

      return {
        activeStudents,
        totalStudents: students.count ?? 0,
        teachers: teachers.count ?? 0,
        collected,
        outstanding,
        attRate,
        attSamples: attRows.length,
        booksOut: totalCopies - availCopies,
        totalCopies,
      };
    },
  });

  const tiles = [
    {
      icon: Users, label: "Active students",
      value: data ? `${data.activeStudents}` : "—",
      sub: data ? `${data.totalStudents} on roll` : "",
    },
    {
      icon: CalendarCheck, label: "Attendance rate",
      value: data ? `${data.attRate}%` : "—",
      sub: data ? `${data.attSamples.toLocaleString()} records` : "",
      trend: data && data.attRate >= 85 ? "up" : "down",
    },
    {
      icon: Wallet, label: "Fees collected",
      value: data ? `${currency} ${data.collected.toLocaleString()}` : "—",
      sub: data ? `${currency} ${data.outstanding.toLocaleString()} outstanding` : "",
    },
    {
      icon: BookOpen, label: "Books on loan",
      value: data ? `${data.booksOut}` : "—",
      sub: data ? `of ${data.totalCopies} copies` : "",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="mtis-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.label}</p>
            <t.icon className="size-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="font-display text-2xl font-bold">{t.value}</p>
            {t.trend === "up" && <TrendingUp className="size-4 text-success" />}
            {t.trend === "down" && <TrendingDown className="size-4 text-warning" />}
          </div>
          {t.sub && <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Attendance ---------------- */

function AttendanceReport({ since }: { since: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-attendance", since],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("attendance")
        .select("date, status, class_id, classes(name, section)")
        .gte("date", since);
      if (error) throw error;

      const byClass = new Map<string, { name: string; total: number; present: number }>();
      const byDate = new Map<string, { total: number; present: number }>();
      for (const r of rows ?? []) {
        const cid = r.class_id as string;
        const cls = (r as any).classes;
        const label = cls ? `${cls.name}${cls.section ? " - " + cls.section : ""}` : "—";
        const c = byClass.get(cid) ?? { name: label, total: 0, present: 0 };
        c.total += 1;
        if (r.status === "present" || r.status === "late") c.present += 1;
        byClass.set(cid, c);

        const d = byDate.get(r.date as string) ?? { total: 0, present: 0 };
        d.total += 1;
        if (r.status === "present" || r.status === "late") d.present += 1;
        byDate.set(r.date as string, d);
      }
      const classList = Array.from(byClass.values())
        .map((c) => ({ ...c, rate: c.total ? Math.round((c.present / c.total) * 100) : 0 }))
        .sort((a, b) => a.rate - b.rate);
      const trend = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([date, v]) => ({
          date,
          label: new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
          rate: v.total ? Math.round((v.present / v.total) * 100) : 0,
        }));
      return { classList, trend };
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="mtis-card p-5">
        <h3 className="font-display text-base font-bold">Attendance by class</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Lowest rates surface first — investigate & intervene.</p>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data?.classList.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No attendance recorded in this range.</p>
        )}
        {data && data.classList.length > 0 && (
          <div className="mt-3" style={{ height: Math.max(160, data.classList.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.classList}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  formatter={(
                    v: number,
                    _n,
                    p?: { payload?: { present: number; total: number } },
                  ) => [`${v}% (${p?.payload?.present ?? 0}/${p?.payload?.total ?? 0})`, "Rate"]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {data.classList.map((c, i) => (
                    <Cell
                      key={i}
                      fill={c.rate >= 85 ? "var(--success)" : c.rate >= 70 ? "var(--warning)" : "var(--destructive)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mtis-card p-5">
        <h3 className="font-display text-base font-bold">Daily attendance trend</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Present + late rate over the selected range.</p>
        <div className="mt-4 h-56">
          {data && data.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="reportsAttendanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} width={36} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Attendance"]} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={2} fill="url(#reportsAttendanceFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No trend data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Fees ---------------- */

function FeesReport({ since, currency }: { since: string; currency: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-fees", since],
    queryFn: async () => {
      const [invoices, payments] = await Promise.all([
        supabase.from("invoices").select("id, amount, amount_paid, status, due_date, created_at"),
        supabase.from("payments").select("amount, paid_on, method").gte("paid_on", since),
      ]);

      const inv = invoices.data ?? [];
      const paid = inv.filter((i) => i.status === "paid").length;
      const partial = inv.filter((i) => i.status === "partial").length;
      const overdue = inv.filter((i) =>
        i.status !== "paid" && i.due_date && new Date(i.due_date as string) < new Date()
      ).length;
      const outstanding = inv.reduce(
        (a, i) => a + Math.max(0, Number(i.amount ?? 0) - Number(i.amount_paid ?? 0)),
        0,
      );

      const byMethod = new Map<string, number>();
      const collected = (payments.data ?? []).reduce((a, p) => {
        const m = (p.method as string) ?? "other";
        byMethod.set(m, (byMethod.get(m) ?? 0) + Number(p.amount ?? 0));
        return a + Number(p.amount ?? 0);
      }, 0);

      return {
        paid, partial, overdue, outstanding, collected,
        methods: Array.from(byMethod.entries()).sort((a, b) => b[1] - a[1]),
      };
    },
  });

  const stats = [
    { label: "Collected (range)", value: data ? `${currency} ${data.collected.toLocaleString()}` : "—" },
    { label: "Outstanding", value: data ? `${currency} ${data.outstanding.toLocaleString()}` : "—" },
    { label: "Paid invoices", value: data ? `${data.paid}` : "—" },
    { label: "Overdue invoices", value: data ? `${data.overdue}` : "—" },
  ];

  const pieData = (data?.methods ?? []).map(([method, amount]) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1),
    value: amount,
  }));

  const statusData = data
    ? [
        { status: "Paid", count: data.paid },
        { status: "Partial", count: data.partial },
        { status: "Overdue", count: data.overdue },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="mtis-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="mtis-card p-5">
          <h3 className="font-display text-base font-bold">Collection by payment method</h3>
          {isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && pieData.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No payments recorded in this range.</p>
          )}
          {pieData.length > 0 && (
            <div className="mt-2 grid gap-4 sm:grid-cols-2 sm:items-center">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${currency} ${v.toLocaleString()}`, "Collected"]}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {data?.methods.map(([method, amount], i) => {
                  const pct = data.collected > 0 ? Math.round((amount / data.collected) * 100) : 0;
                  return (
                    <div key={method} className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="flex-1 truncate font-medium capitalize">{method}</span>
                      <span className="tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mtis-card p-5">
          <h3 className="font-display text-base font-bold">Invoice status</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">All invoices, by current status.</p>
          <div className="mt-4 h-48">
            {statusData.some((s) => s.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="status" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    <Cell fill="var(--success)" />
                    <Cell fill="var(--warning)" />
                    <Cell fill="var(--destructive)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Exams ---------------- */

function ExamsReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-exams"],
    queryFn: async () => {
      const { data: results, error } = await supabase
        .from("exam_results")
        .select("marks_obtained, is_absent, exams(title, subject, total_marks)");
      if (error) throw error;

      const byExam = new Map<string, { name: string; count: number; sum: number; pass: number }>();
      for (const r of results ?? []) {
        const ex = (r as any).exams;
        if (!ex || r.is_absent) continue;
        const key = `${ex.title} · ${ex.subject}`;
        const b = byExam.get(key) ?? { name: key, count: 0, sum: 0, pass: 0 };
        const max = Number(ex.total_marks ?? 0);
        const pct = max > 0 ? (Number(r.marks_obtained ?? 0) / max) * 100 : 0;
        b.count += 1;
        b.sum += pct;
        if (pct >= 40) b.pass += 1;
        byExam.set(key, b);
      }
      return Array.from(byExam.values())
        .map((e) => ({
          name: e.name,
          count: e.count,
          avg: e.count ? Math.round(e.sum / e.count) : 0,
          passRate: e.count ? Math.round((e.pass / e.count) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);
    },
  });

  return (
    <div className="space-y-4">
      <div className="mtis-card p-5">
        <h3 className="font-display text-base font-bold">Average score by exam</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Average percentage scored, across all results.</p>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No exam results recorded yet.</p>
        )}
        {data && data.length > 0 && (
          <div className="mt-3" style={{ height: Math.max(160, data.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={140} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Average"]} contentStyle={tooltipStyle} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {data.map((e, i) => (
                    <Cell key={i} fill={e.passRate >= 75 ? "var(--success)" : e.passRate >= 50 ? "var(--warning)" : "var(--destructive)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mtis-card overflow-hidden">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-base font-bold">Exam performance summary</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Average score and pass rate (≥ 40%) per exam.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Exam</th>
                <th className="px-5 py-3 text-right">Results</th>
                <th className="px-5 py-3 text-right">Avg %</th>
                <th className="px-5 py-3 text-right">Pass rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && data?.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">No exam results recorded yet.</td></tr>
              )}
              {data?.map((r) => (
                <tr key={r.name}>
                  <td className="px-5 py-3 font-medium">{r.name}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{r.count}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{r.avg}%</td>
                  <td className="px-5 py-3 text-right">
                    <Badge variant={r.passRate >= 75 ? "default" : r.passRate >= 50 ? "secondary" : "destructive"}>
                      {r.passRate}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Operations ---------------- */

function OperationsReport() {
  const { data } = useQuery({
    queryKey: ["reports-operations"],
    queryFn: async () => {
      const [books, issues, homework, transportA, routes] = await Promise.all([
        supabase.from("books").select("total_copies, available_copies"),
        supabase.from("book_issues").select("id, status, due_date"),
        supabase.from("homework").select("id, status, due_date"),
        supabase.from("transport_assignments").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("transport_routes").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const totalCopies = (books.data ?? []).reduce((a, b) => a + Number(b.total_copies ?? 0), 0);
      const availCopies = (books.data ?? []).reduce((a, b) => a + Number(b.available_copies ?? 0), 0);
      const activeIssues = (issues.data ?? []).filter((i) => i.status === "issued").length;
      const overdueIssues = (issues.data ?? []).filter(
        (i) => i.status === "issued" && i.due_date && new Date(i.due_date as string) < new Date(),
      ).length;
      const activeHomework = (homework.data ?? []).filter((h) => h.status === "assigned").length;
      const overdueHomework = (homework.data ?? []).filter(
        (h) => h.status === "assigned" && h.due_date && new Date(h.due_date as string) < new Date(),
      ).length;

      return {
        library: { totalCopies, availCopies, activeIssues, overdueIssues },
        homework: { active: activeHomework, overdue: overdueHomework },
        transport: { students: transportA.count ?? 0, routes: routes.count ?? 0 },
      };
    },
  });

  const riskData = data
    ? [
        { area: "Library loans", active: data.library.activeIssues, overdue: data.library.overdueIssues },
        { area: "Homework", active: data.homework.active, overdue: data.homework.overdue },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="mtis-card p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <h3 className="font-display text-base font-bold">Library</h3>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Total copies" value={data?.library.totalCopies ?? "—"} />
            <Row label="Available" value={data?.library.availCopies ?? "—"} />
            <Row label="On loan" value={data ? data.library.activeIssues : "—"} />
            <Row
              label="Overdue"
              value={data?.library.overdueIssues ?? "—"}
              tone={data && data.library.overdueIssues > 0 ? "warn" : undefined}
            />
          </dl>
        </div>

        <div className="mtis-card p-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            <h3 className="font-display text-base font-bold">Homework</h3>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Active assignments" value={data?.homework.active ?? "—"} />
            <Row
              label="Overdue"
              value={data?.homework.overdue ?? "—"}
              tone={data && data.homework.overdue > 0 ? "warn" : undefined}
            />
          </dl>
        </div>

        <div className="mtis-card p-5">
          <div className="flex items-center gap-2">
            <Bus className="size-4 text-primary" />
            <h3 className="font-display text-base font-bold">Transport</h3>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Active routes" value={data?.transport.routes ?? "—"} />
            <Row label="Students enrolled" value={data?.transport.students ?? "—"} />
          </dl>
        </div>
      </div>

      <div className="mtis-card p-5">
        <h3 className="font-display text-base font-bold">Active vs. overdue</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Where operational follow-up is needed right now.</p>
        <div className="mt-4 h-48">
          {riskData.some((r) => r.active + r.overdue > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="area" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="active" name="Active" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name="Overdue" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing active or overdue right now.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number | string; tone?: "warn" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-semibold tabular-nums ${tone === "warn" ? "text-warning" : ""}`}>{value}</dd>
    </div>
  );
}

/* ---------------- PDF export data ---------------- */

/**
 * Independently re-fetches everything the on-screen report tabs show and
 * shapes it into printable sections. Kept separate from the tab components
 * so the export works regardless of which tab is currently open.
 */
async function buildReportSections(since: string, currency: string): Promise<DocSection[]> {
  const [students, teachers, invoices, payments, attendance, books, examResults, bookIssues, homework, transportA, routes] =
    await Promise.all([
      supabase.from("students").select("id, status", { count: "exact" }),
      supabase.from("teachers").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id, amount, amount_paid, status, due_date"),
      supabase.from("payments").select("amount, paid_on, method").gte("paid_on", since),
      supabase.from("attendance").select("date, status, class_id, classes(name, section)").gte("date", since),
      supabase.from("books").select("id, available_copies, total_copies"),
      supabase.from("exam_results").select("marks_obtained, is_absent, exams(title, subject, total_marks)"),
      supabase.from("book_issues").select("id, status, due_date"),
      supabase.from("homework").select("id, status, due_date"),
      supabase.from("transport_assignments").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("transport_routes").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

  const activeStudents = (students.data ?? []).filter((s) => s.status === "active").length;
  const collected = (payments.data ?? []).reduce((a, p) => a + Number(p.amount ?? 0), 0);
  const outstanding = (invoices.data ?? []).reduce(
    (a, i) => a + Math.max(0, Number(i.amount ?? 0) - Number(i.amount_paid ?? 0)),
    0,
  );
  const attRows = attendance.data ?? [];
  const attPresent = attRows.filter((a) => a.status === "present" || a.status === "late").length;
  const attRate = attRows.length ? Math.round((attPresent / attRows.length) * 100) : 0;
  const totalCopies = (books.data ?? []).reduce((a, b) => a + Number(b.total_copies ?? 0), 0);
  const availCopies = (books.data ?? []).reduce((a, b) => a + Number(b.available_copies ?? 0), 0);

  const overview: DocSection = {
    heading: "Overview",
    tableHead: ["Metric", "Value"],
    tableRows: [
      ["Active students", `${activeStudents} of ${students.count ?? 0} on roll`],
      ["Staff & teachers", `${teachers.count ?? 0}`],
      ["Attendance rate (range)", `${attRate}% (${attRows.length.toLocaleString()} records)`],
      ["Fees collected (range)", `${currency} ${collected.toLocaleString()}`],
      ["Fees outstanding", `${currency} ${outstanding.toLocaleString()}`],
      ["Books on loan", `${totalCopies - availCopies} of ${totalCopies}`],
    ],
  };

  const byClass = new Map<string, { name: string; total: number; present: number }>();
  for (const r of attRows) {
    const cls = (r as any).classes;
    const label = cls ? `${cls.name}${cls.section ? " - " + cls.section : ""}` : "—";
    const c = byClass.get(r.class_id as string) ?? { name: label, total: 0, present: 0 };
    c.total += 1;
    if (r.status === "present" || r.status === "late") c.present += 1;
    byClass.set(r.class_id as string, c);
  }
  const attendanceSection: DocSection = {
    heading: "Attendance by class",
    intro: "Lowest rates listed first.",
    tableHead: ["Class", "Present", "Total", "Rate"],
    tableRows: Array.from(byClass.values())
      .map((c) => ({ ...c, rate: c.total ? Math.round((c.present / c.total) * 100) : 0 }))
      .sort((a, b) => a.rate - b.rate)
      .map((c) => [c.name, String(c.present), String(c.total), `${c.rate}%`]),
  };

  const inv = invoices.data ?? [];
  const paidCount = inv.filter((i) => i.status === "paid").length;
  const partialCount = inv.filter((i) => i.status === "partial").length;
  const overdueCount = inv.filter(
    (i) => i.status !== "paid" && i.due_date && new Date(i.due_date as string) < new Date(),
  ).length;
  const byMethod = new Map<string, number>();
  for (const p of payments.data ?? []) {
    const m = (p.method as string) ?? "other";
    byMethod.set(m, (byMethod.get(m) ?? 0) + Number(p.amount ?? 0));
  }
  const feesSection: DocSection = {
    heading: "Fee collection by method",
    tableHead: ["Method", "Amount", "% of collected"],
    tableRows: Array.from(byMethod.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([method, amount]) => [
        method.charAt(0).toUpperCase() + method.slice(1),
        `${currency} ${amount.toLocaleString()}`,
        collected > 0 ? `${Math.round((amount / collected) * 100)}%` : "0%",
      ]),
    totals: [
      { label: "Total collected (range)", value: `${currency} ${collected.toLocaleString()}` },
      { label: "Outstanding (all invoices)", value: `${currency} ${outstanding.toLocaleString()}`, strong: true },
    ],
  };
  const invoiceStatusSection: DocSection = {
    heading: "Invoice status",
    tableHead: ["Status", "Count"],
    tableRows: [
      ["Paid", String(paidCount)],
      ["Partial", String(partialCount)],
      ["Overdue", String(overdueCount)],
    ],
  };

  const byExam = new Map<string, { name: string; count: number; sum: number; pass: number }>();
  for (const r of examResults.data ?? []) {
    const ex = (r as any).exams;
    if (!ex || r.is_absent) continue;
    const key = `${ex.title} · ${ex.subject}`;
    const b = byExam.get(key) ?? { name: key, count: 0, sum: 0, pass: 0 };
    const max = Number(ex.total_marks ?? 0);
    const pct = max > 0 ? (Number(r.marks_obtained ?? 0) / max) * 100 : 0;
    b.count += 1;
    b.sum += pct;
    if (pct >= 40) b.pass += 1;
    byExam.set(key, b);
  }
  const examsSection: DocSection = {
    heading: "Exam performance",
    intro: "Average score and pass rate (≥ 40%) per exam.",
    tableHead: ["Exam", "Results", "Avg %", "Pass rate"],
    tableRows: Array.from(byExam.values())
      .map((e) => ({
        name: e.name,
        count: e.count,
        avg: e.count ? Math.round(e.sum / e.count) : 0,
        passRate: e.count ? Math.round((e.pass / e.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .map((e) => [e.name, String(e.count), `${e.avg}%`, `${e.passRate}%`]),
  };

  const activeIssues = (bookIssues.data ?? []).filter((i) => i.status === "issued").length;
  const overdueIssues = (bookIssues.data ?? []).filter(
    (i) => i.status === "issued" && i.due_date && new Date(i.due_date as string) < new Date(),
  ).length;
  const activeHomework = (homework.data ?? []).filter((h) => h.status === "assigned").length;
  const overdueHomework = (homework.data ?? []).filter(
    (h) => h.status === "assigned" && h.due_date && new Date(h.due_date as string) < new Date(),
  ).length;
  const operationsSection: DocSection = {
    heading: "Operations",
    tableHead: ["Area", "Metric", "Value"],
    tableRows: [
      ["Library", "Total copies", String(totalCopies)],
      ["Library", "Available", String(availCopies)],
      ["Library", "On loan", String(activeIssues)],
      ["Library", "Overdue", String(overdueIssues)],
      ["Homework", "Active assignments", String(activeHomework)],
      ["Homework", "Overdue", String(overdueHomework)],
      ["Transport", "Active routes", String(routes.count ?? 0)],
      ["Transport", "Students enrolled", String(transportA.count ?? 0)],
    ],
  };

  return [overview, attendanceSection, feesSection, invoiceStatusSection, examsSection, operationsSection];
}
