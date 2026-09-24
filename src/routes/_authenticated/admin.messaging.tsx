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
import { formatDateTime, formatStatus } from "@/lib/format";
import { useMyRoles } from "@/hooks/use-role";


export const Route = createFileRoute("/_authenticated/admin/messaging")({
  head: () => ({
    meta: [
      { title: "Messaging" },
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
          <h1 className="font-display text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Broadcast notices to staff, parents and students.
          </p>
        </div>
      </div>

      <AnnouncementsTab />
    </AppShell>
  );
}


/* ============================== ANNOUNCEMENTS ============================== */

function AnnouncementsTab() {
  const qc = useQueryClient();
  const { isAdmin } = useMyRoles();
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
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> New announcement
              </Button>
            </DialogTrigger>
            <AddAnnouncementDialog onDone={() => setOpen(false)} />
          </Dialog>
        )}

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
                      {formatStatus(a.audience)}
                      {a.audience === "class" && a.classes?.name ? ` · ${a.classes.name}` : ""}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {a.body}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(a.created_at)}
                  </p>
                </div>
                {isAdmin && (
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
                )}

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

