import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Search,
  GraduationCap,
  Users,
  CalendarCheck,
  BookOpen,
  Wallet,
  FileText,
  ChevronDown,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "School LMS — Design System" },
      { name: "description", content: "School LMS design system preview." },
    ],
  }),
  component: StyleGuide,
});

function StyleGuide() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface shadow-card">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-6 px-7">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground font-display font-bold">
              M
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-bold tracking-tight text-primary">School LMS</div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Management Portal
              </div>
            </div>
          </div>

          <div className="ml-6 hidden flex-1 max-w-[420px] md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students, teachers, classes…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="hidden items-center gap-2 rounded-full border border-primary-light/40 bg-primary-pale px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-pale/70 sm:inline-flex">
              Session 2025–26
              <ChevronDown className="size-3.5" />
            </button>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" />
            </Button>
            <Link
              to="/auth"
              className="inline-flex h-9 items-center justify-center rounded-sm bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-light"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-7 py-10">
        {/* Hero */}
        <section className="mb-10">
          <p className="mtis-eyebrow">Design system · v0.1</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
            School LMS
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Foundational theme, tokens, and components for the Muhammad Tahir International School
            platform. Navy + crisp white surfaces, with a bold red accent reserved for action and
            urgency.
          </p>
        </section>

        {/* Color palette */}
        <Section title="Color palette" eyebrow="01 · Foundations">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Swatch name="Primary" hex="#1D3B8A" className="bg-primary text-primary-foreground" />
            <Swatch name="Primary light" hex="#2952C4" className="bg-primary-light text-primary-foreground" />
            <Swatch name="Primary pale" hex="#EEF2FF" className="bg-primary-pale text-primary" />
            <Swatch name="Accent" hex="#DC2626" className="bg-accent text-accent-foreground" />
            <Swatch name="Success" hex="#16A34A" className="bg-success text-success-foreground" />
            <Swatch name="Warning" hex="#D97706" className="bg-warning text-warning-foreground" />
            <Swatch name="Danger" hex="#DC2626" className="bg-danger text-danger-foreground" />
            <Swatch name="Info" hex="#0891B2" className="bg-info text-info-foreground" />
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography" eyebrow="02 · Foundations">
          <div className="mtis-card p-7">
            <p className="mtis-eyebrow">Display · Plus Jakarta Sans</p>
            <h2 className="mt-2 font-display text-3xl font-bold">Academics, refined.</h2>
            <h3 className="mt-2 font-display text-2xl font-semibold text-foreground">
              Section heading 28 / semibold
            </h3>
            <h4 className="mt-2 font-display text-lg font-semibold text-foreground">
              Card title 18 / semibold
            </h4>
            <div className="my-6 h-px bg-border" />
            <p className="mtis-eyebrow">Body · Inter</p>
            <p className="mt-2 max-w-2xl text-sm text-foreground">
              The quick brown fox jumps over the lazy dog. Body copy used for tables, forms, and
              long-form sections at 14px with comfortable line-height.
            </p>
            <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
              Helper / caption · 12px muted for inline hints, form helpers, and metadata.
            </p>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" eyebrow="03 · Components">
          <div className="mtis-card flex flex-wrap items-center gap-3 p-7">
            <Button>
              <Plus /> New Student
            </Button>
            <Button variant="outline">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="secondary">Filter</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" variant="outline" aria-label="More">
              <Plus />
            </Button>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Form fields" eyebrow="04 · Components">
          <div className="mtis-card grid gap-5 p-7 md:grid-cols-2">
            <Field label="Student name">
              <Input placeholder="e.g. Ayesha Khan" />
            </Field>
            <Field label="Roll number">
              <Input placeholder="MTIS-2025-0142" />
            </Field>
            <Field label="Email">
              <Input type="email" placeholder="guardian@example.com" />
            </Field>
            <Field label="Class" hint="Choose the current academic class.">
              <Input placeholder="Grade 8 — Section A" />
            </Field>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges & status pills" eyebrow="05 · Components">
          <div className="mtis-card flex flex-wrap items-center gap-3 p-7">
            <Badge variant="success">
              <CheckCircle2 className="mr-1 size-3" /> Present
            </Badge>
            <Badge variant="danger">
              <XCircle className="mr-1 size-3" /> Absent
            </Badge>
            <Badge variant="warning">
              <AlertTriangle className="mr-1 size-3" /> Pending
            </Badge>
            <Badge variant="info">
              <Info className="mr-1 size-3" /> Notice
            </Badge>
            <Badge variant="role">Student</Badge>
            <Badge variant="role">Teacher</Badge>
            <Badge variant="solid">Admin</Badge>
            <Badge variant="outline">Draft</Badge>
          </div>
        </Section>

        {/* Stat cards */}
        <Section title="Stat tiles" eyebrow="06 · Patterns">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={Users} label="Total Students" value="1,284" delta="+24 this week" tone="primary" />
            <StatTile icon={GraduationCap} label="Teachers" value="86" delta="3 on leave today" tone="info" />
            <StatTile icon={CalendarCheck} label="Attendance" value="96.4%" delta="vs 94.1% last week" tone="success" />
            <StatTile icon={Wallet} label="Fees Overdue" value="₨ 412,500" delta="18 invoices" tone="danger" />
          </div>
        </Section>

        {/* Table */}
        <Section title="Data table" eyebrow="07 · Patterns">
          <div className="mtis-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="mtis-section-title">Recent Admissions</h3>
                <p className="text-xs text-muted-foreground">Updated 2 minutes ago</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <FileText /> Export
                </Button>
                <Button size="sm">
                  <Plus /> Add Student
                </Button>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-background">
                  <Th>Student</Th>
                  <Th>Roll #</Th>
                  <Th>Class</Th>
                  <Th>Status</Th>
                  <Th>Fees</Th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr
                    key={r.roll}
                    className={`border-t border-border transition-colors hover:bg-primary-pale/60 ${
                      i === 1 ? "bg-primary-pale/70" : ""
                    }`}
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-pale text-xs font-semibold text-primary">
                          {r.initials}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.guardian}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs text-muted-foreground">{r.roll}</Td>
                    <Td>{r.cls}</Td>
                    <Td>
                      <Badge variant={r.statusVariant}>{r.status}</Badge>
                    </Td>
                    <Td>
                      <Badge variant={r.feeVariant}>{r.fee}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Empty state */}
        <Section title="Empty state" eyebrow="08 · Patterns">
          <div className="mtis-card grid place-items-center px-6 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-pale text-primary">
              <BookOpen className="size-6" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">No study materials yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Upload your first lesson plan, worksheet, or reading material for this class.
            </p>
            <Button className="mt-5">
              <Plus /> Upload material
            </Button>
          </div>
        </Section>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          School LMS · Design system preview
        </footer>
      </main>
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <p className="mtis-eyebrow">{eyebrow}</p>
      <h2 className="mb-5 mt-1 font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, hex, className }: { name: string; hex: string; className: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className={`flex h-20 items-end justify-between p-3 ${className}`}>
        <span className="font-display text-sm font-semibold">{name}</span>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span className="font-medium text-foreground">{name}</span>
        <span className="font-mono text-muted-foreground">{hex}</span>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  delta,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  tone: "primary" | "success" | "danger" | "info";
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary-pale text-primary",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  };
  return (
    <div className="mtis-card p-5">
      <div className="flex items-center justify-between">
        <span className="mtis-eyebrow">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-md ${toneMap[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{delta}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3.5 align-middle text-foreground ${className}`}>{children}</td>;
}

const ROWS: Array<{
  name: string;
  initials: string;
  guardian: string;
  roll: string;
  cls: string;
  status: string;
  statusVariant: "success" | "warning" | "danger";
  fee: string;
  feeVariant: "success" | "warning" | "danger";
}> = [
  {
    name: "Ayesha Khan",
    initials: "AK",
    guardian: "Guardian · Imran Khan",
    roll: "MTIS-2025-0142",
    cls: "Grade 8 — A",
    status: "Active",
    statusVariant: "success",
    fee: "Paid",
    feeVariant: "success",
  },
  {
    name: "Hassan Raza",
    initials: "HR",
    guardian: "Guardian · Faiza Raza",
    roll: "MTIS-2025-0143",
    cls: "Grade 6 — B",
    status: "Active",
    statusVariant: "success",
    fee: "Pending",
    feeVariant: "warning",
  },
  {
    name: "Maryam Tariq",
    initials: "MT",
    guardian: "Guardian · Tariq Mehmood",
    roll: "MTIS-2025-0144",
    cls: "Grade 10 — A",
    status: "Probation",
    statusVariant: "warning",
    fee: "Overdue",
    feeVariant: "danger",
  },
  {
    name: "Bilal Ahmed",
    initials: "BA",
    guardian: "Guardian · Saima Ahmed",
    roll: "MTIS-2025-0145",
    cls: "Grade 4 — C",
    status: "Suspended",
    statusVariant: "danger",
    fee: "Paid",
    feeVariant: "success",
  },
];
