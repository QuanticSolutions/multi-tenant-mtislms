import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings, Save, Plus, Trash2, Shield, GraduationCap,
  ChevronRight, Building2, Wallet, Banknote, UserCog,
  Upload, Lock, RotateCcw, Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BRANDING_QUERY_KEY, brandSignedUrl, useBranding } from "@/hooks/use-branding";
import { usePermissions } from "@/hooks/use-permissions";
import {
  brandCssVars, brandObjectPath, colorsOf, formatBytes, initialsOf, isValidHex, validateBrandImage,
  BRAND_IMAGE_ACCEPT, BRANDING_BUCKET, DEFAULT_BRANDING, MAX_BRAND_IMAGE_BYTES,
  type Branding, type SocialLinks,
} from "@/lib/branding";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — School LMS" },
      { name: "description", content: "School profile, session, grading scales and role management." },
    ],
  }),
  component: SettingsPage,
});

type Settings = {
  id: string;
  school_name: string;
  tagline: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  current_session: string;
  session_start_date: string | null;
  session_end_date: string | null;
  timezone: string;
  currency: string;
};

type Band = { grade: string; min: number; max: number };
type Scale = { id: string; name: string; description: string | null; is_default: boolean; bands: Band[] };

type Role = "admin" | "teacher" | "student" | "parent" | "librarian" | "accountant";

type RoleRow = {
  id: string;
  user_id: string;
  role: Role;
  profile: { full_name: string | null; email: string | null } | null;
};

const ROLES: Role[] = ["admin", "teacher", "student", "parent", "librarian", "accountant"];

const TABS = ["profile", "session", "grading", "roles"] as const;
type Tab = (typeof TABS)[number];

const SETUP_LINKS = [
  {
    to: "/admin/setup/departments",
    icon: Building2,
    title: "Departments",
    description: "Teaching and non-teaching departments for employee records.",
  },
  {
    to: "/admin/setup/fees",
    icon: Wallet,
    title: "Fee groups & constituents",
    description: "Global fee heads and per-class group amounts.",
  },
  {
    to: "/admin/setup/payroll",
    icon: Banknote,
    title: "Payroll deductions",
    description: "Persistent deductions and stepped attendance rules.",
  },
  {
    to: "/admin/setup/roles",
    icon: UserCog,
    title: "Roles & permissions",
    description: "Module permission matrix and user role assignment.",
  },
] as const;

function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Configuration</p>
        <h1 className="mtis-section-title mt-1">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">School profile, academic session, grading scales and role assignments.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SETUP_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="mtis-card group p-4 transition-colors hover:border-primary">
            <div className="flex items-center gap-2">
              <l.icon className="size-4 text-primary" />
              <p className="font-display text-sm font-semibold">{l.title}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{l.description}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Configure <ChevronRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary-pale hover:text-primary"
              }`}>
              {t === "grading" ? "Grading scales" : t === "roles" ? "Roles & users" : t}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {tab === "profile" && <ProfileTab />}
          {tab === "session" && <SessionTab />}
          {tab === "grading" && <GradingTab />}
          {tab === "roles" && <RolesTab />}
        </div>
      </div>
    </AppShell>
  );
}

function useSettings() {
  return useQuery({
    queryKey: ["school_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });
}

/* ------------------------------------------------------------------ */
/* School profile                                                      */
/* ------------------------------------------------------------------ */

type SocialKey = keyof SocialLinks;

const SOCIAL_FIELDS: { key: SocialKey; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourschool" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourschool" },
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/yourschool" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourschool" },
];

type BrandImageKind = "logo" | "favicon";

type ProfileForm = {
  school_name: string;
  tagline: string;
  established_year: string;
  registration_number: string;
  phone: string;
  email: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  social: Record<SocialKey, string>;
};

/** Builds editable form state from the stored profile row. */
function toProfileForm(
  b: Branding | null,
  logoPath: string | null,
  faviconPath: string | null,
): ProfileForm {
  const social = (b?.social_links ?? {}) as SocialLinks;
  const colors = colorsOf(b);
  return {
    school_name: b?.school_name ?? "",
    tagline: b?.tagline ?? "",
    established_year: b?.established_year != null ? String(b.established_year) : "",
    registration_number: b?.registration_number ?? "",
    phone: b?.phone ?? "",
    email: b?.email ?? "",
    website: b?.website ?? "",
    // Older rows kept a single freeform `address`; show it as line 1.
    address_line1: b?.address_line1 ?? b?.address ?? "",
    address_line2: b?.address_line2 ?? "",
    city: b?.city ?? "",
    state_province: b?.state_province ?? "",
    postal_code: b?.postal_code ?? "",
    country: b?.country ?? "",
    logo_url: logoPath ?? "",
    favicon_url: faviconPath ?? "",
    primary_color: colors.primary,
    secondary_color: colors.secondary,
    accent_color: colors.accent,
    social: {
      facebook: social.facebook ?? "",
      instagram: social.instagram ?? "",
      twitter: social.twitter ?? "",
      linkedin: social.linkedin ?? "",
    },
  };
}

/** Returns the first problem with the form, or null when it's ready to save. */
function profileProblem(f: ProfileForm) {
  if (!f.school_name.trim()) {
    return "Add a school name — it appears across the app and on printed documents.";
  }
  if (!f.phone.trim()) return "Add a phone number — it appears on documents and public forms.";
  if (!f.email.trim()) return "Add an email address — it appears on documents and public forms.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) {
    return "Check the email address.";
  }
  if (f.established_year.trim()) {
    const year = Number(f.established_year);
    const thisYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1800 || year > thisYear) {
      return `Year established must be a year between 1800 and ${thisYear}.`;
    }
  }
  const colors: [string, string][] = [
    ["Primary", f.primary_color],
    ["Secondary", f.secondary_color],
    ["Accent", f.accent_color],
  ];
  for (const [label, value] of colors) {
    if (value.trim() && !isValidHex(value)) return `${label} color needs a hex value like #2952C4.`;
  }
  return null;
}

/** Trims to a value or null, so empty inputs clear the column. */
const orNull = (v: string) => (v.trim() ? v.trim() : null);

function withScheme(url: string) {
  const v = url.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function ProfileTab() {
  const qc = useQueryClient();
  const { can, loaded: permsLoaded } = usePermissions();
  const canEdit = can("settings", "update");

  const { branding, loading, logoUrl, faviconUrl, logoPath, faviconPath } = useBranding();

  const initial = useMemo(
    () => toProfileForm(branding, logoPath, faviconPath),
    [branding, logoPath, faviconPath],
  );
  const [form, setForm] = useState<ProfileForm>(initial);
  const [hydrated, setHydrated] = useState(false);

  // Signed preview links, replaced locally as soon as an upload lands.
  const [preview, setPreview] = useState<Record<BrandImageKind, string | null>>({
    logo: null,
    favicon: null,
  });

  useEffect(() => {
    if (loading || hydrated) return;
    setForm(initial);
    setHydrated(true);
  }, [loading, hydrated, initial]);

  useEffect(() => {
    // Base the form's preview on the *stored* path, not the resolved URL —
    // useBranding() falls back to the default /logo.png when nothing is
    // uploaded, but the form should show an empty state (not the default
    // logo with a misleading "Remove" affordance) until the admin uploads one.
    setPreview({
      logo: logoPath ? logoUrl : null,
      favicon: faviconPath ? faviconUrl : null,
    });
  }, [logoPath, logoUrl, faviconPath, faviconUrl]);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setSocial = (key: SocialKey, value: string) =>
    setForm((f) => ({ ...f, social: { ...f.social, [key]: value } }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const upload = useMutation({
    mutationFn: async ({ kind, file }: { kind: BrandImageKind; file: File }) => {
      const problem = validateBrandImage(file);
      if (problem) throw new Error(problem);
      const path = brandObjectPath(kind, file);
      const { error } = await supabase.storage.from(BRANDING_BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      // The bucket is private, so read the new object back as a signed link.
      const link = await brandSignedUrl(path);
      return { kind, path, link };
    },
    onSuccess: ({ kind, path, link }) => {
      set(kind === "logo" ? "logo_url" : "favicon_url", path);
      setPreview((p) => ({ ...p, [kind]: link }));
      toast.success(`${kind === "logo" ? "Logo" : "Favicon"} uploaded — save to apply it`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!branding) throw new Error("The school profile is still loading.");
      const problem = profileProblem(form);
      if (problem) throw new Error(problem);

      const line1 = orNull(form.address_line1);
      const line2 = orNull(form.address_line2);

      const { error } = await supabase
        .from("school_settings")
        .update({
          school_name: form.school_name.trim(),
          tagline: orNull(form.tagline),
          established_year: form.established_year.trim() ? Number(form.established_year) : null,
          registration_number: orNull(form.registration_number),

          phone: orNull(form.phone),
          email: orNull(form.email),
          website: withScheme(form.website),
          address_line1: line1,
          address_line2: line2,
          city: orNull(form.city),
          state_province: orNull(form.state_province),
          postal_code: orNull(form.postal_code),
          country: orNull(form.country),
          // Keep the legacy single-line column in step for older readers.
          address: [line1, line2].filter(Boolean).join(", ") || null,

          logo_url: orNull(form.logo_url),
          favicon_url: orNull(form.favicon_url),
          primary_color: form.primary_color.trim() || DEFAULT_BRANDING.primary_color,
          secondary_color: form.secondary_color.trim() || DEFAULT_BRANDING.secondary_color,
          accent_color: orNull(form.accent_color),
          social_links: Object.fromEntries(
            SOCIAL_FIELDS.map(({ key }) => [key, withScheme(form.social[key] ?? "")]).filter(
              ([, v]) => v !== null,
            ),
          ),
        })
        .eq("id", branding.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("School profile saved");
      qc.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["school_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewColors = colorsOf({
    primary_color: form.primary_color,
    secondary_color: form.secondary_color,
    accent_color: form.accent_color,
  });

  if (loading && !hydrated) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">Loading school profile…</p>
    );
  }

  return (
    <div className="space-y-4">
      {permsLoaded && !canEdit && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            You can view the school profile but not change it. Ask an administrator for update
            access to the settings module.
          </p>
        </div>
      )}

      <fieldset disabled={!canEdit} className="space-y-4">
        <Section
          title="Basic information"
          description="Identity shown in the sidebar, on printed documents and in exports."
        >
          <Field label="School name *" className="md:col-span-2">
            <Input
              value={form.school_name}
              onChange={(e) => set("school_name", e.target.value)}
              placeholder="Springfield Model School"
            />
          </Field>
          <Field
            label="Tagline"
            hint="A short line under the school name."
            className="md:col-span-2"
          >
            <Input
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Learning with purpose"
            />
          </Field>
          <Field label="Year established">
            <Input
              type="number"
              inputMode="numeric"
              value={form.established_year}
              onChange={(e) => set("established_year", e.target.value)}
              placeholder="1998"
            />
          </Field>
          <Field label="Registration number" hint="Board or government registration.">
            <Input
              value={form.registration_number}
              onChange={(e) => set("registration_number", e.target.value)}
            />
          </Field>
        </Section>

        <Section
          title="Contact & address"
          description="Used on fee challans, reports and the public admission form."
        >
          <Field label="Phone *">
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+92 21 1234567"
            />
          </Field>
          <Field label="Email *">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="office@school.edu"
            />
          </Field>
          <Field label="Website" className="md:col-span-2">
            <Input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="school.edu"
            />
          </Field>

          <Field label="Address line 1" className="md:col-span-2">
            <Input
              value={form.address_line1}
              onChange={(e) => set("address_line1", e.target.value)}
            />
          </Field>
          <Field label="Address line 2" className="md:col-span-2">
            <Input
              value={form.address_line2}
              onChange={(e) => set("address_line2", e.target.value)}
            />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="State / province">
            <Input
              value={form.state_province}
              onChange={(e) => set("state_province", e.target.value)}
            />
          </Field>
          <Field label="Postal code">
            <Input value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
          </Field>

          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
              <Field key={key} label={label}>
                <Input
                  value={form.social[key] ?? ""}
                  onChange={(e) => setSocial(key, e.target.value)}
                  placeholder={placeholder}
                />
              </Field>
            ))}
          </div>
        </Section>

        <Section
          title="Branding"
          description={`Logo, favicon and theme colors. Images stay private — up to ${formatBytes(MAX_BRAND_IMAGE_BYTES)}, PNG, JPEG, WebP, SVG or ICO.`}
        >
          <BrandImageField
            kind="logo"
            label="Logo"
            hint="Shown in the sidebar, headers and on printed documents."
            url={preview.logo}
            fallback={initialsOf(form.school_name || DEFAULT_BRANDING.school_name)}
            busy={upload.isPending && upload.variables?.kind === "logo"}
            onPick={(file) => upload.mutate({ kind: "logo", file })}
            onClear={() => {
              set("logo_url", "");
              setPreview((p) => ({ ...p, logo: null }));
            }}
          />
          <BrandImageField
            kind="favicon"
            label="Favicon"
            hint="Browser tab icon. Falls back to the logo when empty."
            url={preview.favicon}
            fallback="ICO"
            busy={upload.isPending && upload.variables?.kind === "favicon"}
            onPick={(file) => upload.mutate({ kind: "favicon", file })}
            onClear={() => {
              set("favicon_url", "");
              setPreview((p) => ({ ...p, favicon: null }));
            }}
          />

          <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
            <ColorField
              label="Primary"
              value={form.primary_color}
              onChange={(v) => set("primary_color", v)}
            />
            <ColorField
              label="Secondary"
              value={form.secondary_color}
              onChange={(v) => set("secondary_color", v)}
            />
            <ColorField
              label="Accent"
              value={form.accent_color}
              onChange={(v) => set("accent_color", v)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Preview</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  set("primary_color", DEFAULT_BRANDING.primary_color);
                  set("secondary_color", DEFAULT_BRANDING.secondary_color);
                  set("accent_color", DEFAULT_BRANDING.accent_color);
                }}
              >
                <RotateCcw className="mr-1.5 size-3.5" /> Reset colors
              </Button>
            </div>
            <div
              style={brandCssVars(previewColors) as React.CSSProperties}
              className="mt-2 flex flex-wrap items-center gap-3 rounded-md border border-border bg-background p-3"
            >
              {preview.logo ? (
                <img src={preview.logo} alt="" className="size-9 rounded-md object-contain" />
              ) : (
                <div className="grid size-9 place-items-center rounded-md bg-primary font-display font-bold text-primary-foreground">
                  {initialsOf(form.school_name || DEFAULT_BRANDING.school_name)}
                </div>
              )}
              <div className="min-w-0 leading-tight">
                <p className="truncate font-display text-base font-bold text-primary">
                  {form.school_name || DEFAULT_BRANDING.school_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {form.tagline || DEFAULT_BRANDING.tagline}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                  Primary
                </span>
                <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                  Secondary
                </span>
                <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                  Accent
                </span>
              </div>
            </div>
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty && <p className="mr-auto text-xs text-muted-foreground">Unsaved changes</p>}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm(initial);
              setPreview({ logo: logoPath ? logoUrl : null, favicon: faviconPath ? faviconUrl : null });
            }}
            disabled={!dirty || save.isPending}
          >
            Discard changes
          </Button>
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending || upload.isPending}
          >
            {save.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save profile
          </Button>
        </div>
      </fieldset>
    </div>
  );
}

function BrandImageField({
  kind,
  label,
  hint,
  url,
  fallback,
  busy,
  onPick,
  onClear,
}: {
  kind: BrandImageKind;
  label: string;
  hint: string;
  url: string | null;
  fallback: string;
  busy: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
        {url ? (
          <img
            src={url}
            alt={`${label} preview`}
            className="size-14 shrink-0 rounded-md object-contain"
          />
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-md border border-dashed border-border text-[11px] font-semibold text-muted-foreground">
            {fallback}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{hint}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-3.5" />
              )}
              {url ? "Replace" : "Upload"}
            </Button>
            {url && (
              <Button type="button" size="sm" variant="ghost" onClick={onClear} disabled={busy}>
                <Trash2 className="mr-1.5 size-3.5 text-destructive" /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={BRAND_IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same file twice still fires a change.
          e.target.value = "";
          if (file) onPick(file);
        }}
        aria-label={`Upload ${kind}`}
      />
    </div>
  );
}

function ColorField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = !value.trim() || isValidHex(value);
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid && value.trim() ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2952C4"
          spellCheck={false}
          aria-label={`${label} hex value`}
          aria-invalid={!valid}
          className={valid ? "font-mono" : "border-destructive font-mono"}
        />
      </div>
    </Field>
  );
}

function Section({
  title, description, children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mtis-card p-4">
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function SessionTab() {
  const qc = useQueryClient();
  const { data } = useSettings();
  const [form, setForm] = useState<Partial<Settings>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const { error } = await supabase.from("school_settings").update({
        current_session: form.current_session, session_start_date: form.session_start_date || null,
        session_end_date: form.session_end_date || null, timezone: form.timezone, currency: form.currency,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session saved"); qc.invalidateQueries({ queryKey: ["school_settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Current session"><Input value={form.current_session ?? ""} onChange={(e) => setForm({ ...form, current_session: e.target.value })} placeholder="2025-26" /></Field>
      <Field label="Timezone"><Input value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></Field>
      <Field label="Session start"><Input type="date" value={form.session_start_date ?? ""} onChange={(e) => setForm({ ...form, session_start_date: e.target.value })} /></Field>
      <Field label="Session end"><Input type="date" value={form.session_end_date ?? ""} onChange={(e) => setForm({ ...form, session_end_date: e.target.value })} /></Field>
      <Field label="Currency"><Input value={form.currency ?? ""} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="PKR" /></Field>
      <div className="md:col-span-2 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 size-4" /> Save session</Button>
      </div>
    </div>
  );
}

function GradingTab() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Scale | null>(null);

  const q = useQuery({
    queryKey: ["grading_scales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grading_scales").select("*").order("created_at");
      if (error) throw error;
      return (data as unknown) as Scale[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grading_scales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Scale removed"); qc.invalidateQueries({ queryKey: ["grading_scales"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("grading_scales").update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("grading_scales").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Default scale updated"); qc.invalidateQueries({ queryKey: ["grading_scales"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const scales = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 size-4" /> New scale</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {scales.map((s) => (
          <div key={s.id} className="mtis-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-4 text-primary" />
                  <p className="font-medium text-foreground">{s.name}</p>
                  {s.is_default && <Badge variant="outline" className="bg-primary-pale text-primary">Default</Badge>}
                </div>
                {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Edit</Button>
                {!s.is_default && <Button size="sm" variant="ghost" onClick={() => setDefault.mutate(s.id)}>Set default</Button>}
                <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${s.name}?`)) del.mutate(s.id); }}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              {(s.bands ?? []).map((b, i) => (
                <div key={i} className="rounded border border-border bg-background px-2 py-1.5">
                  <div className="font-mono font-semibold text-foreground">{b.grade}</div>
                  <div className="text-xs text-muted-foreground">{b.min}–{b.max}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {scales.length === 0 && !q.isLoading && (
          <p className="text-sm text-muted-foreground">No scales configured.</p>
        )}
      </div>
      {(addOpen || editing) && (
        <ScaleDialog scale={editing} onClose={() => { setAddOpen(false); setEditing(null); }}
          onSaved={() => qc.invalidateQueries({ queryKey: ["grading_scales"] })} />
      )}
    </div>
  );
}

function ScaleDialog({ scale, onClose, onSaved }: { scale: Scale | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(scale?.name ?? "");
  const [description, setDescription] = useState(scale?.description ?? "");
  const [bands, setBands] = useState<Band[]>(
    scale?.bands ?? [{ grade: "A", min: 80, max: 100 }, { grade: "B", min: 60, max: 79 }, { grade: "F", min: 0, max: 59 }],
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const payload = { name: name.trim(), description: description || null, bands };
      if (scale) {
        const { error } = await supabase.from("grading_scales").update(payload).eq("id", scale.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grading_scales").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Scale saved"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{scale ? "Edit scale" : "New grading scale"}</DialogTitle>
          <DialogDescription>Define grade bands with min/max percentages.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name *"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div>
            <p className="mtis-eyebrow mb-2">Bands</p>
            <div className="space-y-2">
              {bands.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Grade" value={b.grade} onChange={(e) => {
                    const n = [...bands]; n[i] = { ...n[i], grade: e.target.value }; setBands(n);
                  }} className="w-20" />
                  <Input type="number" placeholder="Min" value={b.min} onChange={(e) => {
                    const n = [...bands]; n[i] = { ...n[i], min: Number(e.target.value) }; setBands(n);
                  }} className="w-24" />
                  <Input type="number" placeholder="Max" value={b.max} onChange={(e) => {
                    const n = [...bands]; n[i] = { ...n[i], max: Number(e.target.value) }; setBands(n);
                  }} className="w-24" />
                  <Button size="sm" variant="ghost" onClick={() => setBands(bands.filter((_, k) => k !== i))}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setBands([...bands, { grade: "", min: 0, max: 0 }])}>
                <Plus className="mr-1 size-4" /> Add band
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save scale</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesTab() {
  const qc = useQueryClient();
  const [assignOpen, setAssign] = useState(false);

  const q = useQuery({
    queryKey: ["user_roles_full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role").order("role");
      if (error) throw error;
      const rows = data as { id: string; user_id: string; role: Role }[];
      const ids = rows.map((r) => r.user_id);
      if (ids.length === 0) return [] as RoleRow[];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: map.get(r.user_id) ?? null })) as RoleRow[];
    },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries({ queryKey: ["user_roles_full"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAssign(true)}><Plus className="mr-2 size-4" /> Assign role</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                {q.isLoading ? "Loading…" : "No role assignments."}
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 text-foreground">{r.profile?.full_name ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.profile?.email ?? r.user_id}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="capitalize bg-primary-pale text-primary"><Shield className="mr-1 size-3" />{r.role}</Badge></td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Revoke ${r.role} from ${r.profile?.email}?`)) revoke.mutate(r.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {assignOpen && <AssignRoleDialog onClose={() => setAssign(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["user_roles_full"] })} />}
    </div>
  );
}

function AssignRoleDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("teacher");

  const profilesQ = useQuery({
    queryKey: ["profiles-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      if (error) throw error;
      return data as { id: string; full_name: string | null; email: string | null }[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Select a user");
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role assigned"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign role</DialogTitle>
          <DialogDescription>Grant a role to an existing user.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="User">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                {(profilesQ.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Role">
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, children, hint, className = "",
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
