import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "teacher"
  | "student"
  | "parent"
  | "librarian"
  | "accountant";

export function useMyRoles() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-roles-self"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as AppRole[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = data ?? [];
  return {
    roles,
    loaded: data !== undefined,
    isLoading,
    isAdmin: roles.includes("admin"),
    isTeacher: roles.includes("teacher"),
    isStudent: roles.includes("student"),
  };
}
