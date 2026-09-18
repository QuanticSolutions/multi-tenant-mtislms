import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/embed/events")({
  head: () => ({
    meta: [
      { title: "School Calendar — School LMS" },
      {
        name: "description",
        content: "Holidays, exams, parent meetings and activities at School LMS.",
      },
      { property: "og:title", content: "School Calendar — School LMS" },
      {
        property: "og:description",
        content: "Holidays, exams, parent meetings and activities at School LMS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventsEmbed,
});

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  location: string | null;
};

const TONE: Record<string, string> = {
  holiday: "bg-accent-soft text-accent",
  exam: "bg-info-soft text-info",
  ptm: "bg-warning-soft text-warning",
  activity: "bg-success-soft text-success",
  announcement: "bg-primary-pale text-primary",
  other: "bg-muted text-muted-foreground",
};

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function EventsEmbed() {
  const [anchor, setAnchor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const monthStart = iso(anchor);
  const monthEnd = iso(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));

  const { data: events } = useQuery({
    queryKey: ["embed-events", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_type, start_date, end_date, location")
        .lte("start_date", monthEnd)
        .gte("end_date", monthStart)
        .order("start_date");
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const days = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [anchor]);

  const byDay = useMemo(() => {
    const map: Record<string, EventRow[]> = {};
    for (const e of events ?? []) {
      const s = new Date(e.start_date);
      const end = new Date(e.end_date);
      for (let d = new Date(s); d <= end; d.setDate(d.getDate() + 1)) {
        const key = iso(d);
        (map[key] ??= []).push(e);
      }
    }
    return map;
  }, [events]);

  const monthLabel = anchor.toLocaleString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="mtis-card flex items-center justify-between p-4">
          <div>
            <p className="mtis-eyebrow">School LMS</p>
            <h1 className="mt-1 font-display text-xl font-bold">{monthLabel}</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mtis-card overflow-hidden p-3">
          <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {DOW.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = iso(d);
              const inMonth = d.getMonth() === anchor.getMonth();
              const list = byDay[key] ?? [];
              return (
                <div
                  key={key}
                  className={`min-h-[84px] rounded-md border border-border p-1.5 ${
                    inMonth ? "bg-surface" : "bg-background opacity-50"
                  }`}
                >
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    {d.getDate()}
                  </div>
                  <div className="mt-1 space-y-1">
                    {list.slice(0, 3).map((e) => (
                      <div
                        key={`${key}-${e.id}`}
                        className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          TONE[e.event_type] ?? TONE.other
                        }`}
                        title={e.title}
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mtis-card p-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            This month
          </h2>
          <ul className="mt-3 space-y-2">
            {(events ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">No events scheduled.</li>
            )}
            {(events ?? []).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    TONE[e.event_type] ?? TONE.other
                  }`}
                >
                  {e.event_type}
                </span>
                <span className="font-medium text-foreground">{e.title}</span>
                <span className="text-muted-foreground">
                  {formatDate(e.start_date)}
                  {e.end_date !== e.start_date ? ` – ${formatDate(e.end_date)}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
