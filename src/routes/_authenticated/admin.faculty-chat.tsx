import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send, Plus, Hash, Megaphone, Users as UsersIcon, MessageSquare, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/faculty-chat")({
  head: () => ({
    meta: [
      { title: "Faculty Chat" },
      { name: "description", content: "Chat with teaching staff." },
    ],
  }),
  component: FacultyChatPage,
});

type Channel = {
  id: string;
  name: string;
  type: "direct" | "group" | "announcement";
};

type ChatMessage = {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender_name: string | null;
  sender_email: string | null;
};

function FacultyChatPage() {
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  const { data: channels } = useQuery({
    queryKey: ["chat-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_channels")
        .select("id, name, type")
        .order("created_at");
      if (error) throw error;
      return data as Channel[];
    },
  });

  useEffect(() => {
    if (!activeChannel && channels?.length) {
      // Default to announcement channel if available, else first
      const ann = channels.find((c) => c.type === "announcement");
      setActiveChannel(ann?.id ?? channels[0].id);
    }
  }, [channels, activeChannel]);

  const current = channels?.find((c) => c.id === activeChannel);

  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Communication</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Faculty Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Messages between admins and teachers. Students and parents do not have access.
        </p>
      </div>

      <div className="mtis-card flex h-[600px] overflow-hidden p-0">
        <ChannelList
          channels={channels ?? []}
          activeId={activeChannel}
          onSelect={setActiveChannel}
        />
        {current ? (
          <ChatThread channel={current} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a channel to start chatting
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ChannelList({
  channels,
  activeId,
  onSelect,
}: {
  channels: Channel[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-border">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>
        <Button size="icon" variant="ghost" className="size-7" onClick={() => setShowNew(true)}>
          <Plus className="size-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <ul className="space-y-0.5 p-2">
          {channels.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onSelect(c.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  activeId === c.id
                    ? "bg-primary-pale text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {c.type === "announcement" ? (
                  <Megaphone className="size-4 shrink-0" />
                ) : c.type === "direct" ? (
                  <MessageSquare className="size-4 shrink-0" />
                ) : (
                  <Hash className="size-4 shrink-0" />
                )}
                <span className="truncate">{c.name}</span>
              </button>
            </li>
          ))}
          {channels.length === 0 && (
            <li className="px-2 py-4 text-xs text-muted-foreground">No channels yet.</li>
          )}
        </ul>
      </ScrollArea>
      {showNew && <NewChannelDialog onClose={() => setShowNew(false)} />}
    </div>
  );
}

function ChatThread({ channel }: { channel: Channel }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages", channel.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, channel_id, sender_id, body, created_at")
        .eq("channel_id", channel.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      const senderIds = Array.from(new Set((data ?? []).map((m) => m.sender_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", senderIds);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));

      return (data ?? []).map((m) => ({
        ...m,
        sender_name: map.get(m.sender_id)?.full_name ?? null,
        sender_email: map.get(m.sender_id)?.email ?? null,
      })) as ChatMessage[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel_sub = supabase
      .channel(`chat:${channel.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channel.id}` },
        () => qc.invalidateQueries({ queryKey: ["chat-messages", channel.id] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel_sub);
    };
  }, [channel.id, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      if (!body.trim()) return;
      const { error } = await supabase
        .from("chat_messages")
        .insert({ channel_id: channel.id, body: body.trim() });
      if (error) throw error;
      setBody("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isAnnouncement = channel.type === "announcement";
  const canPost = !isAnnouncement; // Teachers can't post to announcement; the RLS enforces it server-side

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {channel.type === "announcement" ? (
          <Megaphone className="size-4 text-primary" />
        ) : channel.type === "direct" ? (
          <MessageSquare className="size-4 text-primary" />
        ) : (
          <Hash className="size-4 text-primary" />
        )}
        <span className="font-display text-sm font-semibold">{channel.name}</span>
        {channel.type === "announcement" && (
          <Badge variant="outline" className="bg-primary-pale text-primary text-[10px]">Announcement</Badge>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages && messages.length > 0 ? (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-pale text-xs font-semibold text-primary">
                  {initialsOf(m.sender_name ?? m.sender_email ?? "?")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {m.sender_name ?? m.sender_email ?? "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground">{m.body}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
          className="flex gap-2"
        >
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isAnnouncement ? "Admins only can post announcements…" : "Type a message…"}
            disabled={isAnnouncement}
          />
          <Button type="submit" size="icon" disabled={!body.trim() || send.isPending || isAnnouncement}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function NewChannelDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"direct" | "group">("group");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: staff } = useQuery({
    queryKey: ["staff-for-chat"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "teacher"]);
      if (!roles?.length) return [];
      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids)
        .order("full_name");
      return profiles ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (type === "direct") {
        if (selectedUsers.length !== 1) throw new Error("Select one person for a direct chat");
      } else {
        if (!name.trim()) throw new Error("Give the group a name");
        if (selectedUsers.length < 1) throw new Error("Select at least one member");
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");

      const channelName = type === "direct"
        ? (staff?.find((s) => s.id === selectedUsers[0])?.full_name ?? "Direct chat")
        : name.trim();

      const { data: channel, error: chErr } = await supabase
        .from("chat_channels")
        .insert({ name: channelName, type })
        .select("id")
        .single();
      if (chErr) throw chErr;

      const members = [uid, ...selectedUsers];
      const { error: mErr } = await supabase
        .from("chat_channel_members")
        .insert(members.map((user_id) => ({ channel_id: channel!.id, user_id })));
      if (mErr) throw mErr;
    },
    onSuccess: () => {
      toast.success("Channel created");
      qc.invalidateQueries({ queryKey: ["chat-channels"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
          <DialogDescription>Start a direct or group chat with staff members.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setType("direct")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === "direct" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <MessageSquare className="size-3.5" /> Direct
            </button>
            <button
              type="button"
              onClick={() => setType("group")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === "group" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <UsersIcon className="size-3.5" /> Group
            </button>
          </div>

          {type === "group" && (
            <div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name (e.g. Math Department)"
              />
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {type === "direct" ? "Select a person" : "Select members"}
            </p>
            <ScrollArea className="h-48 rounded-md border border-border">
              <ul className="divide-y divide-border">
                {(staff ?? []).map((s) => {
                  const checked = selectedUsers.includes(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (type === "direct") {
                            setSelectedUsers([s.id]);
                          } else {
                            setSelectedUsers((prev) =>
                              prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                            );
                          }
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          checked ? "bg-primary-pale" : "hover:bg-muted"
                        }`}
                      >
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-pale text-[10px] font-semibold text-primary">
                          {initialsOf(s.full_name ?? s.email ?? "?")}
                        </div>
                        <span className="truncate">{s.full_name ?? s.email}</span>
                        {checked && <span className="ml-auto text-xs text-primary">Selected</span>}
                      </button>
                    </li>
                  );
                })}
                {staff?.length === 0 && (
                  <li className="px-3 py-6 text-center text-xs text-muted-foreground">No staff found.</li>
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
