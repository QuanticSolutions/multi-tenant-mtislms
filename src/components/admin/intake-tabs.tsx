import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Code2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export type IntakeKey = "admissions" | "donations" | "employees";

const TABS: Array<{ key: IntakeKey; label: string; to: string }> = [
  { key: "admissions", label: "Admissions", to: "/admin/admissions" },
  { key: "donations", label: "Donations", to: "/admin/donations" },
  { key: "employees", label: "Employees", to: "/admin/employees" },
];

export function embedUrl(key: IntakeKey | "events") {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/embed/${key}`;
}

export function embedSnippet(key: IntakeKey | "events", title: string) {
  return `<iframe src="${embedUrl(key)}" width="100%" height="720" style="border:0" title="${title}"></iframe>`;
}

export function CopyEmbedButton({
  target,
  title,
}: {
  target: IntakeKey | "events";
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const snippet = embedSnippet(target, title);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Embed code copied", { description: embedUrl(target) });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — copy this link manually", {
        description: embedUrl(target),
      });
    }
  }

  return (
    <Button variant="outline" onClick={copy}>
      {copied ? <Check className="size-4" /> : <Code2 className="size-4" />}
      {copied ? "Copied" : "Copy embed code"}
    </Button>
  );
}

export function IntakeTabs({ active }: { active: IntakeKey }) {
  return (
    <div className="mtis-card flex flex-wrap items-center gap-1 p-1.5">
      {TABS.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            active === t.key
              ? "bg-primary-pale text-primary"
              : "text-muted-foreground hover:bg-primary-pale/60 hover:text-primary"
          }`}
        >
          {t.label}
        </Link>
      ))}
      <div className="ml-auto pr-1">
        <CopyEmbedButton
          target={active}
          title={`${TABS.find((t) => t.key === active)!.label} form`}
        />
      </div>
    </div>
  );
}
