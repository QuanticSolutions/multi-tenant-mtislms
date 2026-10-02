import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";

import { AppShell } from "@/components/admin/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatClass } from "@/lib/format";

import { AssignmentsTab } from "@/components/teacher/assignments-tab";
import { QuestionBankTab } from "@/components/teacher/question-bank-tab";
import { QuizzesTab } from "@/components/teacher/quizzes-tab";
import { PaperGenTab } from "@/components/teacher/paper-gen-tab";
import { GradebookTab } from "@/components/teacher/gradebook-tab";
import { AttendanceTab } from "@/components/teacher/attendance-tab";

export const Route = createFileRoute("/_authenticated/admin/teacher/course")({
  head: () => ({
    meta: [{ title: "Course" }],
  }),
  component: CourseDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    classId: (search.classId as string) ?? "",
    subject: (search.subject as string) ?? "",
  }),
});

function CourseDetailPage() {
  const { classId, subject } = Route.useSearch();
  const isAttendanceOnly = !subject;

  const { data: classInfo } = useQuery({
    queryKey: ["class-info", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section")
        .eq("id", classId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const title = isAttendanceOnly
    ? formatClass(classInfo?.name, classInfo?.section)
    : `${formatClass(classInfo?.name, classInfo?.section)} — ${subject}`;

  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Course</p>
        <h1 className="mt-1 font-display text-2xl font-bold">{title}</h1>
      </div>

      <Tabs defaultValue={isAttendanceOnly ? "attendance" : "roster"} className="w-full">
        <TabsList className="flex-wrap">
          {!isAttendanceOnly && <TabsTrigger value="roster">Roster</TabsTrigger>}
          {!isAttendanceOnly && <TabsTrigger value="assignments">Assignments</TabsTrigger>}
          {!isAttendanceOnly && <TabsTrigger value="qb">Question Bank</TabsTrigger>}
          {!isAttendanceOnly && <TabsTrigger value="quizzes">Quizzes</TabsTrigger>}
          {!isAttendanceOnly && <TabsTrigger value="papers">Paper Gen</TabsTrigger>}
          {!isAttendanceOnly && <TabsTrigger value="gradebook">Gradebook</TabsTrigger>}
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        {!isAttendanceOnly && (
          <TabsContent value="roster" className="mt-4">
            <RosterTab classId={classId} />
          </TabsContent>
        )}
        {!isAttendanceOnly && (
          <TabsContent value="assignments" className="mt-4">
            <AssignmentsTab classId={classId} subject={subject} />
          </TabsContent>
        )}
        {!isAttendanceOnly && (
          <TabsContent value="qb" className="mt-4">
            <QuestionBankTab classId={classId} subject={subject} />
          </TabsContent>
        )}
        {!isAttendanceOnly && (
          <TabsContent value="quizzes" className="mt-4">
            <QuizzesTab classId={classId} subject={subject} />
          </TabsContent>
        )}
        {!isAttendanceOnly && (
          <TabsContent value="papers" className="mt-4">
            <PaperGenTab classId={classId} subject={subject} />
          </TabsContent>
        )}
        {!isAttendanceOnly && (
          <TabsContent value="gradebook" className="mt-4">
            <GradebookTab classId={classId} subject={subject} />
          </TabsContent>
        )}
        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab classId={classId} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function RosterTab({ classId }: { classId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["course-roster", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, admission_no, full_name, gender")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!data?.length) return <div className="mtis-card p-8 text-center text-sm text-muted-foreground">No active students.</div>;

  return (
    <div className="mtis-card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-background">
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Admission No</th>
            <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gender</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="px-6 py-3.5 text-foreground">{s.full_name}</td>
              <td className="px-6 py-3.5 text-muted-foreground">{s.admission_no}</td>
              <td className="px-6 py-3.5 text-muted-foreground">{s.gender ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
