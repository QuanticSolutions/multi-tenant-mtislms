import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GraduationCap,
  Users,
  CalendarCheck,
  Wallet,
  BookOpen,
  Bus,
  Package,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTenantSubdomain } from "@/hooks/use-tenant";
import { BrandLockup } from "@/hooks/use-branding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "School Management, Simplified" },
      { name: "description", content: "Run your school from one place — students, fees, attendance, payroll and more." },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  { icon: Users, title: "Student management", desc: "Admissions, profiles, class assignments and parent contacts." },
  { icon: CalendarCheck, title: "Attendance", desc: "Daily attendance for students and staff with automated reports." },
  { icon: Wallet, title: "Fees & finance", desc: "Invoices, payments, payroll, scholarships and donations." },
  { icon: BookOpen, title: "Library & inventory", desc: "Book issuing, stock tracking and requisitions." },
  { icon: GraduationCap, title: "Exams & grading", desc: "Schedule exams, record marks and generate report cards." },
  { icon: Bus, title: "Transport", desc: "Routes, drivers, vehicle tracking and fare management." },
  { icon: MessageSquare, title: "Communication", desc: "Announcements, events, messaging and notifications." },
  { icon: BarChart3, title: "Reports & analytics", desc: "Dashboards, audit logs and exportable reports." },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "for the first school",
    features: ["Up to 200 students", "All core modules", "Email support", "1 admin user"],
    cta: "Register your school",
    highlight: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "per month",
    features: ["Unlimited students", "All modules", "Priority support", "Unlimited users", "Custom branding"],
    cta: "Get started",
    highlight: true,
  },
];

function LandingPage() {
  const { isRoot, notFound, subdomain } = useTenantSubdomain();

  // On a school subdomain but school not found
  if (!isRoot && notFound) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">School not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No school is registered at <span className="font-semibold">{subdomain}</span>.
          </p>
          <Link to="/" className="mt-4 inline-block">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // On a school subdomain with a valid tenant — show a sign-in prompt
  if (!isRoot) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <BrandLockup className="mx-auto" size="md" />
          <h1 className="mt-6 font-display text-2xl font-bold">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to access your portal.</p>
          <Link to="/auth" className="mt-4 inline-block">
            <Button>Sign in <ArrowRight className="size-4" /></Button>
          </Link>
        </div>
      </div>
    );
  }

  // Root domain — marketing page
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </div>
            QS LMS
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link to="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" /> Trusted by schools worldwide
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Run your school from{" "}
          <span className="text-primary">one place</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Students, fees, attendance, exams, payroll, library, transport and more — all in a single,
          beautifully designed portal. Set up in minutes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/register">
            <Button size="lg">
              Register your school <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">No credit card required · Free for the first school</p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 text-center">
          <p className="mtis-eyebrow">Everything you need</p>
          <h2 className="mt-1 font-display text-3xl font-bold">A complete school management system</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="mtis-card p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-pale text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-3 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 text-center">
          <p className="mtis-eyebrow">Pricing</p>
          <h2 className="mt-1 font-display text-3xl font-bold">Simple, transparent pricing</h2>
        </div>
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`mtis-card p-6 ${plan.highlight ? "ring-2 ring-primary" : ""}`}
            >
              <h3 className="font-display text-lg font-bold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="mt-5 block">
                <Button className="w-full" variant={plan.highlight ? "default" : "outline"}>
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mtis-card bg-primary p-10 text-center text-primary-foreground">
          <h2 className="font-display text-3xl font-bold">Ready to get started?</h2>
          <p className="mt-2 text-primary-foreground/80">
            Set up your school's portal in under 5 minutes.
          </p>
          <Link to="/register" className="mt-6 inline-block">
            <Button size="lg" variant="secondary">
              Register your school <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        QS LMS · School Management, Simplified
      </footer>
    </div>
  );
}
