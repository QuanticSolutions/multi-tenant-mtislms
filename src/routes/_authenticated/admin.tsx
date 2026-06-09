import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/components/admin/app-shell";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const user = useSessionUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  if (rolesLoaded && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
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

  return <Outlet />;
}
