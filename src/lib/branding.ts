/**
 * Branding — every school-identity value the app shows comes from the single
 * `school_settings` row. The constants below are the product's neutral
 * defaults, used only until an admin saves their own profile (and restored by
 * "Reset to default"). No school name, logo or colour is hardcoded elsewhere.
 */

export type SocialLinks = {
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
};

export type Branding = {
  id: string;
  school_name: string;
  tagline: string | null;
  address: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  established_year: number | null;
  registration_number: string | null;
  social_links: SocialLinks | null;
  current_session: string;
  currency: string;
};

export const DEFAULT_BRANDING = {
  school_name: "School LMS",
  tagline: "Learning Management System",
  primary_color: "#2952C4",
  secondary_color: "#1D3B8A",
  accent_color: "#DC2626",
} as const;

export const BRANDING_BUCKET = "branding";
export const MAX_BRAND_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_BRAND_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

export function isValidHex(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function expand(hex: string) {
  const h = hex.trim().replace("#", "");
  return h.length === 3
    ? h
        .split("")
        .map((c) => c + c)
        .join("")
    : h;
}

function toRgb(hex: string) {
  const h = expand(hex);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ] as [number, number, number];
}

/** Mix `hex` toward white (amount 0–1). */
export function tint(hex: string, amount: number) {
  const [r, g, b] = toRgb(hex);
  const m = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Mix `hex` toward black (amount 0–1). */
export function shade(hex: string, amount: number) {
  const [r, g, b] = toRgb(hex);
  const m = (c: number) => Math.round(c * (1 - amount));
  return `#${[m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Readable foreground (white / near-black) for a background colour. */
export function readableOn(hex: string) {
  const [r, g, b] = toRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0F172A" : "#FFFFFF";
}

export type BrandColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export function colorsOf(b: Partial<Branding> | null | undefined): BrandColors {
  const primary = b?.primary_color && isValidHex(b.primary_color) ? b.primary_color : DEFAULT_BRANDING.primary_color;
  const secondary =
    b?.secondary_color && isValidHex(b.secondary_color) ? b.secondary_color : DEFAULT_BRANDING.secondary_color;
  const accent = b?.accent_color && isValidHex(b.accent_color) ? b.accent_color : DEFAULT_BRANDING.accent_color;
  return { primary, secondary, accent };
}

/** CSS custom properties derived from the three brand colours. */
export function brandCssVars(colors: BrandColors): Record<string, string> {
  const { primary, secondary, accent } = colors;
  return {
    "--brand-primary": primary,
    "--brand-secondary": secondary,
    "--brand-accent": accent,
    "--primary": primary,
    "--primary-foreground": readableOn(primary),
    "--primary-light": tint(primary, 0.2),
    "--primary-pale": tint(primary, 0.92),
    "--ring": primary,
    "--secondary": tint(secondary, 0.92),
    "--secondary-foreground": secondary,
    "--accent": accent,
    "--accent-foreground": readableOn(accent),
    "--accent-soft": tint(accent, 0.88),
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": readableOn(primary),
    "--sidebar-accent": tint(primary, 0.92),
    "--sidebar-accent-foreground": shade(primary, 0.25),
    "--sidebar-ring": primary,
    "--chart-1": primary,
    "--chart-4": accent,
  };
}

export function applyBrandColors(colors: BrandColors, target?: HTMLElement) {
  const el = target ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!el) return;
  const vars = brandCssVars(colors);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}

/** Full postal address as a single line, for document headers. */
export function addressLine(b: Partial<Branding> | null | undefined) {
  const parts = [
    b?.address_line1 || b?.address || null,
    b?.address_line2 || null,
    b?.city || null,
    b?.state_province || null,
    b?.postal_code || null,
    b?.country || null,
  ].filter(Boolean);
  return parts.join(", ");
}

/** Contact strip (phone · email · website) for document headers. */
export function contactLine(b: Partial<Branding> | null | undefined) {
  return [b?.phone, b?.email, b?.website].filter(Boolean).join(" · ");
}

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S"
  );
}
