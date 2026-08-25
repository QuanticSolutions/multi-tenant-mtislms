import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
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
  TrendingUp,
  FileText,
  MessageSquare,
  CalendarDays,
  ClipboardList,
  Bus,
  BarChart3,
  CalendarRange,
  Package,
  UserCheck,
  ClipboardCheck,
  Settings,
  Activity,
  School,
  Layers,
  ArrowUpRight,
  UserCog,
  HeartHandshake,
  BriefcaseBusiness,
  Upload,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/use-role";

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to?: string;
  comingSoon?: boolean;
  teacher?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { icon: TrendingUp, label: "Dashboard", to: "/admin", teacher: true },
      { icon: BarChart3, label: "Reports", to: "/admin/reports" },
    ],
  },
  {
    label: "Students",
    items: [
      { icon: Users, label: "Students", to: "/admin/students", teacher: true },
      { icon: ClipboardCheck, label: "Admissions", to: "/admin/admissions" },
      { icon: HeartHandshake, label: "Donations", to: "/admin/donations" },
      { icon: BriefcaseBusiness, label: "Employees", to: "/admin/employees" },
      { icon: Bus, label: "Transport drivers", to: "/admin/drivers" },
      { icon: ArrowUpRight, label: "Promotion", to: "/admin/promotion" },
      { icon: UserCheck, label: "Parents", to: "/admin/parents" },
    ],
  },
  {
    label: "Teachers & Staff",
    items: [
      { icon: GraduationCap, label: "Teachers", to: "/admin/teachers" },
      { icon: ClipboardList, label: "Staff & Payroll", to: "/admin/staff" },
    ],
  },
  {
    label: "Academics",
    items: [
      { icon: School, label: "Classes", to: "/admin/classes", teacher: true },
      { icon: Layers, label: "Subjects", to: "/admin/subjects", teacher: true },
      { icon: CalendarCheck, label: "Attendance", to: "/admin/attendance", teacher: true },
      { icon: CalendarDays, label: "Timetable", to: "/admin/timetable", teacher: true },
      { icon: FileText, label: "Exams", to: "/admin/exams" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: Wallet, label: "Fees", to: "/admin/fees" },
      { icon: Banknote, label: "Finance", to: "/admin/finance" },
      { icon: BookOpen, label: "Library", to: "/admin/library" },
      { icon: Package, label: "Inventory", to: "/admin/inventory" },
    ],
  },
  {
    label: "Communication",
    items: [
      { icon: MessageSquare, label: "Announcements", to: "/admin/messaging", teacher: true },
      { icon: Bell, label: "Notifications", to: "/admin/notifications" },
      { icon: CalendarRange, label: "Events", to: "/admin/events", teacher: true },
    ],
  },
  {
    label: "General",
    items: [
      { icon: UserCog, label: "Users", to: "/admin/users" },
      { icon: Upload, label: "Import Data", to: "/admin/import" },
      { icon: Settings, label: "Settings", to: "/admin/settings" },
      { icon: Activity, label: "Audit Log", to: "/admin/audit" },
    ],
  },
];


export interface SessionUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser({
        id: data.user.id,
        email: data.user.email ?? null,
        full_name:
          (data.user.user_metadata?.full_name as string | undefined) ??
          data.user.email?.split("@")[0] ??
          null,
      });
    });
  }, []);
  return user;
}

export function AppShell({ children }: { children: ReactNode }) {
  const user = useSessionUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onSignOut={handleSignOut} />
      <div className="mx-auto flex max-w-[1400px] gap-6 px-6 py-6">
        <Sidebar />
        <main className="flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
}

function Header({
  user,
  onSignOut,
}: {
  user: SessionUser | null;
  onSignOut: () => void;
}) {
  const { isAdmin, isTeacher } = useMyRoles();
  const roleLabel = isAdmin ? "Administrator" : isTeacher ? "Teacher" : "Staff";
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
            <div className="font-display text-lg font-bold tracking-tight text-primary">Madina Tul Ilm</div>
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
            <div className="text-xs font-semibold text-foreground">{user?.full_name ?? "—"}</div>
            <div className="text-[11px] capitalize text-muted-foreground">{roleLabel}</div>
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

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, loaded } = useMyRoles();
  const restrict = loaded && !isAdmin;

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: restrict ? g.items.filter((it) => it.teacher) : g.items,
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="sticky top-[88px] hidden h-[calc(100vh-104px)] w-60 shrink-0 lg:block">
      <div className="mtis-card flex h-full min-h-0 flex-col overflow-hidden p-3">
        <p className="mtis-eyebrow shrink-0 px-3 pb-2 pt-1">Workspace</p>
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {group.items.map((it) => {
                    const active =
                      it.to &&
                      (it.to === "/admin" ? pathname === "/admin" : pathname.startsWith(it.to));
                    const cls = `flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary-pale text-primary"
                        : "text-muted-foreground hover:bg-primary-pale/60 hover:text-primary"
                    }`;
                    return (
                      <li key={it.label} className="min-w-0">
                        {it.to && !it.comingSoon ? (
                          <Link to={it.to} className={cls}>
                            <it.icon className="size-4 shrink-0" />
                            <span className="truncate">{it.label}</span>
                          </Link>
                        ) : (
                          <button
                            onClick={() => toast(`${it.label} — coming soon`)}
                            className={cls}
                          >
                            <it.icon className="size-4 shrink-0" />
                            <span className="truncate">{it.label}</span>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <div className="mt-3 shrink-0 rounded-md border border-border bg-background p-3">
          <p className="text-xs font-semibold text-foreground">Need help?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check the Madina Tul Ilm handbook for setup steps.
          </p>
        </div>
      </div>
    </aside>
  );
}


