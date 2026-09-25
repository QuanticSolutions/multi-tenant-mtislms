/**
 * Tenant (school) subdomain helpers.
 *
 * The subdomain is ONLY used for routing and pre-login branding. It is never a
 * trust boundary: data access is always scoped by the signed-in user's own
 * school through database row-level security.
 */

/** Root domain the SaaS runs on. Set VITE_ROOT_DOMAIN at build time. */
export const ROOT_DOMAIN: string =
  (import.meta.env["VITE_ROOT_DOMAIN"] as string | undefined)?.toLowerCase() || "ourapp.com";

export const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const RESERVED = new Set(["www", "app", "api", "admin", "default", "mail", "register", "static"]);

export function validateSubdomainFormat(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return "Choose a web address";
  if (v.length < 3) return "Use at least 3 characters";
  if (!SUBDOMAIN_RE.test(v)) return "Only lowercase letters, numbers and hyphens (not at the start or end)";
  if (RESERVED.has(v)) return "That address is reserved";
  return null;
}

export function slugifySubdomain(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * True when running on the real SaaS domain (so subdomain routing applies).
 * Preview, localhost and other hosts fall back to "?school=" for testing.
 */
export function isOnRootDomain(hostname: string) {
  const h = hostname.toLowerCase();
  return h === ROOT_DOMAIN || h.endsWith("." + ROOT_DOMAIN);
}

/** Returns the school subdomain for the current location, or null for the marketing root. */
export function getSubdomain(hostname: string, search = ""): string | null {
  const h = hostname.toLowerCase();
  if (isOnRootDomain(h)) {
    if (h === ROOT_DOMAIN) return null;
    const sub = h.slice(0, -(ROOT_DOMAIN.length + 1)).split(".")[0] ?? "";
    return sub && sub !== "www" ? sub : null;
  }
  // Non-production hosts: allow ?school=<sub> for previewing a tenant.
  const q = new URLSearchParams(search).get("school");
  if (q) {
    try { sessionStorage.setItem("tenant-preview", q.toLowerCase()); } catch { /* ignore */ }
    return q.toLowerCase();
  }
  try { return sessionStorage.getItem("tenant-preview"); } catch { return null; }
}

/** Absolute URL for a school's own subdomain (or a preview equivalent). */
export function tenantUrl(subdomain: string, path = "/") {
  if (typeof window !== "undefined" && !isOnRootDomain(window.location.hostname)) {
    const sep = path.includes("?") ? "&" : "?";
    return `${window.location.origin}${path}${sep}school=${encodeURIComponent(subdomain)}`;
  }
  return `https://${subdomain}.${ROOT_DOMAIN}${path}`;
}

export function rootUrl(path = "/") {
  if (typeof window !== "undefined" && !isOnRootDomain(window.location.hostname)) {
    try { sessionStorage.removeItem("tenant-preview"); } catch { /* ignore */ }
    return `${window.location.origin}${path}`;
  }
  return `https://${ROOT_DOMAIN}${path}`;
}

export const ONBOARDING_STEPS = [
  { key: "welcome", label: "Welcome tour" },
  { key: "branding", label: "School profile & branding" },
  { key: "import", label: "Import your data" },
  { key: "fees", label: "Fees & payroll setup" },
  { key: "team", label: "Invite your team" },
  { key: "done", label: "Finish" },
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];
