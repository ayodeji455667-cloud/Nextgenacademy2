import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCoursesWithProgress } from "@/lib/data/courses";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, ProgressBar, Stat } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function StudentDashboard() {
  const profile = await requireRole("student");
  const courses = await getCoursesWithProgress(profile.id);
  const supabase = await createClient();
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("id, score, total, passed, created_at, quizzes(title)")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const lessonsDone = courses.reduce((n, c) => n + c.lessons.filter((l) => c.completedLessonIds.has(l.id)).length, 0);
  const certificates = courses.filter((c) => c.hasCertificate).length;
  const next = courses.find((c) => c.percent < 100);
  const nextLesson = next?.lessons.find((l) => !next.completedLessonIds.has(l.id));

  return (
    <>
      <PageHeader title={`Hello, ${profile.full_name.split(" ")[0]}!`} subtitle="Here is how you are doing." />

      {nextLesson ? (
        <div className="card mb-6 flex flex-col gap-3 border-brand-100 bg-brand-50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-brand-700">Continue learning</div>
            <div className="text-lg font-semibold">{nextLesson.title}</div>
            <div className="text-sm text-slate-600">{next?.title}</div>
          </div>
          <Link href={`/student/lessons/${nextLesson.id}`} className="btn-primary">Start lesson</Link>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Courses" value={courses.length} />
        <Stat label="Lessons completed" value={lessonsDone} />
        <Stat label="Certificates" value={certificates} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">My courses</h2>
          {courses.length === 0 ? (
            <EmptyState>No courses yet. Your school will add them soon.</EmptyState>
          ) : (
            <div className="space-y-3">
              {courses.map((c) => (
                <Link key={c.id} href={`/student/courses/${c.id}`} className="card block hover:border-brand-500">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-semibold">{c.title}</span>
                    <span className="text-sm text-slate-500">{Math.round(c.percent)}%</span>
                  </div>
                  <ProgressBar value={c.percent} />
                </Link>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent quizzes</h2>
          {(attempts ?? []).length === 0 ? (
            <EmptyState>No quizzes taken yet.</EmptyState>
          ) : (
            <ul className="card divide-y divide-slate-100 p-0">
              {(attempts ?? []).map((a) => {
                const quiz = a.quizzes as unknown as { title: string } | null;
                return (
                  <li key={a.id as string} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>{quiz?.title ?? "Quiz"}</span>
                    <span className={a.passed ? "font-semibold text-brand-700" : "text-slate-500"}>
                      {a.score as number}/{a.total as number}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
