import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useServerFn } from "@tanstack/react-start";
import { checkLoginAllowed, recordLoginAttempt } from "@/lib/api/login-guard.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useBranding } from "@/hooks/use-branding";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in" },
      { name: "description", content: "Sign in to the your school." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { schoolName, tagline, logoUrl, initials } = useBranding();
  const [mfaFactor, setMfaFactor] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const checkAllowed = useServerFn(checkLoginAllowed);
  const recordAttempt = useServerFn(recordLoginAttempt);

  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [waitUntil]);
  const waitLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  // Returns true when a second factor is still required.
  async function needsMfa() {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      const { data: f } = await supabase.auth.mfa.listFactors();
      const factor = f?.totp?.find((x) => x.status === "verified");
      if (factor) {
        setMfaFactor(factor.id);
        return true;
      }
    }
    return false;
  }

  // If already signed in, redirect to admin (or ask for the 2FA code).
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && !(await needsMfa())) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactor || !/^\d{6}$/.test(mfaCode)) return toast.error("Enter the 6-digit code");
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactor, code: mfaCode });
    setLoading(false);
    if (error) return toast.error("Invalid code. Try again.");
    navigate({ to: "/admin", replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || email.split("@")[0] },
            emailRedirectTo: window.location.origin + "/admin",
          },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
      } else {
        const clean = email.trim().toLowerCase();
        const { wait } = await checkAllowed({ data: { email: clean } });
        if (wait > 0) {
          setWaitUntil(Date.now() + wait * 1000);
          throw new Error(`Too many failed attempts. Try again in ${Math.ceil(wait / 60)} min.`);
        }
        const { error } = await supabase.auth.signInWithPassword({ email: clean, password });
        const res = await recordAttempt({ data: { email: clean, success: !error } });
        if (error) {
          if (res.wait > 0) setWaitUntil(Date.now() + res.wait * 1000);
          throw new Error("Invalid email or password");
        }
        if (await needsMfa()) return;
        toast.success("Welcome back");
      }
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      if (await needsMfa()) { setLoading(false); return; }
      navigate({ to: "/admin", replace: true });
    } catch {
      toast.error("Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative left panel + form panel */}
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 70%, rgba(220,38,38,0.35), transparent 45%)",
            }}
          />
          <div className="relative flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${schoolName} logo`}
                className="h-12 w-12 shrink-0 rounded-md bg-primary-foreground/10 object-contain p-1"
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary-foreground/15 font-display text-lg font-bold backdrop-blur">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold tracking-tight">
                {schoolName}
              </div>
              <div className="text-xs uppercase tracking-widest text-primary-foreground/70">
                Management Portal
              </div>
            </div>
          </div>

          <div className="relative">
            <p className="mtis-eyebrow text-primary-foreground/70">Welcome to</p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight">
              {schoolName}
            </h1>
            <p className="mt-4 max-w-md text-sm text-primary-foreground/80">{tagline}</p>
          </div>
        </aside>

        {/* Form panel */}
        <main className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-9 w-9 rounded-md object-contain" />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-md bg-primary font-display font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
              <div className="truncate font-display text-lg font-bold tracking-tight text-primary">
                {schoolName}
              </div>
            </div>

            {mfaFactor ? (
              <form onSubmit={handleMfa} className="space-y-4">
                <p className="mtis-eyebrow">Two-factor sign-in</p>
                <h2 className="font-display text-2xl font-bold">Enter your code</h2>
                <p className="text-sm text-muted-foreground">Open your authenticator app and enter the 6-digit code.</p>
                <Input autoFocus inputMode="numeric" maxLength={6} value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
                <Button type="submit" className="w-full" disabled={loading}>Verify</Button>
                <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={async () => { await supabase.auth.signOut(); setMfaFactor(null); }}>Cancel</button>
              </form>
            ) : (<>
            <p className="mtis-eyebrow">Account access</p>
            <h2 className="mt-2 font-display text-2xl font-bold">
              {mode === "signin" ? "Sign in to your account" : "Create an account"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Use your portal credentials to continue."
                : "Join an existing school portal."}
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full"
              onClick={handleGoogle}
              disabled={loading}
            >
              <GoogleIcon /> Continue with Google
            </Button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or with email
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <Field label="Full name">
                  <Input
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ayesha Khan"
                    required
                  />
                </Field>
              )}
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  required
                />
              </Field>
              <Field label="Password">
                <PasswordInput
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </Field>

              <Button type="submit" className="w-full" disabled={loading || waitLeft > 0}>
                {loading ? <Loader2 className="animate-spin" /> : null}
                {waitLeft > 0 ? `Locked — wait ${waitLeft}s` : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  Don't have a school yet?{" "}
                  <Link to="/register" className="font-semibold text-primary hover:text-primary-light">
                    Register your school
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="font-semibold text-primary hover:text-primary-light"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
            </>)}

            <p className="mt-8 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground">
                ← Back to home
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.5 14.7 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 11.5-4.9 11.5-11.7 0-.8-.1-1.4-.2-2H12z"/>
      <path fill="#34A853" d="M3.9 7.5l3.2 2.3C7.9 8 9.8 6.7 12 6.7c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.5 14.7 2.5 12 2.5 8.2 2.5 4.9 4.6 3.9 7.5z" opacity=".1"/>
    </svg>
  );
}
