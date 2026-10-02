import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarCheck, ClipboardList, GraduationCap } from "lucide-react";

import { AppShell } from "@/components/admin/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatClass } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/teacher")({
  head: () => ({
    meta: [
      { title: "My Courses" },
      { name: "description", content: "Your assigned classes and subjects." },
    ],
  }),
  component: TeacherDashboardPage,
});

type CourseCard = {
  class_id: string;
  subject: string;
  class_name: string;
  class_section: string | null;
};

function TeacherDashboardPage() {
  const { data: me } = useQuery({
    queryKey: ["teacher-me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      return u.user;
    },
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["my-courses", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("class_id, subject, classes(id, name, section)")
        .eq("teacher_id", me!.id)
        .order("subject");
      if (error) throw error;
      const seen = new Set<string>();
      return (data ?? [])
        .filter((s: any) => {
          const key = `${s.class_id}-${s.subject}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((s: any) => ({
          class_id: s.class_id,
          subject: s.subject,
          class_name: s.classes?.name ?? "",
          class_section: s.classes?.section ?? null,
        })) as CourseCard[];
    },
  });

  // Check if teacher is a class teacher for any class (per_day attendance)
  const { data: classTeacherOf } = useQuery({
    queryKey: ["my-class-teacher-classes", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, section")
        .eq("class_teacher_id", me!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const courseList = courses ?? [];

  return (
    <AppShell>
      <div>
        <p className="mtis-eyebrow">Teacher</p>
        <h1 className="mt-1 font-display text-2xl font-bold">My Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your assigned classes and subjects from the timetable.
        </p>
      </div>

      {isLoading ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : courseList.length === 0 && (classTeacherOf ?? []).length === 0 ? (
        <div className="mtis-card p-8 text-center text-sm text-muted-foreground">
          You have no courses assigned yet. Ask an admin to add you to the timetable.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(classTeacherOf ?? []).map((c) => (
            <Link
              key={`ct-${c.id}`}
              to="/admin/teacher/course"
              search={{ classId: c.id, subject: "" }}
              className="mtis-card group p-4 transition-colors hover:border-primary"
            >
              <div className="flex items-center gap-2">
                <CalendarCheck className="size-5 text-primary" />
                <div>
                  <p className="font-display text-sm font-semibold">{formatClass(c.name, c.section)}</p>
                  <p className="text-xs text-muted-foreground">Class Attendance</p>
                </div>
              </div>
              <Badge variant="outline" className="mt-2 bg-primary-pale text-primary">Class Teacher</Badge>
            </Link>
          ))}

          {courseList.map((c) => (
            <Link
              key={`${c.class_id}-${c.subject}`}
              to="/admin/teacher/course"
              search={{ classId: c.class_id, subject: c.subject }}
              className="mtis-card group p-4 transition-colors hover:border-primary"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                <div>
                  <p className="font-display text-sm font-semibold">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">{formatClass(c.class_name, c.class_section)}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                Open course <ClipboardList className="size-3" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
