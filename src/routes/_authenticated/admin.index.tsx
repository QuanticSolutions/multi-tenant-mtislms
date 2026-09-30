import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  Wallet,
  TrendingUp,
  FileText,
  Plus,
  ArrowUpRight,
  CalendarRange,
  ClipboardCheck,
  MapPin,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell, useSessionUser } from "@/components/admin/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatClass, formatStatus, formatDate } from "@/lib/format";
import { useBranding } from "@/hooks/use-branding";
import { useMyTenant, useUpdateOnboarding } from "@/hooks/use-tenant";
import { CheckCircle2, Circle, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard" },
      { name: "description", content: "your school administration overview." },
    ],
  }),
  component: AdminDashboard,
});

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function AdminDashboard() {
  const user = useSessionUser();
  const { branding } = useBranding();
  const currency = branding?.currency ?? "PKR";
  const { data: myTenant } = useMyTenant();
  const updateOnboarding = useUpdateOnboarding();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats", monthStart()],
    queryFn: async () => {
      const since = monthStart();
      const [students, teachers, invoices, payments, admissions] = await Promise.all([
        supabase.from("students").select("id, status", { count: "exact" }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("amount, amount_paid, status"),
        supabase.from("payments").select("amount").gte("paid_on", since),
        supabase
          .from("admission_applications")
          .select("id", { count: "exact", head: true })
          .in("status", ["new", "screening", "interview", "offered"]),
      ]);

      const total = students.count ?? 0;
      const active = students.data?.filter((s) => s.status === "active").length ?? 0;
      const collectedMTD = (payments.data ?? []).reduce((a, p) => a + Number(p.amount ?? 0), 0);
      const outstanding = (invoices.data ?? []).reduce(
        (a, i) => a + Math.max(0, Number(i.amount ?? 0) - Number(i.amount_paid ?? 0)),
        0,
      );

      return {
        total,
        active,
        teachers: teachers.count ?? 0,
        collectedMTD,
        outstanding,
        pendingAdmissions: admissions.count ?? 0,
      };
    },
  });

  const { data: attendanceTrend } = useQuery({
    queryKey: ["admin-attendance-trend"],
    queryFn: async () => {
      const since = isoDaysAgo(13);
      const { data, error } = await supabase
        .from("attendance")
        .select("date, status")
        .gte("date", since);
      if (error) throw error;

      const byDay = new Map<string, { present: number; total: number }>();
      for (let i = 13; i >= 0; i--) {
        byDay.set(isoDaysAgo(i), { present: 0, total: 0 });
      }
      for (const row of data ?? []) {
        const bucket = byDay.get(row.date as string);
        if (!bucket) continue;
        bucket.total += 1;
        if (row.status === "present" || row.status === "late") bucket.present += 1;
      }
      return Array.from(byDay.entries()).map(([date, v]) => ({
        date,
        label: new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        rate: v.total ? Math.round((v.present / v.total) * 100) : null,
      }));
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["admin-recent-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, admission_no, full_name, status, class_id, classes(name, section)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["admin-upcoming-events"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_type, start_date, location, is_holiday")
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: activity } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity_type, actor_email, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const attendanceAvg = (() => {
    const rated = (attendanceTrend ?? []).filter((d) => d.rate !== null) as { rate: number }[];
    if (!rated.length) return null;
    return Math.round(rated.reduce((a, d) => a + d.rate, 0) / rated.length);
  })();

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Dashboard</p>
          <h1 className="mt-1 font-display text-2xl font-bold">
            Welcome back{user?.full_name ? `, ${user.full_name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening across the school today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/reports">
            <Button variant="outline">
              <FileText /> View reports
            </Button>
          </Link>
          <Link to="/admin/students">
            <Button>
              <Plus /> Add student
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Users}
          label="Active Students"
          value={String(stats?.active ?? 0)}
          delta={`${stats?.total ?? 0} on roll`}
          tone="primary"
        />
        <StatTile
          icon={GraduationCap}
          label="Staff & Teachers"
          value={String(stats?.teachers ?? 0)}
          delta="Active employment records"
          tone="info"
        />
        <StatTile
          icon={Wallet}
          label="Fees Collected"
          value={stats ? `${currency} ${stats.collectedMTD.toLocaleString()}` : "—"}
          delta={
            stats
              ? `This month · ${currency} ${stats.outstanding.toLocaleString()} outstanding`
              : "This month"
          }
          tone="success"
        />
        <StatTile
          icon={ClipboardCheck}
          label="Pending Admissions"
          value={String(stats?.pendingAdmissions ?? 0)}
          delta="Awaiting a decision"
          tone={stats && stats.pendingAdmissions > 0 ? "danger" : "primary"}
        />
      </div>

      <SetupChecklist
        steps={myTenant?.onboarding_completed_steps ?? []}
        dismissed={myTenant?.onboarding_dismissed ?? false}
        onDismiss={() => updateOnboarding(null, true)}
        onComplete={(step) => updateOnboarding(step, false)}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="mtis-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mtis-section-title">Attendance — last 14 days</h3>
              <p className="text-xs text-muted-foreground">Daily present + late rate, all classes.</p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-bold text-foreground">
                {attendanceAvg !== null ? `${attendanceAvg}%` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">14-day average</p>
            </div>
          </div>
          <div className="mt-4 h-56">
            {attendanceTrend && attendanceTrend.some((d) => d.rate !== null) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Attendance"]}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#attendanceFill)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                No attendance recorded in the last 14 days.{" "}
                <Link to="/admin/attendance" className="ml-1 text-primary hover:underline">
                  Mark attendance →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mtis-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="mtis-section-title">Upcoming</h3>
            <Link to="/admin/events">
              <CalendarRange className="size-4 text-muted-foreground" />
            </Link>
          </div>
          <ul className="mt-4 space-y-4">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-pale text-[11px] font-bold leading-none text-primary">
                    {new Date(e.start_date as string).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {e.is_holiday ? "Holiday" : formatStatus(e.event_type)}
                      {e.location && (
                        <>
                          <MapPin className="size-3" /> {e.location}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No upcoming events scheduled.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="mtis-card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="mtis-section-title">Recent Admissions</h3>
              <p className="text-xs text-muted-foreground">
                Latest students added to the system
              </p>
            </div>
            <Link to="/admin/students">
              <Button variant="ghost" size="sm">
                View all <ArrowUpRight />
              </Button>
            </Link>
          </div>
          {recent && recent.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-background">
                  <Th>Student</Th>
                  <Th>Class</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r: any) => (
                  <tr
                    key={r.id}
                    className="border-t border-border transition-colors hover:bg-primary-pale/60"
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-pale text-xs font-semibold text-primary">
                          {initialsOf(r.full_name)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{r.full_name}</div>
                          <div className="text-xs text-muted-foreground">{r.admission_no}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-muted-foreground">
                      {r.classes ? formatClass(r.classes.name, r.classes.section) : "—"}
                    </Td>
                    <Td>
                      <Badge variant={statusVariant(r.status)}>{formatStatus(r.status)}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No students yet.{" "}
              <Link to="/admin/students" className="text-primary hover:underline">
                Add the first one →
              </Link>
            </div>
          )}
        </div>

        <div className="mtis-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="mtis-section-title">Recent Activity</h3>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          <ul className="mt-4 space-y-4">
            {activity && activity.length > 0 ? (
              activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{formatStatus(a.action)}</span>{" "}
                      <span className="text-muted-foreground">
                        {formatStatus(a.entity_type)}
                        {a.actor_email ? ` · ${a.actor_email}` : ""}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.created_at as string)}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">
                No activity recorded yet.{" "}
                <Link to="/admin/audit" className="text-primary hover:underline">
                  View audit log →
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  delta,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  tone: "primary" | "success" | "danger" | "info";
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary-pale text-primary",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  };
  return (
    <div className="mtis-card p-5">
      <div className="flex items-center justify-between">
        <span className="mtis-eyebrow">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-md ${toneMap[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{delta}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3.5 align-middle text-foreground ${className}`}>{children}</td>;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusVariant(s: string): "success" | "warning" | "danger" | "default" {
  if (s === "active") return "success";
  if (s === "probation") return "warning";
  if (s === "inactive" || s === "transferred") return "danger";
  return "default";
}

const SETUP_STEPS = [
  { key: "branding", label: "Add school profile & logo", link: "/admin/settings" },
  { key: "classes", label: "Create classes", link: "/admin/classes" },
  { key: "students", label: "Add students", link: "/admin/students" },
  { key: "fees", label: "Set up fee structures", link: "/admin/setup/fees" },
  { key: "team", label: "Invite your team", link: "/admin/users" },
  { key: "done", label: "Review dashboard", link: "/admin" },
] as const;

function SetupChecklist({
  steps,
  dismissed,
  onDismiss,
  onComplete,
}: {
  steps: string[];
  dismissed: boolean;
  onDismiss: () => void;
  onComplete: (step: string) => void;
}) {
  if (dismissed) return null;
  const completedCount = SETUP_STEPS.filter((s) => steps.includes(s.key)).length;
  const allDone = completedCount === SETUP_STEPS.length;
  if (allDone) return null;

  return (
    <div className="mtis-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="mtis-section-title">Setup checklist</h3>
          <p className="text-xs text-muted-foreground">
            {completedCount} of {SETUP_STEPS.length} completed
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss checklist"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(completedCount / SETUP_STEPS.length) * 100}%` }}
        />
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SETUP_STEPS.map((step) => {
          const done = steps.includes(step.key);
          return (
            <li key={step.key}>
              <Link
                to={step.link as never}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-primary-pale/60"
              >
                {done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className={done ? "text-muted-foreground line-through" : "text-foreground"}>
                  {step.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
