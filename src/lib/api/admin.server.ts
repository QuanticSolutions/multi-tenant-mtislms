// Server-only admin Supabase client with a friendly failure message.
// Falls back to the build-time public URL so only the service-role key has to
// be configured as a secret on self-hosted (Cloudflare) deployments.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const ADMIN_KEY_MISSING_MESSAGE =
  "Account management is unavailable on this deployment: the server key is not configured. Add a secret named SUPABASE_SERVICE_ROLE_KEY to your hosting environment and redeploy.";

function isNewSupabaseApiKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function getAdminClient() {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    import.meta.env.VITE_SUPABASE_URL;
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) throw new Error(ADMIN_KEY_MISSING_MESSAGE);

  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
