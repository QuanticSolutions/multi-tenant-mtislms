import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getSubdomain, isOnRootDomain, tenantUrl } from "@/lib/tenant";

export type PublicTenant = {
  id: string;
  subdomain: string;
  display_name: string;
  status: "trial" | "active" | "suspended";
  school_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
};

/** Reads the subdomain from the current host (client only). */
export function useSubdomain() {
  const [sub, setSub] = useState<{ ready: boolean; value: string | null }>({ ready: false, value: null });
  useEffect(() => {
    setSub({ ready: true, value: getSubdomain(window.location.hostname, window.location.search) });
  }, []);
  return sub;
}

export async function fetchPublicTenant(subdomain: string) {
  const { data, error } = await supabase.rpc("get_tenant_public" as never, { _subdomain: subdomain } as never);
  if (error) throw error;
  return (data as unknown as PublicTenant | null) ?? null;
}

/**
 * Resolves the school for the current subdomain (public info only — name,
 * logo, colours). Root domain => marketing mode (`isRoot`).
 */
export function useTenantSubdomain() {
  const { ready, value } = useSubdomain();
  const q = useQuery({
    queryKey: ["tenant-public", value],
    enabled: ready && !!value,
    staleTime: 5 * 60_000,
    queryFn: () => fetchPublicTenant(value!),
  });
  return {
    ready: ready && (!value || !q.isLoading),
    subdomain: value,
    isRoot: ready && !value,
    tenant: q.data ?? null,
    notFound: ready && !!value && !q.isLoading && !q.data,
  };
}

export type MyTenant = {
  id: string;
  subdomain: string;
  display_name: string;
  status: string;
  onboarding_completed_steps: string[];
  onboarding_dismissed: boolean;
};

export const MY_TENANT_KEY = ["my-tenant"] as const;

/** The signed-in user's own school (via row-level security). */
export function useMyTenant() {
  return useQuery({
    queryKey: MY_TENANT_KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants" as never)
        .select("id, subdomain, display_name, status, onboarding_completed_steps, onboarding_dismissed")
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MyTenant | null) ?? null;
    },
  });
}

export function useUpdateOnboarding() {
  const qc = useQueryClient();
  return async (step: string | null, dismiss = false) => {
    const { error } = await supabase.rpc("update_onboarding" as never, { _step: step, _dismiss: dismiss } as never);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: MY_TENANT_KEY });
  };
}

/**
 * After sign-in: if the user is on another school's subdomain, send them to
 * their own. Only applies on the production domain.
 */
export function useTenantHostGuard() {
  const { data } = useMyTenant();
  useEffect(() => {
    if (!data || typeof window === "undefined") return;
    const current = getSubdomain(window.location.hostname, window.location.search);
    if (!isOnRootDomain(window.location.hostname) && !current) return;
    if (data.subdomain === "default" && !isOnRootDomain(window.location.hostname)) return;
    if (current !== data.subdomain) {
      window.location.replace(tenantUrl(data.subdomain, window.location.pathname));
    }
  }, [data]);
}

/**
 * Public school for visitors (embeds, sign-in page): the school named in the
 * web address, or the built-in "default" school on the bare domain/preview.
 */
export function usePublicTenant() {
  const { ready, value } = useSubdomain();
  const sub = value || "default";
  const q = useQuery({
    queryKey: ["tenant-public", sub],
    enabled: ready,
    staleTime: 5 * 60_000,
    queryFn: () => fetchPublicTenant(sub),
  });
  return { ready: ready && !q.isLoading, tenant: q.data ?? null, tenantId: q.data?.id ?? null };
}
