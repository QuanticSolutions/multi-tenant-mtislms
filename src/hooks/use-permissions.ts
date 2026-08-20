import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/use-role";
import type { ModuleKey, PermissionAction } from "@/lib/modules";

type PermRow = {
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_update: boolean;
  can_delete: boolean;
};

/**
 * Permission checks for the signed-in user.
 * Users with the built-in `admin` role always have full access; everyone else
 * is governed by the role assigned on their profile (roles + role_permissions).
 */
export function usePermissions() {
  const { isAdmin, loaded: rolesLoaded } = useMyRoles();

  const { data, isLoading } = useQuery({
    queryKey: ["my-role-permissions"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as PermRow[];
      const { data: profile } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", u.user.id)
        .maybeSingle();
      const roleId = (profile as { role_id: string | null } | null)?.role_id;
      if (!roleId) return [] as PermRow[];
      const { data: perms, error } = await supabase
        .from("role_permissions")
        .select("module, can_read, can_write, can_update, can_delete")
        .eq("role_id", roleId);
      if (error) throw error;
      return (perms ?? []) as PermRow[];
    },
  });

  const rows = data ?? [];

  function can(module: ModuleKey | string, action: PermissionAction = "read") {
    if (isAdmin) return true;
    const row = rows.find((r) => r.module === module);
    if (!row) return false;
    if (action === "read") return row.can_read;
    if (action === "write") return row.can_write;
    if (action === "update") return row.can_update;
    return row.can_delete;
  }

  return {
    can,
    isAdmin,
    permissions: rows,
    loaded: rolesLoaded && data !== undefined,
    isLoading,
  };
}
