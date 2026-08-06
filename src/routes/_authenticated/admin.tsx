import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ShieldAlert, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

/** Routes a teacher may open; everything else is admin-only. */
const TEACHER_PATHS = [
  "/admin",
  "/admin/students",
  "/admin/classes",
  "/admin/subjects",
  "/admin/attendance",
  "/admin/timetable",
  "/admin/messaging",
];

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, isTeacher, isStudent, loaded } = useMyRoles();

  useEffect(() => {
    if (loaded && isStudent && !isAdmin && !isTeacher) {
      navigate({ to: "/portal", replace: true });
    }
  }, [loaded, isStudent, isAdmin, isTeacher, navigate]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!loaded) return null;

  const teacherAllowed = isTeacher && TEACHER_PATHS.includes(pathname.replace(/\/$/, ""));
  const allowed = isAdmin || teacherAllowed;

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-warning-soft text-warning">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">
            {isTeacher ? "Not available for teachers" : "Admin access required"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isTeacher
              ? "This section is limited to administrators. Use the sidebar to open your classes, students, attendance and timetable."
              : "Your account is signed in but doesn't yet have the admin role. Ask an existing admin to grant you access, or sign out and use an admin account."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {isTeacher && (
              <Button variant="outline" onClick={() => navigate({ to: "/admin" })}>
                Back to dashboard
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut /> Sign out
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return <Outlet />;
}

