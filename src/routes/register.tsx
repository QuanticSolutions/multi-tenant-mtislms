import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Check, ArrowLeft, School, Globe } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { registerTenant, checkSubdomainAvailable } from "@/lib/api/tenant.functions";
import { slugifySubdomain, validateSubdomainFormat, ROOT_DOMAIN } from "@/lib/tenant";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Register your school" },
      { name: "description", content: "Create your school's portal in minutes." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const doRegister = useServerFn(registerTenant);
  const checkSub = useServerFn(checkSubdomainAvailable);

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      toast.error("Fill in all fields — password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw error;
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  async function checkSubdomain(value: string) {
    const err = validateSubdomainFormat(value);
    if (err) {
      setSubdomainStatus("invalid");
      return;
    }
    setSubdomainStatus("checking");
    try {
      const { available } = await checkSub({ data: { subdomain: value } });
      setSubdomainStatus(available ? "ok" : "taken");
    } catch {
      setSubdomainStatus("idle");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolName.trim()) {
      toast.error("Enter your school name");
      return;
    }
    const subErr = validateSubdomainFormat(subdomain);
    if (subErr) {
      toast.error(subErr);
      return;
    }
    if (subdomainStatus === "taken") {
      toast.error("That web address is already taken");
      return;
    }
    setLoading(true);
    try {
      await doRegister({
        data: {
          subdomain: subdomain.toLowerCase(),
          school_name: schoolName.trim(),
          full_name: fullName.trim(),
        },
      });
      toast.success("School registered! Redirecting to your portal…");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register your school");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to home
        </Link>

        <div className="mb-8">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground">
            <School className="size-6" />
          </div>
          <p className="mtis-eyebrow">Get started</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
            {step === 1 ? "Create your account" : "Set up your school"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 1
              ? "You'll become the administrator of your school's portal."
              : "Pick a web address and name — you can change everything later."}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your name
              </label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ayesha Khan" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Password
              </label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                School name
              </label>
              <Input
                value={schoolName}
                onChange={(e) => {
                  setSchoolName(e.target.value);
                  if (!subdomain || subdomain === slugifySubdomain(schoolName)) {
                    const slug = slugifySubdomain(e.target.value);
                    setSubdomain(slug);
                    if (slug.length >= 3) checkSubdomain(slug);
                  }
                }}
                placeholder="e.g. Madina Tul Ilm School"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Web address
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={subdomain}
                    onChange={(e) => {
                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setSubdomain(v);
                      setSubdomainStatus("idle");
                      if (v.length >= 3) {
                        const t = setTimeout(() => checkSubdomain(v), 500);
                        return () => clearTimeout(t);
                      }
                    }}
                    placeholder="your-school"
                    className="pr-9"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {subdomainStatus === "checking" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {subdomainStatus === "ok" && <Check className="size-4 text-success" />}
                    {subdomainStatus === "taken" && <span className="text-xs font-semibold text-destructive">Taken</span>}
                    {subdomainStatus === "invalid" && <span className="text-xs font-semibold text-destructive">Invalid</span>}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">.{ROOT_DOMAIN}</span>
              </div>
              {subdomainStatus === "ok" && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-success">
                  <Globe className="size-3" /> {subdomain}.{ROOT_DOMAIN} is available
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || subdomainStatus === "taken" || subdomainStatus === "invalid" || subdomainStatus === "checking" || !subdomain.trim()}
            >
              {loading ? <Loader2 className="animate-spin" /> : null}
              Create my school portal
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth" className="font-semibold text-primary hover:text-primary-light">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
