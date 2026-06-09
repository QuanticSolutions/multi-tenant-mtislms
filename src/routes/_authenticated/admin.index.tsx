import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Bell,
  Search,
  Users,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  Wallet,
  ChevronDown,
  LogOut,
  ShieldAlert,
  Plus,
  FileText,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — MTIS" },
      { name: "description", content: "MTIS administration overview." },
    ],
  }),
  component: AdminDashboard,
});

interface SessionUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? null,
          full_name:
            (data.user.user_metadata?.full_name as string | undefined) ??
            data.user.email?.split("@")[0] ??
            null,
        });
      }
    });
  }, []);

  const { data: rolesData } = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data?.map((r) => r.role) ?? [];
    },
  });

  const isAdmin = rolesData?.includes("admin") ?? false;
  const rolesLoaded = rolesData !== undefined;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // If user is signed in but has no admin role, show a friendly notice.
  if (rolesLoaded && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onSignOut={handleSignOut} />
        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-warning-soft text-warning">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is signed in but doesn't yet have the admin role. Ask an existing admin
            to grant you access, or sign out and use an admin account.
          </p>
          <Button variant="outline" className="mt-6" onClick={handleSignOut}>
            <LogOut /> Sign out
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onSignOut={handleSignOut} />

      <div className="mx-auto flex max-w-[1400px] gap-6 px-6 py-6">
        <Sidebar />

        <main className="flex-1 space-y-6">
          {/* Page heading */}
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
              <Button>
                <Plus /> Quick add
              </Button>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={Users} label="Total Students" value="1,284" delta="+24 this week" tone="primary" />
            <StatTile icon={GraduationCap} label="Teachers" value="86" delta="3 on leave today" tone="info" />
            <StatTile icon={CalendarCheck} label="Attendance" value="96.4%" delta="vs 94.1% last week" tone="success" />
            <StatTile icon={Wallet} label="Fees Overdue" value="₨ 412,500" delta="18 invoices" tone="danger" />
          </div>

          {/* Two-column lower section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recent admissions */}
            <div className="mtis-card overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h3 className="mtis-section-title">Recent Admissions</h3>
                  <p className="text-xs text-muted-foreground">Updated 2 minutes ago</p>
                </div>
                <Button variant="ghost" size="sm">
                  View all <ArrowUpRight />
                </Button>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-background">
                    <Th>Student</Th>
                    <Th>Class</Th>
                    <Th>Status</Th>
                    <Th>Fees</Th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr
                      key={r.roll}
                      className="border-t border-border transition-colors hover:bg-primary-pale/60"
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-pale text-xs font-semibold text-primary">
                            {r.initials}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{r.name}</div>
                            <div className="text-xs text-muted-foreground">{r.roll}</div>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-muted-foreground">{r.cls}</Td>
                      <Td>
                        <Badge variant={r.statusVariant}>{r.status}</Badge>
                      </Td>
                      <Td>
                        <Badge variant={r.feeVariant}>{r.fee}</Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Side card: activity */}
            <div className="mtis-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="mtis-section-title">Activity</h3>
                <TrendingUp className="size-4 text-muted-foreground" />
              </div>
              <ul className="mt-4 space-y-4">
                {ACTIVITY.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[a.tone]}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{a.text}</p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" className="mt-5 w-full justify-center">
                View all activity
              </Button>
            </div>
          </div>

          {/* Empty state placeholder for future modules */}
          <div className="mtis-card grid place-items-center px-6 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <BookOpen className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">More modules coming soon</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Students, Teachers, Attendance, Exams, Fees, Library & Messaging will appear here as
              we build them out.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- Header ---------- */
function Header({
  user,
  onSignOut,
}: {
  user: SessionUser | null;
  onSignOut: () => void;
}) {
  const initials = (user?.full_name ?? user?.email ?? "MT")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface shadow-card">
      <div className="mx-auto flex h-full max-w-[1400px] items-center gap-6 px-6">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground font-display font-bold">
            M
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight text-primary">MTIS</div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Admin Panel
            </div>
          </div>
        </Link>

        <div className="ml-6 hidden flex-1 max-w-[420px] md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search students, teachers, classes…" className="pl-9" />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="hidden items-center gap-2 rounded-full border border-primary-light/40 bg-primary-pale px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-pale/70 sm:inline-flex">
            Session 2025–26
            <ChevronDown className="size-3.5" />
          </button>
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" />
          </Button>
          <div className="hidden text-right sm:block">
            <div className="text-xs font-semibold text-foreground">
              {user?.full_name ?? "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">Administrator</div>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={onSignOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ---------- Sidebar ---------- */
function Sidebar() {
  const items = [
    { icon: TrendingUp, label: "Dashboard", active: true },
    { icon: Users, label: "Students" },
    { icon: GraduationCap, label: "Teachers" },
    { icon: CalendarCheck, label: "Attendance" },
    { icon: FileText, label: "Exams" },
    { icon: Wallet, label: "Fees" },
    { icon: BookOpen, label: "Library" },
  ];
  return (
    <aside className="sticky top-[88px] hidden h-[calc(100vh-104px)] w-60 shrink-0 lg:block">
      <nav className="mtis-card flex h-full flex-col p-3">
        <p className="mtis-eyebrow px-3 pb-2 pt-1">Workspace</p>
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.label}>
              <button
                onClick={() => !it.active && toast("Coming soon")}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  it.active
                    ? "bg-primary-pale text-primary"
                    : "text-muted-foreground hover:bg-primary-pale/60 hover:text-primary"
                }`}
              >
                <it.icon className="size-4" />
                {it.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-auto rounded-md border border-border bg-background p-3">
          <p className="text-xs font-semibold text-foreground">Need help?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check the MTIS handbook for setup steps.
          </p>
        </div>
      </nav>
    </aside>
  );
}

/* ---------- Bits ---------- */
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

const TONE_DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  primary: "bg-primary",
};

const ACTIVITY: Array<{ text: string; time: string; tone: keyof typeof TONE_DOT }> = [
  { text: "Ayesha Khan was admitted to Grade 8 — A", time: "5 min ago", tone: "success" },
  { text: "Fee invoice INV-1043 marked overdue", time: "27 min ago", tone: "danger" },
  { text: "Mid-term timetable published for Grade 10", time: "1 hr ago", tone: "info" },
  { text: "Teacher leave request from Mr. Saleem", time: "2 hr ago", tone: "warning" },
  { text: "Library: 14 new books catalogued", time: "Yesterday", tone: "primary" },
];

const ROWS: Array<{
  name: string;
  initials: string;
  roll: string;
  cls: string;
  status: string;
  statusVariant: "success" | "warning" | "danger";
  fee: string;
  feeVariant: "success" | "warning" | "danger";
}> = [
  { name: "Ayesha Khan", initials: "AK", roll: "MTIS-2025-0142", cls: "Grade 8 — A", status: "Active", statusVariant: "success", fee: "Paid", feeVariant: "success" },
  { name: "Hassan Raza", initials: "HR", roll: "MTIS-2025-0143", cls: "Grade 6 — B", status: "Active", statusVariant: "success", fee: "Pending", feeVariant: "warning" },
  { name: "Maryam Tariq", initials: "MT", roll: "MTIS-2025-0144", cls: "Grade 10 — A", status: "Probation", statusVariant: "warning", fee: "Overdue", feeVariant: "danger" },
  { name: "Bilal Ahmed", initials: "BA", roll: "MTIS-2025-0145", cls: "Grade 4 — C", status: "Active", statusVariant: "success", fee: "Paid", feeVariant: "success" },
];
