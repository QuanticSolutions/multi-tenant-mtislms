import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { BrandLockup } from "@/hooks/use-branding";

export function EmbedShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mtis-card p-6 sm:p-8">
          <BrandLockup />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function EmbedSuccess({ message }: { message: string }) {
  return (
    <div className="grid place-items-center py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
        <CheckCircle2 className="size-7" />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold">Thank you</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function EmbedField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}
