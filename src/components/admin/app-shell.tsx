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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to?: string;
  comingSoon?: boolean;
};

const NAV: NavItem[] = [
  { icon: TrendingUp, label: "Dashboard", to: "/admin" },
  { icon: Users, label: "Students", to: "/admin/students" },
  { icon: GraduationCap, label: "Teachers", to: "/admin/teachers" },
  { icon: CalendarCheck, label: "Attendance", to: "/admin/attendance" },
  { icon: FileText, label: "Exams", to: "/admin/exams" },
  { icon: Wallet, label: "Fees", to: "/admin/fees" },
  { icon: BookOpen, label: "Library", comingSoon: true },
  { icon: MessageSquare, label: "Messaging", comingSoon: true },
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
            <div className="text-xs font-semibold text-foreground">{user?.full_name ?? "—"}</div>
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

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="sticky top-[88px] hidden h-[calc(100vh-104px)] w-60 shrink-0 lg:block">
      <nav className="mtis-card flex h-full flex-col p-3">
        <p className="mtis-eyebrow px-3 pb-2 pt-1">Workspace</p>
        <ul className="space-y-1">
          {NAV.map((it) => {
            const active =
              it.to &&
              (it.to === "/admin" ? pathname === "/admin" : pathname.startsWith(it.to));
            const cls = `flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary-pale text-primary"
                : "text-muted-foreground hover:bg-primary-pale/60 hover:text-primary"
            }`;
            return (
              <li key={it.label}>
                {it.to && !it.comingSoon ? (
                  <Link to={it.to} className={cls}>
                    <it.icon className="size-4" />
                    {it.label}
                  </Link>
                ) : (
                  <button onClick={() => toast(`${it.label} — coming soon`)} className={cls}>
                    <it.icon className="size-4" />
                    {it.label}
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                      Soon
                    </span>
                  </button>
                )}
              </li>
            );
          })}
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
