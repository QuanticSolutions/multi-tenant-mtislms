import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { formatClass } from "@/lib/format";

export const Route = createFileRoute("/embed/admissions")({
  head: () => ({
    meta: [
      { title: "Admission Application" },
      {
        name: "description",
        content: "Apply for admission online. Submit your child's details in a few minutes.",
      },
      { property: "og:title", content: "Admission Application" },
      {
        property: "og:description",
        content: "Apply for admission online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdmissionEmbed,
});

function AdmissionEmbed() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    date_of_birth: "",
    applying_for_class_id: "",
    previous_school: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: classes } = useQuery({
    queryKey: ["embed-classes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id, name, section")
        .order("grade_level");
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.first_name.trim() || !form.last_name.trim())
        throw new Error("Student name is required");
      if (!form.guardian_name.trim() || !form.guardian_phone.trim())
        throw new Error("Guardian name and phone are required");
      const { error } = await supabase.from("admission_applications").insert({
        application_no: `WEB-${Date.now().toString(36).toUpperCase()}`,
        first_name: form.first_name.trim().slice(0, 80),
        last_name: form.last_name.trim().slice(0, 80),
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        applying_for_class_id: form.applying_for_class_id || null,
        previous_school: form.previous_school.slice(0, 160) || null,
        guardian_name: form.guardian_name.trim().slice(0, 120),
        guardian_phone: form.guardian_phone.trim().slice(0, 40),
        guardian_email: form.guardian_email.slice(0, 160) || null,
        address: form.address.slice(0, 400) || null,
        source: "website",
      });
      if (error) throw error;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <EmbedShell
      title="Admission application"
      subtitle="Complete the form and our admissions office will contact you."
    >
      {done ? (
        <EmbedSuccess message="Your admission application has been received. Our admissions office will be in touch shortly." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EmbedField label="Student first name *">
            <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
          </EmbedField>
          <EmbedField label="Student last name *">
            <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </EmbedField>
          <EmbedField label="Gender">
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </EmbedField>
          <EmbedField label="Date of birth">
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="Applying for class">
            <Select
              value={form.applying_for_class_id}
              onValueChange={(v) => set("applying_for_class_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {(classes ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatClass(c.name, c.section)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EmbedField>
          <EmbedField label="Previous school">
            <Input
              value={form.previous_school}
              onChange={(e) => set("previous_school", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="Guardian name *">
            <Input
              value={form.guardian_name}
              onChange={(e) => set("guardian_name", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="Guardian phone *">
            <Input
              value={form.guardian_phone}
              onChange={(e) => set("guardian_phone", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="Guardian email" className="sm:col-span-2">
            <Input
              type="email"
              value={form.guardian_email}
              onChange={(e) => set("guardian_email", e.target.value)}
            />
          </EmbedField>
          <EmbedField label="Address" className="sm:col-span-2">
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={3} />
          </EmbedField>
          <div className="sm:col-span-2">
            <Button
              className="w-full"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
            >
              {submit.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </div>
        </div>
      )}
    </EmbedShell>
  );
}
