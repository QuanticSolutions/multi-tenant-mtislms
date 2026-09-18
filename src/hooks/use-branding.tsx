import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import {
  applyBrandColors,
  colorsOf,
  DEFAULT_BRANDING,
  initialsOf,
  type Branding,
} from "@/lib/branding";

export const BRANDING_QUERY_KEY = ["branding"] as const;

/**
 * Reads the single school profile row. Readable by anyone (including visitors
 * on the login page and embedded forms), so branding is always available.
 */
export function useBranding() {
  const { data, isLoading } = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Branding | null) ?? null;
    },
  });

  const schoolName = data?.school_name?.trim() || DEFAULT_BRANDING.school_name;
  const tagline = data?.tagline?.trim() || DEFAULT_BRANDING.tagline;

  return {
    branding: data ?? null,
    loading: isLoading,
    schoolName,
    tagline,
    logoUrl: data?.logo_url || null,
    faviconUrl: data?.favicon_url || data?.logo_url || null,
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
