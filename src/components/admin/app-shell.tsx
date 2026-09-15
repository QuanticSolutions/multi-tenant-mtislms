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
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/use-role";
import { usePermissions } from "@/hooks/use-permissions";
import type { ModuleKey } from "@/lib/modules";

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to?: string;
  search?: Record<string, string>;
  comingSoon?: boolean;
  teacher?: boolean;
  module?: ModuleKey;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { icon: TrendingUp, label: "Dashboard", to: "/admin", teacher: true },
      { icon: BarChart3, label: "Reports", to: "/admin/reports" , module: "reports" },
    ],
  },
  {
    label: "Students",
    items: [
      { icon: Users, label: "Students", to: "/admin/students", teacher: true , module: "students" },
      { icon: ClipboardCheck, label: "Admissions", to: "/admin/admissions" , module: "admissions" },
      { icon: Bus, label: "Transport drivers", to: "/admin/drivers" , module: "transport" },
      { icon: ArrowUpRight, label: "Promotion", to: "/admin/promotion" , module: "students" },
      { icon: UserCheck, label: "Parents", to: "/admin/parents" , module: "parents" },
    ],
  },
  {
    label: "Teachers & Staff",
    items: [
      { icon: GraduationCap, label: "Teachers", to: "/admin/teachers" , module: "teachers" },
      { icon: Users, label: "Employees", to: "/admin/staff-directory", module: "employees" },
      { icon: Layers, label: "Departments", to: "/admin/setup/departments", module: "departments" },
    ],
  },
  {
    label: "Attendance",
    items: [
      {
        icon: CalendarCheck,
        label: "Student attendance",
        to: "/admin/attendance",
        teacher: true,
        module: "attendance",
      },
      {
        icon: ClipboardList,
        label: "Staff attendance",
        to: "/admin/staff",
        search: { tab: "attendance" },
        module: "attendance",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        icon: ArrowDownCircle,
        label: "Income — student fees",
        to: "/admin/finance",
        search: { tab: "income" },
        module: "finance",
      },
      {
        icon: ArrowUpCircle,
        label: "Outgoing — staff payroll",
        to: "/admin/finance",
        search: { tab: "outgoing" },
        module: "payroll",
      },
    ],
  },
  {
    label: "Academics",
    items: [
      { icon: School, label: "Classes", to: "/admin/classes", teacher: true , module: "classes" },
      { icon: Layers, label: "Subjects", to: "/admin/subjects", teacher: true , module: "subjects" },
      { icon: CalendarDays, label: "Timetable", to: "/admin/timetable", teacher: true , module: "timetable" },
      { icon: FileText, label: "Exams", to: "/admin/exams" , module: "exams" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: BookOpen, label: "Library", to: "/admin/library" , module: "library" },
      { icon: Package, label: "Inventory", to: "/admin/inventory" , module: "inventory" },
    ],
  },
  {
    label: "Communication",
    items: [
      { icon: MessageSquare, label: "Announcements", to: "/admin/messaging", teacher: true , module: "messaging" },
      { icon: Bell, label: "Notifications", to: "/admin/notifications" , module: "notifications" },
      { icon: CalendarRange, label: "Events", to: "/admin/events", teacher: true , module: "events" },
    ],
  },
  {
    label: "General",
    items: [
      { icon: UserCog, label: "Users", to: "/admin/users" , module: "users" },
      { icon: Upload, label: "Import Data", to: "/admin/import" , module: "import" },
      { icon: Settings, label: "Settings", to: "/admin/settings" , module: "settings" },
      { icon: Activity, label: "Audit Log", to: "/admin/audit" , module: "audit" },
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

/** Tab a page shows when no ?tab= param is present. */
function defaultTabFor(path: string) {
  if (path === "/admin/finance") return "income";
  if (path === "/admin/staff") return "attendance";
  return undefined;
}

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchTab = useRouterState({
    select: (s) => (s.location.search as { tab?: string })?.tab,
  });
  const { isAdmin, loaded } = useMyRoles();
  const { can, permissions, loaded: permsLoaded } = usePermissions();
  const restrict = loaded && !isAdmin;
  // Only apply the permission matrix when the user actually has one assigned;
  // otherwise fall back to the role-based (teacher) filtering.
  const usePermissionMatrix = permsLoaded && !isAdmin && permissions.length > 0;

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => {
      if (usePermissionMatrix) return !it.module || can(it.module, "read");
      return restrict ? Boolean(it.teacher) : true;
    }),
  })).filter((g) => g.items.length > 0);

  const isItemActive = (it: NavItem) => {
    if (!it.to) return false;
    const pathMatch =
      it.to === "/admin" ? pathname === "/admin" : pathname.startsWith(it.to);
    if (!pathMatch) return false;
    if (it.search?.["tab"]) return (searchTab ?? defaultTabFor(it.to)) === it.search["tab"];
    return true;
  };

  const [openGroup, setOpenGroup] = useState<string | null>(null);


  return (
    <aside className="sticky top-[88px] hidden h-[calc(100vh-104px)] w-60 shrink-0 lg:block">
      <div className="mtis-card flex h-full min-h-0 flex-col overflow-hidden p-3">
        <p className="mtis-eyebrow shrink-0 px-3 pb-2 pt-1">Workspace</p>
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <div className="space-y-2">
            {groups.map((group) => {
              const expanded = openGroup === group.label;
              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroup((cur) => (cur === group.label ? null : group.label))
                    }

                    aria-expanded={expanded}
                    className="flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-primary"
                  >
                    <ChevronRight
                      className={`size-3 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
                    />
                    <span className="truncate">{group.label}</span>
                  </button>
                  {expanded && (
                    <ul className="space-y-1">
                      {group.items.map((it) => {
                        const active = isItemActive(it);
                        const cls = `flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary-pale text-primary"
                            : "text-muted-foreground hover:bg-primary-pale/60 hover:text-primary"
                        }`;
                        return (
                          <li key={it.label} className="min-w-0">
                            {it.to && !it.comingSoon ? (
                              <Link to={it.to} search={it.search as never} className={cls}>
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
                  )}
                </div>
              );
            })}
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


