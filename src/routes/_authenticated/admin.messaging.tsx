import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Megaphone,
  Users as UsersIcon,
  Send,
  Pin,
  Mail,
  Phone,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/messaging")({
  head: () => ({
    meta: [
      { title: "Messaging — Madina Tul Ilm" },
      {
        name: "description",
        content: "Send announcements and manage parent contacts and messages.",
      },
    ],
  }),
  component: MessagingPage,
});

type Audience = "all" | "teachers" | "parents" | "class";
type Channel = "email" | "sms" | "whatsapp" | "in_app";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  class_id: string | null;
  pinned: boolean;
  published_at: string | null;
  created_at: string;
  classes?: { name: string } | null;
};

type ParentContactRow = {
  id: string;
  student_id: string;
  full_name: string;
  relation: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  notes: string | null;
  students?: { full_name: string; admission_no: string } | null;
};

type MessageRow = {
  id: string;
  parent_contact_id: string | null;
  student_id: string | null;
  subject: string | null;
  body: string;
  channel: Channel;
  status: "draft" | "queued" | "sent" | "failed";
  sent_at: string;
  parent_contacts?: { full_name: string } | null;
  students?: { full_name: string } | null;
};

function MessagingPage() {
  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="mtis-eyebrow mb-1">Communication</p>
          <h1 className="font-display text-2xl font-bold tracking-tight">Messaging</h1>
          <p className="text-sm text-muted-foreground">
            Broadcast announcements and stay in touch with parents.
          </p>
        </div>
      </div>

      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="announcements">
            <Megaphone className="size-4 mr-2" /> Announcements
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <UsersIcon className="size-4 mr-2" /> Parent Contacts
          </TabsTrigger>
          <TabsTrigger value="messages">
            <Send className="size-4 mr-2" /> Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements">
          <AnnouncementsTab />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab />
        </TabsContent>
        <TabsContent value="messages">
          <MessagesTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ============================== ANNOUNCEMENTS ============================== */

function AnnouncementsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, classes(name)")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnnouncementRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (data ?? []).filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
    );
  }, [data, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement removed");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const togglePin = useMutation({
    mutationFn: async (a: AnnouncementRow) => {
      const { error } = await supabase
        .from("announcements")
        .update({ pinned: !a.pinned })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements…"
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> New announcement
            </Button>
          </DialogTrigger>
          <AddAnnouncementDialog onDone={() => setOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
          No announcements yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => (
            <li key={a.id} className="mtis-card p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-primary-pale text-primary">
                  <Megaphone className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    {a.pinned && (
                      <Badge variant="secondary">
                        <Pin className="size-3 mr-1" /> Pinned
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {a.audience}
                      {a.audience === "class" && a.classes?.name ? ` · ${a.classes.name}` : ""}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {a.body}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => togglePin.mutate(a)}>
                    {a.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this announcement?")) remove.mutate(a.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddAnnouncementDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [classId, setClassId] = useState<string>("");
  const [pinned, setPinned] = useState(false);

  const { data: classes } = useQuery({
    queryKey: ["classes-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error("Title and body are required");
      if (audience === "class" && !classId) throw new Error("Pick a class");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("announcements").insert({
        title: title.trim(),
        body: body.trim(),
        audience,
        class_id: audience === "class" ? classId : null,
        pinned,
        published_at: new Date().toISOString(),
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement published");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      onDone();
      setTitle("");
      setBody("");
      setAudience("all");
      setClassId("");
      setPinned(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New announcement</DialogTitle>
        <DialogDescription>Broadcast to your selected audience.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Title</Label>
          <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea
            rows={5}
            value={body}
            maxLength={4000}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="teachers">Teachers</SelectItem>
                <SelectItem value="parents">Parents</SelectItem>
                <SelectItem value="class">Specific class</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {audience === "class" && (
            <div>
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick class" />
                </SelectTrigger>
                <SelectContent>
                  {(classes ?? []).map((c: { id: string; name: string }) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
          Pin to top
        </label>
      </div>
      <DialogFooter>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Publishing…" : "Publish"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ============================== PARENT CONTACTS ============================== */

function ContactsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["parent-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_contacts")
        .select("*, students(full_name, admission_no)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ParentContactRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (data ?? []).filter(
      (c) =>
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.students?.full_name.toLowerCase().includes(q),
    );
  }, [data, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parent_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact removed");
      qc.invalidateQueries({ queryKey: ["parent-contacts"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parents, students…"
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Add contact
            </Button>
          </DialogTrigger>
          <AddContactDialog onDone={() => setOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
          No parent contacts yet.
        </div>
      ) : (
        <div className="mtis-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {c.relation}
                      {c.is_primary ? " · primary" : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.students?.full_name ?? "—"}
                    {c.students?.admission_no && (
                      <div className="text-xs text-muted-foreground">
                        {c.students.admission_no}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.phone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="size-3.5 text-muted-foreground" /> {c.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground" /> {c.email}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this contact?")) remove.mutate(c.id);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddContactDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [relation, setRelation] = useState("parent");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  const { data: students } = useQuery({
    queryKey: ["students-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_no")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Pick a student");
      if (!fullName.trim()) throw new Error("Name is required");
      if (!phone.trim() && !email.trim())
        throw new Error("Provide at least a phone or email");
      if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Invalid email");
      const { error } = await supabase.from("parent_contacts").insert({
        student_id: studentId,
        full_name: fullName.trim(),
        relation,
        phone: phone.trim() || null,
        email: email.trim() || null,
        is_primary: isPrimary,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact added");
      qc.invalidateQueries({ queryKey: ["parent-contacts"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add parent contact</DialogTitle>
        <DialogDescription>Link a parent or guardian to a student.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Student</Label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick student" />
            </SelectTrigger>
            <SelectContent>
              {(students ?? []).map(
                (s: { id: string; full_name: string; admission_no: string }) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} · {s.admission_no}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Relation</Label>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="mother">Mother</SelectItem>
                <SelectItem value="father">Father</SelectItem>
                <SelectItem value="guardian">Guardian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Phone</Label>
            <Input value={phone} maxLength={32} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={email}
              type="email"
              maxLength={160}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          Primary contact
        </label>
      </div>
      <DialogFooter>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ============================== MESSAGES ============================== */

function MessagesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, parent_contacts(full_name), students(full_name)")
        .order("sent_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="mtis-card p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Log of messages sent to parents. Integrations (SMS/WhatsApp/email) can be added later.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> New message
            </Button>
          </DialogTrigger>
          <NewMessageDialog onDone={() => setOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (data ?? []).length === 0 ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
          No messages logged yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {(data ?? []).map((m) => (
            <li key={m.id} className="mtis-card p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-primary-pale text-primary">
                  <MessageSquare className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      To: {m.parent_contacts?.full_name ?? "—"}
                    </span>
                    {m.students?.full_name && (
                      <span className="text-xs text-muted-foreground">
                        ({m.students.full_name})
                      </span>
                    )}
                    <Badge variant="outline" className="uppercase">
                      {m.channel.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {m.status}
                    </Badge>
                  </div>
                  {m.subject && <div className="mt-1 font-medium text-sm">{m.subject}</div>}
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {m.body}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(m.sent_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("Delete this message?")) return;
                    const { error } = await supabase.from("messages").delete().eq("id", m.id);
                    if (error) toast.error(error.message);
                    else {
                      toast.success("Deleted");
                      qc.invalidateQueries({ queryKey: ["messages"] });
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewMessageDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [contactId, setContactId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<Channel>("in_app");

  const { data: contacts } = useQuery({
    queryKey: ["parent-contacts-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_contacts")
        .select("id, full_name, student_id, students(full_name)")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!contactId) throw new Error("Pick a parent contact");
      if (!body.trim()) throw new Error("Message body is required");
      const contact = (contacts ?? []).find(
        (c: { id: string }) => c.id === contactId,
      ) as { id: string; student_id: string | null } | undefined;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("messages").insert({
        parent_contact_id: contactId,
        student_id: contact?.student_id ?? null,
        subject: subject.trim() || null,
        body: body.trim(),
        channel,
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message logged");
      qc.invalidateQueries({ queryKey: ["messages"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New message</DialogTitle>
        <DialogDescription>Send and record a message to a parent.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Parent</Label>
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick parent" />
            </SelectTrigger>
            <SelectContent>
              {(contacts ?? []).map(
                (c: {
                  id: string;
                  full_name: string;
                  students?: { full_name: string } | null;
                }) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                    {c.students?.full_name ? ` · ${c.students.full_name}` : ""}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Channel</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_app">In-app</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Subject (optional)</Label>
          <Input value={subject} maxLength={140} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea
            rows={5}
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => send.mutate()} disabled={send.isPending}>
          {send.isPending ? "Sending…" : "Send"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
