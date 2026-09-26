import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { useSubdomain } from "@/hooks/use-tenant";
import {
  applyBrandColors,
  BRAND_SIGNED_URL_TTL_SECONDS,
  BRANDING_BUCKET,
  colorsOf,
  DEFAULT_BRANDING,
  initialsOf,
  isStoragePath,
  type Branding,
} from "@/lib/branding";

export const BRANDING_QUERY_KEY = ["branding"] as const;
export const BRANDING_LINKS_QUERY_KEY = ["branding", "signed-links"] as const;

/** Signs a single branding object path. Returns null if it can't be signed. */
export async function brandSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .createSignedUrl(path, BRAND_SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Signs several paths at once, skipping any the storage API rejects. */
async function signBrandImages(paths: string[]) {
  const links: Record<string, string> = {};
  if (paths.length === 0) return links;
  const { data, error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .createSignedUrls(paths, BRAND_SIGNED_URL_TTL_SECONDS);
  if (error || !data) return links;
  for (const row of data) {
    if (row.path && row.signedUrl && !row.error) links[row.path] = row.signedUrl;
  }
  return links;
}

/**
 * Reads the single school profile row. Readable by anyone (including visitors
 * on the login page and embedded forms), so branding is always available.
 *
 * `logo_url` / `favicon_url` hold object paths in the private `branding`
 * bucket, so they're exchanged for signed links before being handed to
 * consumers. The raw paths stay available as `logoPath` / `faviconPath` for
 * the settings form. Absolute URLs saved by older rows pass through untouched.
 */
export function useBranding() {
  const { ready, value: subdomain } = useSubdomain();
  const { data, isLoading } = useQuery({
    queryKey: [...BRANDING_QUERY_KEY, subdomain],
    staleTime: 60_000,
    enabled: ready,
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Visitors: the school named in the web address, else built-in defaults.
        if (!subdomain) return null;
        const { data: t } = await supabase.rpc("get_tenant_public" as never, { _subdomain: subdomain } as never);
        const tenantId = (t as { id?: string } | null)?.id;
        if (!tenantId) return null;
        const { data, error } = await supabase
          .from("school_settings")
          .select("*")
          .eq("tenant_id" as never, tenantId as never)
          .maybeSingle();
        if (error) return null;
        return (data as unknown as Branding | null) ?? null;
      }
      // Signed in: row-level security returns only the user's own school.
      const { data, error } = await supabase
        .from("school_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Branding | null) ?? null;
    },
  });

  const logoPath = data?.logo_url || null;
  const faviconPath = data?.favicon_url || null;

  const pathsToSign = useMemo(
    () => [logoPath, faviconPath].filter((p): p is string => isStoragePath(p)),
    [logoPath, faviconPath],
  );

  const { data: links } = useQuery({
    queryKey: [...BRANDING_LINKS_QUERY_KEY, ...pathsToSign],
    enabled: pathsToSign.length > 0,
    // Refresh well inside the signed-link lifetime.
    staleTime: (BRAND_SIGNED_URL_TTL_SECONDS / 2) * 1000,
    queryFn: () => signBrandImages(pathsToSign),
  });

  const resolve = (value: string | null) => {
    if (!value) return null;
    if (!isStoragePath(value)) return value;
    return links?.[value] ?? null;
  };

  const logoUrl = resolve(logoPath) ?? DEFAULT_BRANDING.logo_url;
  const faviconUrl = resolve(faviconPath) ?? logoUrl;

  const schoolName = data?.school_name?.trim() || DEFAULT_BRANDING.school_name;
  const tagline = data?.tagline?.trim() || DEFAULT_BRANDING.tagline;

  // Hand consumers (headers, printed documents, spreadsheets) a row whose
  // image fields are already usable as `src` values.
  const branding = useMemo(
    () => (data ? { ...data, logo_url: logoUrl, favicon_url: faviconUrl } : null),
    [data, logoUrl, faviconUrl],
  );

  return {
    branding,
    loading: isLoading,
    schoolName,
    tagline,
    logoUrl,
    faviconUrl,
    /** Raw stored values — object paths, not links. */
    logoPath,
    faviconPath,
    colors: colorsOf(data),
    initials: initialsOf(schoolName),
  };
}

/**
 * Applies branding globally: theme CSS variables, browser tab title and
 * favicon. Mounted once at the router root so a save takes effect everywhere
 * immediately.
 */
export function BrandingEffects() {
  const { schoolName, faviconUrl, colors } = useBranding();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    applyBrandColors(colors);
  }, [colors.primary, colors.secondary, colors.accent]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const current = document.title;
    const base = current.split(" — ")[0]?.trim();
    document.title = base && base !== schoolName ? `${base} — ${schoolName}` : schoolName;
  }, [schoolName, pathname]);

  useEffect(() => {
    if (typeof document === "undefined" || !faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);

  return null;
}

/** Small logo + name lockup used in headers across admin, portal and embeds. */
export function BrandLockup({
  subtitle,
  className = "",
  size = "md",
  invert = false,
}: {
  subtitle?: string;
  className?: string;
  size?: "sm" | "md";
  invert?: boolean;
}) {
  const { schoolName, logoUrl, initials } = useBranding();
  const box = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${schoolName} logo`}
          className={`${box} shrink-0 rounded-md object-contain`}
        />
      ) : (
        <div
          className={`grid ${box} shrink-0 place-items-center rounded-md font-display font-bold ${
            invert ? "bg-primary-foreground/15 backdrop-blur" : "bg-primary text-primary-foreground"
          }`}
        >
          {initials}
        </div>
      )}
      <div className="min-w-0 leading-tight">
        <div
          className={`truncate font-display text-lg font-bold tracking-tight ${
            invert ? "" : "text-primary"
          }`}
        >
          {schoolName}
        </div>
        {subtitle && (
          <div
            className={`truncate text-[11px] font-medium uppercase tracking-wider ${
              invert ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
