import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Save, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type AttStatus = "present" | "absent" | "late" | "excused";
type Row = { student_id: string; status: AttStatus; notes: string };

const STATUS_OPTIONS: { value: AttStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

export function AttendanceTab({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [slotId, setSlotId] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});

  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  const { data: mode } = useQuery({
    queryKey: ["attendance_mode"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_settings").select("attendance_mode").maybeSingle();
      if (error) return "per_day" as const;
      return (data?.attendance_mode as "per_day" | "per_course") ?? "per_day";
    },
  });

  const isPerCourse = mode === "per_course";

  const { data: mySlots } = useQuery({
    queryKey: ["attendance-slots", classId, date, dayOfWeek],
    enabled: isPerCourse && !!classId,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, subject, period_no, start_time, end_time")
        .eq("class_id", classId).eq("teacher_id", u.user?.id).eq("day_of_week", dayOfWeek)
        .order("period_no", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (isPerCourse && mySlots?.length && !slotId) setSlotId(mySlots[0].id);
  }, [mySlots, slotId, isPerCourse]);

  const { data: students } = useQuery({
    queryKey: ["attendance-roster", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, admission_no, full_name")
        .eq("class_id", classId).eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["attendance-existing", classId, date, slotId],
    enabled: !!classId && !!date,
    queryFn: async () => {
      let q = supabase.from("attendance").select("student_id, status, notes").eq("class_id", classId).eq("date", date);
      if (isPerCourse && slotId) q = q.eq("timetable_slot_id", slotId);
      else q = q.is("timetable_slot_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!students) return;
    const map: Record<string, Row> = {};
    for (const s of students) map[s.id] = { student_id: s.id, status: "present", notes: "" };
    for (const e of existing ?? []) {
      if (map[e.student_id]) map[e.student_id] = { student_id: e.student_id, status: e.status as AttStatus, notes: e.notes ?? "" };
    }
    setRows(map);
  }, [students, existing]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    Object.values(rows).forEach(r => (c[r.status] += 1));
    return c;
  }, [rows]);

  function setStatus(id: string, status: AttStatus) { setRows(r => ({ ...r, [id]: { ...r[id], status } })); }
  function markAll(status: AttStatus) {
    setRows(r => { const next: Record<string, Row> = {}; Object.values(r).forEach(row => (next[row.student_id] = { ...row, status })); return next; });
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const payload = Object.values(rows).map(r => ({
        class_id: classId, student_id: r.student_id, date, status: r.status,
        notes: r.notes.trim() || null, recorded_by: u.user?.id,
        timetable_slot_id: isPerCourse && slotId ? slotId : null,
      }));
      if (!payload.length) return;
      let delQ = supabase.from("attendance").delete().eq("class_id", classId).eq("date", date);
      if (isPerCourse && slotId) delQ = delQ.eq("timetable_slot_id", slotId);
      else delQ = delQ.is("timetable_slot_id", null);
      const { error: delErr } = await delQ;
      if (delErr) throw delErr;
      const { error } = await supabase.from("attendance").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Attendance saved"); qc.invalidateQueries({ queryKey: ["attendance-existing", classId, date, slotId] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const studentCount = students?.length ?? 0;
  const slots = mySlots ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || studentCount === 0}>
          <Save className="mr-2 size-4" /> {saveMut.isPending ? "Saving…" : "Save attendance"}
        </Button>
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {isPerCourse && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Period</label>
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  {slots.map(s => (
                    <SelectItem key={s.id} value={s.id}>P{s.period_no} · {s.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} max={today} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll("present")}>All present</Button>
            <Button variant="outline" size="sm" onClick={() => markAll("absent")}>All absent</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="success">Present: {counts.present}</Badge>
          <Badge variant="destructive">Absent: {counts.absent}</Badge>
          <Badge variant="warning">Late: {counts.late}</Badge>
          <Badge variant="outline">Excused: {counts.excused}</Badge>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {studentCount === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary"><Users className="size-5" /></div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">No active students in this class.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background">
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[280px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {students!.map(s => {
                const row = rows[s.id];
                if (!row) return null;
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-primary-pale/40">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid size-8 place-items-center rounded-full bg-primary-pale text-xs font-semibold text-primary">
                          {s.full_name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{s.full_name}</div>
                          <div className="text-xs text-muted-foreground">{s.admission_no}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_OPTIONS.map(opt => {
                          const active = row.status === opt.value;
                          return (
                            <button key={opt.value} type="button" onClick={() => setStatus(s.id, opt.value)}
                              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${active ? toneClasses(opt.value) : "border-border bg-background text-muted-foreground hover:bg-primary-pale/60"}`}>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function toneClasses(s: AttStatus) {
  switch (s) {
    case "present": return "border-success/30 bg-success-soft text-success";
    case "absent": return "border-danger/30 bg-danger-soft text-danger";
    case "late": return "border-warning/30 bg-warning-soft text-warning";
    case "excused": return "border-primary-light/40 bg-primary-pale text-primary";
  }
}
