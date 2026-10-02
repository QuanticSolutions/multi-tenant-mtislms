import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export function GradebookTab({ classId, subject }: { classId: string; subject: string }) {
  const { data: students } = useQuery({
    queryKey: ["course-roster", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_no")
        .eq("class_id", classId).eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: homework } = useQuery({
    queryKey: ["gb-homework", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework")
        .select("id, title, max_marks")
        .eq("class_id", classId).eq("subject", subject)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["gb-submissions", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const hwIds = (homework ?? []).map(h => h.id);
      if (!hwIds.length) return [];
      const { data, error } = await supabase
        .from("homework_submissions")
        .select("student_id, homework_id, marks, status")
        .in("homework_id", hwIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!homework?.length,
  });

  const { data: quizzes } = useQuery({
    queryKey: ["gb-quizzes", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, total_marks")
        .eq("class_id", classId).eq("subject", subject)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["gb-attempts", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const qIds = (quizzes ?? []).map(q => q.id);
      if (!qIds.length) return [];
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("student_id, quiz_id, score, max_score, status")
        .in("quiz_id", qIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!quizzes?.length,
  });

  const { data: exams } = useQuery({
    queryKey: ["gb-exams", classId, subject],
    enabled: !!classId && !!subject,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("student_id, marks_obtained, exam_id, exams(title, total_marks)")
        .in("exam_id", (
          await supabase.from("exams").select("id").eq("class_id", classId).eq("subject", subject)
        ).data?.map((e: any) => e.id) ?? []);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!classId && !!subject,
  });

  const roster = students ?? [];
  const hwList = homework ?? [];
  const quizList = quizzes ?? [];
  const subMap = new Map<string, Map<string, number>>();
  (submissions ?? []).forEach((s: any) => {
    if (!subMap.has(s.student_id)) subMap.set(s.student_id, new Map());
    if (s.marks != null) subMap.get(s.student_id)!.set(s.homework_id, Number(s.marks));
  });
  const attemptMap = new Map<string, Map<string, { score: number; max: number }>>();
  (attempts ?? []).forEach((a: any) => {
    if (!attemptMap.has(a.student_id)) attemptMap.set(a.student_id, new Map());
    if (a.score != null) attemptMap.get(a.student_id)!.set(a.quiz_id, { score: Number(a.score), max: Number(a.max_score) });
  });
  const examMap = new Map<string, Map<string, number>>();
  (exams ?? []).forEach((e: any) => {
    if (!examMap.has(e.student_id)) examMap.set(e.student_id, new Map());
    if (e.marks_obtained != null) examMap.get(e.student_id)!.set(e.exam_id, Number(e.marks_obtained));
  });

  const allCols = [
    ...hwList.map(h => ({ kind: "hw" as const, id: h.id, label: h.title, max: h.max_marks })),
    ...quizList.map(q => ({ kind: "quiz" as const, id: q.id, label: q.title, max: q.total_marks })),
  ];

  if (roster.length === 0) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">No active students.</div>;
  if (allCols.length === 0) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">No graded assignments or quizzes yet.</div>;

  return (
    <div className="mtis-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background">
            <th className="sticky left-0 z-10 bg-background px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
            {allCols.map((c) => (
              <th key={`${c.kind}-${c.id}`} className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" title={c.label}>
                {c.label.length > 15 ? c.label.slice(0, 13) + "…" : c.label}
                <div className="font-normal text-muted-foreground">/{c.max}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roster.map((s) => (
            <tr key={s.id} className="border-t border-border hover:bg-primary-pale/40">
              <td className="sticky left-0 z-10 bg-background px-4 py-3 text-foreground">
                <div className="font-medium">{s.full_name}</div>
                <div className="text-xs text-muted-foreground">{s.admission_no}</div>
              </td>
              {allCols.map((c) => {
                let val: string = "—";
                if (c.kind === "hw") {
                  const m = subMap.get(s.id)?.get(c.id);
                  if (m != null) val = `${m}`;
                } else {
                  const a = attemptMap.get(s.id)?.get(c.id);
                  if (a) val = `${a.score}`;
                }
                return <td key={`${c.kind}-${c.id}`} className="px-3 py-3 text-center text-foreground">{val}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
