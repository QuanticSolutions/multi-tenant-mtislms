import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Account Security" },
      { name: "description", content: "Manage two-factor sign-in for your account." },
      { property: "og:title", content: "Account Security" },
      { property: "og:description", content: "Manage two-factor sign-in for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

type Factor = { id: string; status: string; friendly_name?: string };

function SecurityPage() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  }
  useEffect(() => {
    load();
  }, []);

  const verified = factors.find((f) => f.status === "verified");

  async function start() {
    setBusy(true);
    // clean up unfinished setups
    for (const f of factors.filter((f) => f.status !== "verified"))
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${Date.now()}`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm() {
    if (!enroll || !/^\d{6}$/.test(code)) return toast.error("Enter the 6-digit code");
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code });
    setBusy(false);
    if (error) return toast.error("That code didn't work. Try again.");
    toast.success("Two-factor sign-in is on");
    setEnroll(null);
    setCode("");
    load();
  }

  async function disable() {
    if (!verified || !window.confirm("Turn off two-factor sign-in?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Two-factor sign-in turned off");
    load();
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <Link to="/admin" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <div className="mtis-card p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h1 className="font-display text-xl font-bold">Two-factor sign-in</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Require a 6-digit code from an authenticator app (Google Authenticator, Authy, Microsoft Authenticator) when signing in.
        </p>

        {verified ? (
          <div className="mt-6 flex items-center justify-between rounded-md border border-border p-4">
            <span className="text-sm font-medium">Status: On</span>
            <Button variant="outline" onClick={disable} disabled={busy}>Turn off</Button>
          </div>
        ) : enroll ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm">1. Scan this QR code with your authenticator app.</p>
            <img src={enroll.qr} alt="Authenticator QR code" className="size-48 rounded bg-card p-2" />
            <p className="text-xs text-muted-foreground break-all">Or enter this key: {enroll.secret}</p>
            <p className="text-sm">2. Enter the 6-digit code it shows.</p>
            <div className="flex gap-2">
              <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
              <Button onClick={confirm} disabled={busy}>Confirm</Button>
            </div>
          </div>
        ) : (
          <Button className="mt-6" onClick={start} disabled={busy}>Set up two-factor sign-in</Button>
        )}
      </div>
    </div>
  );
}
