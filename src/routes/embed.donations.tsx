import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmbedField, EmbedShell, EmbedSuccess } from "@/components/embed/embed-shell";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/hooks/use-tenant";
import { formatStatus } from "@/lib/format";

export const Route = createFileRoute("/embed/donations")({
  head: () => ({
    meta: [
      { title: "Donate" },
      {
        name: "description",
        content: "Support our students by pledging a donation online.",
      },
      { property: "og:title", content: "Donate" },
      {
        property: "og:description",
        content: "Support our students by pledging a donation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DonationEmbed,
});

const METHODS = ["cash", "bank_transfer", "card", "cheque", "online", "other"] as const;

function DonationEmbed() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    donor_name: "",
    donor_phone: "",
    donor_email: "",
    amount: "",
    purpose: "",
    method: "bank_transfer",
    reference: "",
    notes: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { tenantId } = usePublicTenant();
  const submit = useMutation({
    mutationFn: async () => {
      if (!form.donor_name.trim()) throw new Error("Your name is required");
      const amount = Number(form.amount || 0);
      if (!amount || amount <= 0) throw new Error("Enter a valid donation amount");
      if (!tenantId) throw new Error("This school could not be found");
      const { error } = await supabase.from("donations").insert({
        tenant_id: tenantId,
        donor_name: form.donor_name.trim().slice(0, 120),
        donor_phone: form.donor_phone.slice(0, 40) || null,
        donor_email: form.donor_email.slice(0, 160) || null,
        amount,
        purpose: form.purpose.slice(0, 160) || null,
        method: form.method as (typeof METHODS)[number],
        reference: form.reference.slice(0, 120) || null,
        notes: form.notes.slice(0, 500) || null,
        status: "pledged",
        source: "website",
      });
      if (error) throw error;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <EmbedShell
      title="Make a donation"
      subtitle="Your contribution supports scholarships, books and school operations."
    >
      {done ? (
        <EmbedSuccess message="Your donation pledge has been recorded. Our finance office will contact you with payment details and a receipt." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EmbedField label="Your name *">
            <Input value={form.donor_name} onChange={(e) => set("donor_name", e.target.value)} />
          </EmbedField>
          <EmbedField label="Phone">
            <Input value={form.donor_phone} onChange={(e) => set("donor_phone", e.target.value)} />
          </EmbedField>
          <EmbedField label="Email">
            <Input
              type="email"
              value={form.donor_email}
              onChange={(e) => set("donor_email", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="Amount *">
            <Input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="Purpose">
            <Input
              value={form.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              placeholder="Scholarship fund"
            />
          </EmbedField>
          <EmbedField label="Preferred payment method">
            <Select value={form.method} onValueChange={(v) => set("method", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatStatus(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EmbedField>
          <EmbedField label="Message" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </EmbedField>
          <div className="sm:col-span-2">
            <Button className="w-full" onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit donation"}
            </Button>
          </div>
        </div>
      )}
    </EmbedShell>
  );
}
