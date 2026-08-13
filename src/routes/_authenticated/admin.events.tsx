import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  MapPin,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { formatStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({
    meta: [
      { title: "Events & Calendar — Madina Tul Ilm" },
      { name: "description", content: "Academic calendar with holidays, exams, PTMs and school events." },
    ],
  }),
  component: EventsPage,
});

type EventType = "holiday" | "exam" | "ptm" | "activity" | "announcement" | "other";
type Audience = "all" | "students" | "teachers" | "parents" | "staff";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  audience: Audience;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  class_id: string | null;
  is_holiday: boolean;
  color: string | null;
  classes?: { name: string; section: string | null } | null;
};

const TYPE_TONE: Record<EventType, string> = {
  holiday: "bg-accent-soft text-accent",
  exam: "bg-info-soft text-info",
  ptm: "bg-warning-soft text-warning",
  activity: "bg-success-soft text-success",
  announcement: "bg-primary-pale text-primary",
  other: "bg-muted text-muted-foreground",
};

const TYPE_LABEL: Record<EventType, string> = {
  holiday: "Holiday",
  exam: "Exam",
  ptm: "PTM",
  activity: "Activity",
  announcement: "Announcement",
  other: "Other",
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function buildMonthGrid(anchor: Date) {
  const first = startOfMonth(anchor);
  const startWeekday = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - startWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function EventsPage() {
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const rangeStart = toISODate(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1));
  const rangeEnd = toISODate(new Date(anchor.getFullYear(), anchor.getMonth() + 2, 0));

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section, grade_level")
        .order("grade_level");
      if (error) throw error;
      return data;
    },
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", rangeStart, rangeEnd, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from("events")
        .select("*, classes:class_id ( name, section )")
        .gte("end_date", rangeStart)
        .lte("start_date", rangeEnd)
        .order("start_date");
      if (typeFilter !== "all") q = q.eq("event_type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const grid = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const monthStart = toISODate(startOfMonth(anchor));
  const monthEnd = toISODate(endOfMonth(anchor));

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    (events ?? []).forEach((ev) => {
      const s = new Date(ev.start_date);
      const e = new Date(ev.end_date);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const key = toISODate(d);
        const list = map.get(key) ?? [];
        list.push(ev);
        map.set(key, list);
      }
    });
    return map;
  }, [events]);

  const monthEvents = useMemo(() => {
    return (events ?? []).filter(
      (ev) => ev.end_date >= monthStart && ev.start_date <= monthEnd,
    );
  }, [events, monthStart, monthEnd]);

  const stats = useMemo(() => {
    const list = monthEvents;
    return {
      total: list.length,
      holidays: list.filter((e) => e.event_type === "holiday" || e.is_holiday).length,
      exams: list.filter((e) => e.event_type === "exam").length,
      ptms: list.filter((e) => e.event_type === "ptm").length,
    };
  }, [monthEvents]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthLabel = anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayISO = toISODate(new Date());

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Academic calendar</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Events & Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Plan holidays, exams, PTMs and school-wide activities.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus /> New event
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label={`Events in ${monthLabel}`} value={stats.total} />
        <StatTile label="Holidays" value={stats.holidays} tone="danger" />
        <StatTile label="Exams" value={stats.exams} tone="info" />
        <StatTile label="Parent meetings" value={stats.ptms} tone="warning" />
      </section>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setAnchor((a) => addMonths(a, -1))}>
              <ChevronLeft />
            </Button>
            <div className="min-w-[160px] text-center font-display text-lg font-semibold">
              {monthLabel}
            </div>
            <Button variant="outline" size="icon" onClick={() => setAnchor((a) => addMonths(a, 1))}>
              <ChevronRight />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(startOfMonth(new Date()))}>
              Today
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as EventType | "all")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border text-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="bg-muted px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {grid.map((day) => {
            const iso = toISODate(day);
            const inMonth = day.getMonth() === anchor.getMonth();
            const isToday = iso === todayISO;
            const dayEvents = eventsByDay.get(iso) ?? [];
            return (
              <div
                key={iso}
                className={`min-h-[92px] bg-background p-2 ${inMonth ? "" : "opacity-50"}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                      isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      +{dayEvents.length - 2}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <button
                      key={`${iso}-${ev.id}`}
                      onClick={() => {
                        setEditing(ev);
                        setDialogOpen(true);
                      }}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${TYPE_TONE[ev.event_type]}`}
                      title={ev.title}
                    >
                      {ev.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mtis-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Upcoming in {monthLabel}</h2>
          <span className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${monthEvents.length} events`}
          </span>
        </div>
        <div className="mt-3 divide-y divide-border">
          {monthEvents.length === 0 && !isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No events this month.</p>
          ) : (
            monthEvents.map((ev) => (
              <div key={ev.id} className="flex items-start gap-4 py-3">
                <div className="w-14 shrink-0 text-center">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {new Date(ev.start_date).toLocaleDateString(undefined, { month: "short" })}
                  </div>
                  <div className="font-display text-2xl font-bold text-primary">
                    {new Date(ev.start_date).getDate()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{ev.title}</span>
                    <Badge className={TYPE_TONE[ev.event_type]} variant="secondary">
                      {TYPE_LABEL[ev.event_type]}
                    </Badge>
                    {ev.audience !== "all" && (
                      <Badge variant="outline" className="capitalize">
                        {formatStatus(ev.audience)}
                      </Badge>
                    )}
                  </div>
                  {ev.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {ev.description}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {ev.start_date}
                      {ev.end_date !== ev.start_date ? ` → ${ev.end_date}` : ""}
                    </span>
                    {ev.start_time && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {ev.start_time.slice(0, 5)}
                        {ev.end_time ? `–${ev.end_time.slice(0, 5)}` : ""}
                      </span>
                    )}
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {ev.location}
                      </span>
                    )}
                    {ev.classes?.name && (
                      <span>
                        Class: {ev.classes.name}
                        {ev.classes.section ? ` · ${ev.classes.section}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(ev);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete "${ev.title}"?`)) remove.mutate(ev.id);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        event={editing}
        classes={classes ?? []}
      />
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "info" | "danger" | "success" | "warning";
}) {
  const toneCls =
    tone === "info"
      ? "text-info"
      : tone === "danger"
        ? "text-accent"
        : tone === "success"
          ? "text-success"
          : tone === "warning"
            ? "text-warning"
            : "text-foreground";
  return (
    <div className="mtis-card p-4">
      <p className="mtis-eyebrow">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

function EventDialog({
  open,
  onOpenChange,
  event,
  classes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: EventRow | null;
  classes: { id: string; name: string; section: string | null }[];
}) {
  const qc = useQueryClient();
  const isEdit = !!event;

  const [form, setForm] = useState(() => defaults(event));

  // reset when opening for a different event
  useMemo(() => {
    setForm(defaults(event));
  }, [event, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.start_date || !form.end_date) {
        throw new Error("Title, start and end date are required");
      }
      if (form.end_date < form.start_date) {
        throw new Error("End date must be on or after start date");
      }
      const payload = {
        title: form.title,
        description: form.description || null,
        event_type: form.event_type,
        audience: form.audience,
        start_date: form.start_date,
        end_date: form.end_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location || null,
        class_id: form.class_id || null,
        is_holiday: form.event_type === "holiday",
      };
      if (isEdit && event) {
        const { error } = await supabase.from("events").update(payload).eq("id", event.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(isEdit ? "Event updated" : "Event created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            Add to the academic calendar. Multi-day events are supported.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Independence Day"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select
                value={form.event_type}
                onValueChange={(v) => setForm({ ...form, event_type: v as EventType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Audience</label>
              <Select
                value={form.audience}
                onValueChange={(v) => setForm({ ...form, audience: v as Audience })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="students">Students</SelectItem>
                  <SelectItem value="teachers">Teachers</SelectItem>
                  <SelectItem value="parents">Parents</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start date</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">End date</label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start time</label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">End time</label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Location</label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Main hall"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Class (optional)</label>
            <Select
              value={form.class_id || "none"}
              onValueChange={(v) => setForm({ ...form, class_id: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Whole school" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Whole school</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` · ${c.section}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details for staff and parents"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {isEdit ? "Save changes" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaults(ev: EventRow | null) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: ev?.title ?? "",
    description: ev?.description ?? "",
    event_type: (ev?.event_type ?? "activity") as EventType,
    audience: (ev?.audience ?? "all") as Audience,
    start_date: ev?.start_date ?? today,
    end_date: ev?.end_date ?? today,
    start_time: ev?.start_time?.slice(0, 5) ?? "",
    end_time: ev?.end_time?.slice(0, 5) ?? "",
    location: ev?.location ?? "",
    class_id: ev?.class_id ?? "",
  };
}
