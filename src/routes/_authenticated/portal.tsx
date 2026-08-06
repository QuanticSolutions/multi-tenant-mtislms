import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Megaphone, LogOut, Pin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Student Portal — Madina Tul Ilm" },
      {
        name: "description",
        content: "Student portal for Madina Tul Ilm: view your class timetable and school announcements.",
      },
      { property: "og:title", content: "Student Portal — Madina Tul Ilm" },
      {
        property: "og:description",
        content: "View your class timetable and school announcements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalPage,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function PortalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["portal-me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("students")
        .select("id, full_name, admission_no, class_id, classes(name, section)")
        .eq("user_id", u.user.id)
        .maybeSingle();
      return {
        email: u.user.email ?? null,
        name: (u.user.user_metadata?.full_name as string | undefined) ?? null,
        student: data ?? null,
      };
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const student = me?.student as any;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface shadow-card">
        <div className="mx-auto flex h-full max-w-[1100px] items-center gap-3 px-6">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary font-display font-bold text-primary-foreground">
            M
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight text-primary">
              Madina Tul Ilm
            </div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Student Portal
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold">{student?.full_name ?? me?.name ?? "—"}</div>
              <div className="text-[11px] text-muted-foreground">
                {student?.classes?.name
                  ? `${student.classes.name}${student.classes.section ? " · " + student.classes.section : ""}`
                  : "Student"}
              </div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 px-6 py-8">
        <Tabs defaultValue="timetable" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timetable">
              <CalendarDays className="mr-2 size-4" /> Timetable
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <Megaphone className="mr-2 size-4" /> Announcements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timetable">
            <TimetableTab classId={student?.class_id ?? null} />
          </TabsContent>
          <TabsContent value="announcements">
            <AnnouncementsTab classId={student?.class_id ?? null} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TimetableTab({ classId }: { classId: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-timetable", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, subject, day_of_week, period_no, start_time, end_time, room, teachers(full_name)")
        .eq("class_id", classId!)
        .order("day_of_week")
        .order("period_no");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!classId) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        Your account isn't linked to a student record yet. Please ask the school office.
      </div>
    );
  }
  if (isLoading) {
    return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const slots = (data ?? []) as any[];

  return (
    <div className="space-y-4">
      {DAYS.map((day, idx) => {
        const dayNo = idx + 1;
        const rows = slots.filter((s) => s.day_of_week === dayNo);
        if (rows.length === 0) return null;
        return (
          <div key={day} className="mtis-card p-4">
            <p className="mtis-eyebrow mb-3">{day}</p>
            <ul className="space-y-2">
              {rows.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="grid size-7 place-items-center rounded-md bg-primary-pale text-xs font-semibold text-primary">
                    {s.period_no}
                  </span>
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-sm text-muted-foreground">
                    {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}
                  </span>
                  {s.teachers?.full_name && (
                    <span className="text-sm text-muted-foreground">{s.teachers.full_name}</span>
                  )}
                  {s.room && <Badge variant="secondary">{s.room}</Badge>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {slots.length === 0 && (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
          No timetable published for your class yet.
        </div>
      )}
    </div>
  );
}

function AnnouncementsTab({ classId }: { classId: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-announcements", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, audience, class_id, pinned, published_at, created_at")
        .not("published_at", "is", null)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter(
        (a) => a.audience === "all" || (a.audience === "class" && a.class_id === classId),
      );
    },
  });

  if (isLoading) {
    return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const items = data ?? [];
  if (items.length === 0) {
    return (
      <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
        No announcements right now.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="mtis-card p-4">
          <div className="flex items-start gap-2">
            {a.pinned && <Pin className="mt-1 size-4 text-accent" />}
            <div>
              <h2 className="font-display text-base font-semibold">{a.title}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(a.published_at ?? a.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
