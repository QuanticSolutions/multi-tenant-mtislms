import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "teacher", "student", "parent", "librarian", "accountant"] as const;
type Role = (typeof ROLES)[number];

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

async function getTenantId(context: Ctx): Promise<string> {
  const { data, error } = await context.supabase.rpc("current_tenant_id" as never);
  if (error) throw new Error("Could not resolve your school");
  if (!data) throw new Error("Your account is not linked to a school");
  return data as string;
}

export type ManagedUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: Role[];
};

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const tenantId = await getTenantId(ctx);
    const { getAdminClient } = await import("@/lib/api/admin.server");
    const supabaseAdmin = getAdminClient();

    // Get all user_ids in this tenant from profiles
    const { data: profileRows, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, tenant_id")
      .eq("tenant_id", tenantId);
    if (profileError) throw new Error(profileError.message);

    const userIds = (profileRows ?? []).map((p: any) => p.id);
    if (userIds.length === 0) return [];

    // Fetch auth users in batches (admin API doesn't filter by ID)
    const authUsers: any[] = [];
    for (let i = 0; i < userIds.length; i += 200) {
      const batch = userIds.slice(i, i + 200);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (authError) throw new Error(authError.message);
      for (const u of authData.users ?? []) {
        if (batch.includes(u.id)) authUsers.push(u);
      }
    }

    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);
    if (roleError) throw new Error(roleError.message);

    const roleMap = new Map<string, Role[]>();
    for (const r of roleRows ?? []) {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role as Role);
      roleMap.set(r.user_id, list);
    }

    const profileMap = new Map<string, any>();
    for (const p of profileRows ?? []) profileMap.set(p.id, p);

    return authUsers.map((u) => ({
      id: u.id,
      email: u.email ?? profileMap.get(u.id)?.email ?? null,
      full_name: profileMap.get(u.id)?.full_name ?? (u.user_metadata?.full_name as string | undefined) ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: roleMap.get(u.id) ?? [],
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(72),
        full_name: z.string().trim().min(1).max(120),
        role: z.enum(ROLES),
        link_student_id: z.string().uuid().nullish(),
        link_teacher_id: z.string().uuid().nullish(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const tenantId = await getTenantId(ctx);
    const { getAdminClient } = await import("@/lib/api/admin.server");
    const supabaseAdmin = getAdminClient();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const userId = created.user!.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: data.full_name, email: data.email, tenant_id: tenantId });

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role, tenant_id: tenantId });
    if (roleError) throw new Error(roleError.message);

    if (data.role === "student" && data.link_student_id) {
      await supabaseAdmin
        .from("students")
        .update({ user_id: userId })
        .eq("id", data.link_student_id);
    }
    if (data.role === "teacher" && data.link_teacher_id) {
      await supabaseAdmin
        .from("teachers")
        .update({ user_id: userId })
        .eq("id", data.link_teacher_id);
    }

    return { id: userId };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(ROLES) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const tenantId = await getTenantId(ctx);
    const { getAdminClient } = await import("@/lib/api/admin.server");
    const supabaseAdmin = getAdminClient();

    // Verify target user is in same tenant
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.tenant_id !== tenantId) throw new Error("User not found in your school");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role, tenant_id: tenantId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        full_name: z.string().trim().min(1).max(120),
        role: z.enum(ROLES),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const tenantId = await getTenantId(ctx);
    const { getAdminClient } = await import("@/lib/api/admin.server");
    const supabaseAdmin = getAdminClient();

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { data: { full_name: data.full_name } },
    );
    if (error) throw new Error(error.message);
    const userId = invited.user!.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: data.full_name, email: data.email, tenant_id: tenantId });

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role, tenant_id: tenantId });
    if (roleError) throw new Error(roleError.message);

    return { id: userId };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const tenantId = await getTenantId(ctx);
    if (ctx.userId === data.user_id) throw new Error("You cannot delete your own account");

    const { getAdminClient } = await import("@/lib/api/admin.server");
    const supabaseAdmin = getAdminClient();

    // Verify target user is in same tenant
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.tenant_id !== tenantId) throw new Error("User not found in your school");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
