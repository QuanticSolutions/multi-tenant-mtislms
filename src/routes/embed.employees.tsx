import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmbedField, EmbedShell, EmbedSuccess } from "@/components/embed/embed-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/embed/employees")({
  head: () => ({
    meta: [
      { title: "Careers — School LMS" },
      {
        name: "description",
        content: "Apply for a teaching or support role at School LMS.",
      },
      { property: "og:title", content: "Careers — School LMS" },
      {
        property: "og:description",
        content: "Apply for a teaching or support role at School LMS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmployeeEmbed,
});

function EmployeeEmbed() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    position: "",
    qualification: "",
    experience_years: "",
    cv_url: "",
    expected_salary: "",
    notes: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim() || !form.phone.trim() || !form.position.trim())
        throw new Error("Name, phone and position are required");
      const { error } = await supabase.from("employment_applications").insert({
        full_name: form.full_name.trim().slice(0, 120),
        phone: form.phone.trim().slice(0, 40),
        email: form.email.slice(0, 160) || null,
        position: form.position.trim().slice(0, 120),
        qualification: form.qualification.slice(0, 160) || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        cv_url: form.cv_url.slice(0, 400) || null,
        expected_salary: form.expected_salary ? Number(form.expected_salary) : null,
        notes: form.notes.slice(0, 500) || null,
        status: "new",
        source: "website",
      });
      if (error) throw error;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <EmbedShell
      title="Job application"
      subtitle="Tell us about yourself and the role you're applying for."
    >
      {done ? (
        <EmbedSuccess message="Your application has been received. Our HR team will review it and contact you if shortlisted." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EmbedField label="Full name *">
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </EmbedField>
          <EmbedField label="Phone *">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </EmbedField>
          <EmbedField label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </EmbedField>
          <EmbedField label="Position applied for *">
            <Input
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
              placeholder="Mathematics Teacher"
            />
          </EmbedField>
          <EmbedField label="Qualification">
            <Input
              value={form.qualification}
              onChange={(e) => set("qualification", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="Experience (years)">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={form.experience_years}
              onChange={(e) => set("experience_years", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="CV / portfolio link">
            <Input value={form.cv_url} onChange={(e) => set("cv_url", e.target.value)} />
          </EmbedField>
          <EmbedField label="Expected salary">
            <Input
              type="number"
              min="0"
              value={form.expected_salary}
              onChange={(e) => set("expected_salary", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="Cover note" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </EmbedField>
          <div className="sm:col-span-2">
            <Button className="w-full" onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </div>
        </div>
      )}
    </EmbedShell>
  );
}
