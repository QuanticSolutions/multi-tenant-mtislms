import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

export const checkSubdomainAvailable = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ subdomain: z.string().min(3).max(63) }).parse(data))
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/lib/api/admin.server");
    const admin = getAdminClient();
    const { data: existing } = await admin
      .from("tenants")
      .select("id")
      .eq("subdomain", data.subdomain.toLowerCase())
      .maybeSingle();
    return { available: !existing };
  });

export const registerTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        subdomain: z
          .string()
          .min(3)
          .max(63)
          .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/, "Invalid subdomain format"),
        school_name: z.string().trim().min(2).max(120),
        full_name: z.string().trim().min(2).max(120),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const { getAdminClient } = await import("@/lib/api/admin.server");
    const admin = getAdminClient();

    // Check subdomain not taken
    const { data: existing } = await admin
      .from("tenants")
      .select("id")
      .eq("subdomain", data.subdomain.toLowerCase())
      .maybeSingle();
    if (existing) throw new Error("That web address is already taken");

    // Update profile name
    await admin
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", ctx.userId);

    // Create tenant + link user via RPC
    const { data: tenantId, error: rpcError } = await ctx.supabase.rpc("register_tenant", {
      _subdomain: data.subdomain.toLowerCase(),
      _display_name: data.school_name.trim(),
      _school_name: data.school_name.trim(),
    });
    if (rpcError || !tenantId) {
      throw new Error(rpcError?.message ?? "Could not create your school");
    }

    return { tenantId: tenantId as string, subdomain: data.subdomain.toLowerCase() };
  });
