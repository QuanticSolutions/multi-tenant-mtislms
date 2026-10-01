import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Save, Users, Clock } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffAttendancePanel } from "@/components/admin/staff-attendance-panel";
import { useMyRoles } from "@/hooks/use-role";
import { formatClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance" },
      { name: "description", content: "Record daily class roll-call attendance." },
    ],
  }),
  component: AttendancePage,
});

type AttStatus = "present" | "absent" | "late" | "excused";
type Row = { student_id: string; status: AttStatus; notes: string };

const STATUS_OPTIONS: { value: AttStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

function useAttendanceMode() {
  return useQuery({
    queryKey: ["attendance_mode"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_settings")
        .select("attendance_mode")
        .maybeSingle();
      if (error) return "per_day" as const;
      return (data?.attendance_mode as "per_day" | "per_course") ?? "per_day";
    },
  });
}

function StudentAttendancePanel() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: mode } = useAttendanceMode();
  const isPerCourse = mode === "per_course";

  const [classId, setClassId] = useState<string>("");
  const [date, setDate] = useState<string>(today);
  const [slotId, setSlotId] = useState<string>("");
  const [rows, setRows] = useState<Record<string, Row>>({});

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section, grade_level")
        .order("grade_level", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // For per_course mode: fetch the teacher's timetable slots for the selected day
  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  const { data: mySlots } = useQuery({
    queryKey: ["my-timetable-slots", date, dayOfWeek],
    enabled: isPerCourse,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, class_id, subject, period_no, start_time, end_time, room, classes(id, name, section)")
        .eq("teacher_id", uid)
        .eq("day_of_week", dayOfWeek)
        .order("period_no", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!isPerCourse && !classId && classes?.length) setClassId(classes[0].id);
  }, [classes, classId, isPerCourse]);

  useEffect(() => {
    if (isPerCourse && mySlots?.length && !slotId) setSlotId(mySlots[0].id);
  }, [mySlots, slotId, isPerCourse]);

  // Derive classId from selected slot in per_course mode
  const effectiveClassId = isPerCourse
    ? (mySlots?.find((s: any) => s.id === slotId)?.class_id ?? "")
    : classId;

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["roster", effectiveClassId],
    enabled: !!effectiveClassId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, admission_no, full_name")
        .eq("class_id", effectiveClassId)
        .eq("status", "active")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["attendance", effectiveClassId, date, slotId],
    enabled: !!effectiveClassId && !!date,
    queryFn: async () => {
      let q = supabase
        .from("attendance")
        .select("student_id, status, notes, timetable_slot_id")
        .eq("class_id", effectiveClassId)
        .eq("date", date);
      if (isPerCourse && slotId) {
        q = q.eq("timetable_slot_id", slotId);
      } else {
        q = q.is("timetable_slot_id", null);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!students) return;
    const map: Record<string, Row> = {};
    for (const s of students) {
      map[s.id] = { student_id: s.id, status: "present", notes: "" };
    }
    for (const e of existing ?? []) {
      if (map[e.student_id]) {
        map[e.student_id] = {
          student_id: e.student_id,
          status: e.status as AttStatus,
          notes: e.notes ?? "",
        };
      }
    }
    setRows(map);
  }, [students, existing]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    Object.values(rows).forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);

  function setStatus(id: string, status: AttStatus) {
    setRows((r) => ({ ...r, [id]: { ...r[id], status } }));
  }
  function setNotes(id: string, notes: string) {
    setRows((r) => ({ ...r, [id]: { ...r[id], notes } }));
  }
  function markAll(status: AttStatus) {
    setRows((r) => {
      const next: Record<string, Row> = {};
      Object.values(r).forEach((row) => (next[row.student_id] = { ...row, status }));
      return next;
    });
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!effectiveClassId || !date) throw new Error("Pick a class and date");
      const userRes = await supabase.auth.getUser();
      const uid = userRes.data.user?.id ?? null;
      const payload = Object.values(rows).map((r) => ({
        class_id: effectiveClassId,
        student_id: r.student_id,
        date,
        status: r.status,
        notes: r.notes.trim() ? r.notes.trim() : null,
        recorded_by: uid,
        timetable_slot_id: isPerCourse && slotId ? slotId : null,
      }));
      if (payload.length === 0) return;

      // Delete existing rows for this class/date/slot, then insert fresh.
      // This handles both modes cleanly without relying on raw SQL in onConflict.
      let delQ = supabase
        .from("attendance")
        .delete()
        .eq("class_id", effectiveClassId)
        .eq("date", date);
      if (isPerCourse && slotId) {
        delQ = delQ.eq("timetable_slot_id", slotId);
      } else {
        delQ = delQ.is("timetable_slot_id", null);
      }
      const { error: delErr } = await delQ;
      if (delErr) throw delErr;

      const { error } = await supabase.from("attendance").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      qc.invalidateQueries({ queryKey: ["attendance", effectiveClassId, date, slotId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save attendance"),
  });

  const isLoading = loadingStudents || loadingExisting;
  const studentCount = students?.length ?? 0;

  const selectedSlot = mySlots?.find((s: any) => s.id === slotId) as any;

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || studentCount === 0}>
          <Save /> {saveMut.isPending ? "Saving…" : "Save attendance"}
        </Button>
      </div>

      <div className="mtis-card p-4">
        {isPerCourse ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Period</label>
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {(mySlots ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      P{s.period_no} · {s.subject}
                      {s.classes ? ` — ${formatClass(s.classes.name, s.classes.section)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today} />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={() => markAll("present")}>
                All present
              </Button>
              <Button variant="outline" size="sm" onClick={() => markAll("absent")}>
                All absent
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Class</label>
              <Select value={classId} onValueChange={setClassId}>
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
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today} />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={() => markAll("present")}>
                All present
              </Button>
              <Button variant="outline" size="sm" onClick={() => markAll("absent")}>
                All absent
              </Button>
            </div>
          </div>
        )}

        {isPerCourse && selectedSlot && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-primary-pale/40 px-3 py-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {selectedSlot.start_time}–{selectedSlot.end_time}
            {selectedSlot.room ? ` · Room ${selectedSlot.room}` : ""}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Stat label="Present" value={counts.present} tone="success" />
          <Stat label="Absent" value={counts.absent} tone="danger" />
          <Stat label="Late" value={counts.late} tone="warning" />
          <Stat label="Excused" value={counts.excused} tone="default" />
          <span className="ml-auto text-muted-foreground">
            Roster: {studentCount} active student{studentCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {!effectiveClassId ? (
          <EmptyState text={isPerCourse ? "No timetable slots found for this day. Set up your timetable first." : "Select a class to begin roll call."} />
        ) : isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading roster…</div>
        ) : studentCount === 0 ? (
          <EmptyState text="No active students assigned to this class yet." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background">
                <Th>Student</Th>
                <Th className="w-[280px]">Status</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {students!.map((s) => {
                const row = rows[s.id];
                if (!row) return null;
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-primary-pale/40">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-pale text-xs font-semibold text-primary">
                          {initialsOf(s.full_name)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{s.full_name}</div>
                          <div className="text-xs text-muted-foreground">{s.admission_no}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_OPTIONS.map((opt) => {
                          const active = row.status === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setStatus(s.id, opt.value)}
                              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                active
                                  ? toneClasses(opt.value)
                                  : "border-border bg-background text-muted-foreground hover:bg-primary-pale/60"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </Td>
                    <Td>
                      <Input
                        value={row.notes}
                        onChange={(e) => setNotes(s.id, e.target.value.slice(0, 200))}
                        placeholder="Optional note"
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function AttendancePage() {
  const { isAdmin } = useMyRoles();
  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Module</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily roll call for students and staff.
        </p>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList>
          <TabsTrigger value="students">Student Attendance</TabsTrigger>
          {isAdmin && <TabsTrigger value="teachers">Teacher Attendance</TabsTrigger>}
        </TabsList>
        <TabsContent value="students" className="mt-4 space-y-6">
          <StudentAttendancePanel />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="teachers" className="mt-4 space-y-6">
            <StaffAttendancePanel />
          </TabsContent>
        )}
      </Tabs>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "danger" | "warning" | "default";
}) {
  return (
    <Badge variant={tone}>
      {label}: {value}
    </Badge>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center p-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
        <Users className="size-5" />
      </div>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3.5 align-middle text-foreground ${className}`}>{children}</td>;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toneClasses(s: AttStatus) {
  switch (s) {
    case "present":
      return "border-success/30 bg-success-soft text-success";
    case "absent":
      return "border-danger/30 bg-danger-soft text-danger";
    case "late":
      return "border-warning/30 bg-warning-soft text-warning";
    case "excused":
      return "border-primary-light/40 bg-primary-pale text-primary";
  }
}
