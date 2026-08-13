import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Save, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type StaffStatus = "present" | "absent" | "late" | "half_day" | "leave";
type AttRow = { staff_id: string; status: StaffStatus; check_in: string; check_out: string; notes: string };

const STATUS_OPTIONS: { value: StaffStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" },
];

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3.5 align-middle text-foreground ${className}`}>{children}</td>;
}

function toneClasses(s: StaffStatus) {
  switch (s) {
    case "present":
      return "border-success/30 bg-success-soft text-success";
    case "absent":
      return "border-danger/30 bg-danger-soft text-danger";
    case "late":
      return "border-warning/30 bg-warning-soft text-warning";
    default:
      return "border-primary-light/40 bg-primary-pale text-primary";
  }
}


export function StaffAttendancePanel() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(today);
  const [rows, setRows] = useState<Record<string, AttRow>>({});

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, employee_no, full_name")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["staff-attendance", date],
    enabled: !!date,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("staff_attendance")
        .select("staff_id, status, check_in, check_out, notes")
        .eq("date", date);
      if (error) throw error;
      return data as Array<{ staff_id: string; status: StaffStatus; check_in: string | null; check_out: string | null; notes: string | null }>;
    },
  });

  useEffect(() => {
    if (!staff) return;
    const map: Record<string, AttRow> = {};
    for (const s of staff) {
      map[s.id] = { staff_id: s.id, status: "present", check_in: "", check_out: "", notes: "" };
    }
    for (const e of existing ?? []) {
      if (map[e.staff_id]) {
        map[e.staff_id] = {
          staff_id: e.staff_id,
          status: e.status,
          check_in: e.check_in ?? "",
          check_out: e.check_out ?? "",
          notes: e.notes ?? "",
        };
      }
    }
    setRows(map);
  }, [staff, existing]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };
    Object.values(rows).forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);

  function setField<K extends keyof AttRow>(id: string, key: K, value: AttRow[K]) {
    setRows((r) => ({ ...r, [id]: { ...r[id], [key]: value } }));
  }
  function markAll(status: StaffStatus) {
    setRows((r) => {
      const next: Record<string, AttRow> = {};
      Object.values(r).forEach((row) => (next[row.staff_id] = { ...row, status }));
      return next;
    });
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
      const payload = Object.values(rows).map((r) => ({
        staff_id: r.staff_id,
        date,
        status: r.status,
        check_in: r.check_in || null,
        check_out: r.check_out || null,
        notes: r.notes.trim() || null,
        recorded_by: uid,
      }));
      if (!payload.length) return;
      const { error } = await (supabase as any)
        .from("staff_attendance")
        .upsert(payload, { onConflict: "staff_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff attendance saved");
      qc.invalidateQueries({ queryKey: ["staff-attendance", date] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const count = staff?.length ?? 0;

  return (
    <>
      <div className="mtis-card p-4">
        <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto]">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today} />
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => markAll("present")}>All present</Button>
            <Button variant="outline" size="sm" onClick={() => markAll("absent")}>All absent</Button>
          </div>
          <div className="flex items-end">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || count === 0}>
              <Save /> {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="success">Present: {counts.present}</Badge>
          <Badge variant="danger">Absent: {counts.absent}</Badge>
          <Badge variant="warning">Late: {counts.late}</Badge>
          <Badge>Half day: {counts.half_day}</Badge>
          <Badge>Leave: {counts.leave}</Badge>
          <span className="ml-auto text-muted-foreground">{count} active staff</span>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading staff…</div>
        ) : count === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <Users className="size-5" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No active staff found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-background">
                  <Th>Staff</Th>
                  <Th className="w-[340px]">Status</Th>
                  <Th className="w-[130px]">Check in</Th>
                  <Th className="w-[130px]">Check out</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {staff!.map((s) => {
                  const row = rows[s.id];
                  if (!row) return null;
                  return (
                    <tr key={s.id} className="border-t border-border hover:bg-primary-pale/40">
                      <Td>
                        <div className="font-medium">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground">{s.employee_no}</div>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map((opt) => {
                            const active = row.status === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setField(s.id, "status", opt.value)}
                                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                  active ? toneClasses(opt.value) : "border-border bg-background text-muted-foreground hover:bg-primary-pale/60"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </Td>
                      <Td><Input type="time" value={row.check_in} onChange={(e) => setField(s.id, "check_in", e.target.value)} /></Td>
                      <Td><Input type="time" value={row.check_out} onChange={(e) => setField(s.id, "check_out", e.target.value)} /></Td>
                      <Td><Input value={row.notes} onChange={(e) => setField(s.id, "notes", e.target.value.slice(0,200))} placeholder="Optional" /></Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

