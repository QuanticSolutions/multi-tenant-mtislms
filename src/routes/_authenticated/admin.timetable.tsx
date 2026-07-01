import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — MTIS" },
      { name: "description", content: "Weekly class period grid with teacher allocation and conflict detection." },
    ],
  }),
  component: TimetablePage,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_INDEX = [1, 2, 3, 4, 5, 6]; // 0=Sun unused

type Slot = {
  id: string;
  class_id: string;
  teacher_id: string | null;
  subject: string;
  day_of_week: number;
  period_no: number;
  start_time: string;
  end_time: string;
  room: string | null;
};

type EditingSlot = Partial<Slot> & { day_of_week: number; period_no: number };

function TimetablePage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState<string>("");
  const [periodsCount, setPeriodsCount] = useState<number>(8);
  const [editing, setEditing] = useState<EditingSlot | null>(null);

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

  const { data: teachers } = useQuery({
    queryKey: ["teachers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, specialization")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!classId && classes?.length) setClassId(classes[0].id);
  }, [classes, classId]);

  const { data: classSlots } = useQuery({
    queryKey: ["timetable", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("*")
        .eq("class_id", classId);
      if (error) throw error;
      return data as Slot[];
    },
  });

  // All slots across all classes -> used for teacher conflict indicators
  const { data: allSlots } = useQuery({
    queryKey: ["timetable-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, class_id, teacher_id, day_of_week, period_no");
      if (error) throw error;
      return data as Pick<Slot, "id" | "class_id" | "teacher_id" | "day_of_week" | "period_no">[];
    },
  });

  const grid = useMemo(() => {
    const map = new Map<string, Slot>();
    (classSlots ?? []).forEach((s) => map.set(`${s.day_of_week}-${s.period_no}`, s));
    return map;
  }, [classSlots]);

  const teacherBookings = useMemo(() => {
    // key: teacherId|day|period -> count across classes
    const m = new Map<string, number>();
    (allSlots ?? []).forEach((s) => {
      if (!s.teacher_id) return;
      const k = `${s.teacher_id}|${s.day_of_week}|${s.period_no}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [allSlots]);

  const teacherName = (id: string | null | undefined) =>
    teachers?.find((t) => t.id === id)?.full_name ?? "";

  const saveSlot = useMutation({
    mutationFn: async (payload: EditingSlot) => {
      if (!classId) throw new Error("Select a class first");
      const row = {
        class_id: classId,
        teacher_id: payload.teacher_id || null,
        subject: (payload.subject ?? "").trim(),
        day_of_week: payload.day_of_week,
        period_no: payload.period_no,
        start_time: payload.start_time!,
        end_time: payload.end_time!,
        room: payload.room?.trim() || null,
      };
      if (!row.subject) throw new Error("Subject is required");
      if (!row.start_time || !row.end_time) throw new Error("Start and end time are required");

      if (payload.id) {
        const { error } = await supabase
          .from("timetable_slots")
          .update(row)
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("timetable_slots").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timetable", classId] });
      qc.invalidateQueries({ queryKey: ["timetable-all"] });
      setEditing(null);
      toast.success("Slot saved");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (/timetable_unique_teacher_slot/i.test(msg)) {
        toast.error("Teacher is already booked in another class at this time");
      } else if (/timetable_unique_class_slot/i.test(msg)) {
        toast.error("This class already has a period at that slot");
      } else if (/timetable_end_after_start/i.test(msg)) {
        toast.error("End time must be after start time");
      } else {
        toast.error(msg);
      }
    },
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timetable", classId] });
      qc.invalidateQueries({ queryKey: ["timetable-all"] });
      setEditing(null);
      toast.success("Slot removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const conflictCount = useMemo(() => {
    if (!classSlots) return 0;
    let n = 0;
    for (const s of classSlots) {
      if (!s.teacher_id) continue;
      const k = `${s.teacher_id}|${s.day_of_week}|${s.period_no}`;
      if ((teacherBookings.get(k) ?? 0) > 1) n++;
    }
    return n;
  }, [classSlots, teacherBookings]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Academics</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Timetable
          </h1>
          <p className="text-sm text-muted-foreground">
            Build a weekly period grid per class. Teacher clashes are blocked automatically.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-56">
            <Label className="text-xs text-muted-foreground">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {(classes ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.section ? `— ${c.section}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Label className="text-xs text-muted-foreground">Periods</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={periodsCount}
              onChange={(e) => setPeriodsCount(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatTile icon={<CalendarDays className="size-4" />} label="Filled slots" value={String(classSlots?.length ?? 0)} />
        <StatTile
          icon={<AlertTriangle className="size-4" />}
          label="Teacher conflicts"
          value={String(conflictCount)}
          tone={conflictCount ? "warn" : "default"}
        />
        <StatTile
          icon={<CalendarDays className="size-4" />}
          label="Empty cells"
          value={String(Math.max(0, DAYS.length * periodsCount - (classSlots?.length ?? 0)))}
        />
      </div>

      <div className="mtis-card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-primary-pale text-left">
              <th className="w-24 border-b border-border p-2 text-xs uppercase tracking-wider text-muted-foreground">
                Period
              </th>
              {DAYS.map((d) => (
                <th key={d} className="border-b border-l border-border p-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periodsCount }, (_, i) => i + 1).map((period) => (
              <tr key={period} className="align-top">
                <td className="border-b border-border p-2 font-semibold text-foreground">
                  P{period}
                </td>
                {DAY_INDEX.map((day) => {
                  const s = grid.get(`${day}-${period}`);
                  const conflict = s?.teacher_id
                    ? (teacherBookings.get(`${s.teacher_id}|${day}|${period}`) ?? 0) > 1
                    : false;
                  return (
                    <td
                      key={day}
                      className="border-b border-l border-border p-1 align-top"
                    >
                      <button
                        onClick={() =>
                          setEditing(
                            s
                              ? { ...s }
                              : {
                                  day_of_week: day,
                                  period_no: period,
                                  start_time: defaultStart(period),
                                  end_time: defaultEnd(period),
                                  subject: "",
                                },
                          )
                        }
                        disabled={!classId}
                        className={`group flex min-h-[76px] w-full flex-col items-start gap-1 rounded-md border p-2 text-left transition-colors ${
                          s
                            ? conflict
                              ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                              : "border-primary-light/40 bg-primary-pale/40 hover:bg-primary-pale"
                            : "border-dashed border-border bg-background hover:border-primary/40 hover:bg-primary-pale/40"
                        }`}
                      >
                        {s ? (
                          <>
                            <div className="flex w-full items-center justify-between gap-2">
                              <span className="font-semibold text-foreground">{s.subject}</span>
                              {conflict && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Clash
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {teacherName(s.teacher_id) || "Unassigned"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                              {s.room ? ` · ${s.room}` : ""}
                            </span>
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            <Plus className="size-3.5" /> Add
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit period" : "Add period"} — {DAYS[(editing?.day_of_week ?? 1) - 1]} P{editing?.period_no}
            </DialogTitle>
            <DialogDescription>
              Assign a subject, teacher and time. Teacher clashes across classes are blocked.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <Label>Subject</Label>
                <Input
                  value={editing.subject ?? ""}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                  placeholder="Mathematics"
                />
              </div>
              <div>
                <Label>Teacher</Label>
                <Select
                  value={editing.teacher_id ?? "none"}
                  onValueChange={(v) => setEditing({ ...editing, teacher_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {(teachers ?? []).map((t) => {
                      const busy =
                        (teacherBookings.get(`${t.id}|${editing.day_of_week}|${editing.period_no}`) ?? 0) > 0 &&
                        t.id !== editing.teacher_id;
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name}
                          {t.specialization ? ` · ${t.specialization}` : ""}
                          {busy ? "  (busy)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={editing.start_time ?? ""}
                    onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End</Label>
                  <Input
                    type="time"
                    value={editing.end_time ?? ""}
                    onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Room (optional)</Label>
                <Input
                  value={editing.room ?? ""}
                  onChange={(e) => setEditing({ ...editing, room: e.target.value })}
                  placeholder="Room 12"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {editing?.id && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteSlot.mutate(editing.id!)}
                  disabled={deleteSlot.isPending}
                >
                  <Trash2 className="mr-1 size-4" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => editing && saveSlot.mutate(editing)}
                disabled={saveSlot.isPending}
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={`mtis-card flex items-center gap-3 p-4 ${
        tone === "warn" && value !== "0" ? "border-destructive/40 bg-destructive/5" : ""
      }`}
    >
      <div className="grid size-9 place-items-center rounded-md bg-primary-pale text-primary">
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-lg font-bold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function defaultStart(period: number) {
  const startHour = 8 + (period - 1);
  return `${String(startHour).padStart(2, "0")}:00`;
}
function defaultEnd(period: number) {
  const endHour = 8 + (period - 1);
  return `${String(endHour).padStart(2, "0")}:45`;
}
