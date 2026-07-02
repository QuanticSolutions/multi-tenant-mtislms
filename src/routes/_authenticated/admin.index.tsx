import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Wallet,
  BookOpen,
  TrendingUp,
  FileText,
  Plus,
  ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell, useSessionUser } from "@/components/admin/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Madina Tul Ilm" },
      { name: "description", content: "Madina Tul Ilm administration overview." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const user = useSessionUser();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, classes] = await Promise.all([
        supabase.from("students").select("id, status", { count: "exact" }),
        supabase.from("classes").select("id", { count: "exact", head: true }),
      ]);
      const total = students.count ?? 0;
      const active =
        students.data?.filter((s) => s.status === "active").length ?? 0;
      return { total, active, classes: classes.count ?? 0 };
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
          <Button variant="outline">
            <FileText /> Export report
          </Button>
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
          label="Total Students"
          value={String(stats?.total ?? 0)}
          delta={`${stats?.active ?? 0} active`}
          tone="primary"
        />
        <StatTile
          icon={GraduationCap}
          label="Classes"
          value={String(stats?.classes ?? 0)}
          delta="Across all grades"
          tone="info"
        />
        <StatTile
          icon={CalendarCheck}
          label="Attendance"
          value="—"
          delta="Module coming soon"
          tone="success"
        />
        <StatTile
          icon={Wallet}
          label="Fees Overdue"
          value="—"
          delta="Module coming soon"
          tone="danger"
        />
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
                      {r.classes ? `${r.classes.name}${r.classes.section ? ` — ${r.classes.section}` : ""}` : "—"}
                    </Td>
                    <Td>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No students yet. <Link to="/admin/students" className="text-primary hover:underline">Add the first one →</Link>
            </div>
          )}
        </div>

        <div className="mtis-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="mtis-section-title">Activity</h3>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          <ul className="mt-4 space-y-4">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[a.tone]}`} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mtis-card grid place-items-center px-6 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
          <BookOpen className="size-5" />
        </div>
        <h3 className="mt-3 font-display text-base font-semibold">More modules coming soon</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Teachers, Attendance, Exams, Fees, Library & Messaging will appear here as we build
          them out.
        </p>
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

const TONE_DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  primary: "bg-primary",
};

const ACTIVITY: Array<{ text: string; time: string; tone: keyof typeof TONE_DOT }> = [
  { text: "Students module is live — start adding records", time: "Just now", tone: "success" },
  { text: "Classes seeded for academic year 2025–26", time: "Today", tone: "info" },
  { text: "Admin role assigned to first registered user", time: "Earlier", tone: "primary" },
];
