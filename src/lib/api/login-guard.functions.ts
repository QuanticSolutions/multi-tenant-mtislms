import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_FAILS = 5;
const WINDOW_MIN = 15;

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(255) });

async function waitSeconds(email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("login_attempts" as any)
    .select("success, attempted_at")
    .eq("email", email)
    .gte("attempted_at", since)
    .order("attempted_at", { ascending: false })
    .limit(20);
  const rows = (data ?? []) as unknown as { success: boolean; attempted_at: string }[];
  const fails: string[] = [];
  for (const r of rows) {
    if (r.success) break;
    fails.push(r.attempted_at);
  }
  if (fails.length < MAX_FAILS) return 0;
  const unlock = new Date(fails[0]).getTime() + WINDOW_MIN * 60_000;
  return Math.max(0, Math.ceil((unlock - Date.now()) / 1000));
}

export const checkLoginAllowed = createServerFn({ method: "POST" })
  .inputValidator((d) => emailSchema.parse(d))
  .handler(async ({ data }) => ({ wait: await waitSeconds(data.email) }));

export const recordLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator((d) => emailSchema.extend({ success: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("login_attempts" as any).insert({ email: data.email, success: data.success } as any);
    return { wait: data.success ? 0 : await waitSeconds(data.email) };
  });
