import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCoursesWithProgress } from "@/lib/data/courses";
import { createClient } from "@/lib/supabase/server";
import { claimCertificate } from "../../actions";
import { BackLink, Badge, Flash, PageHeader, ProgressBar } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function StudentCourse({ params, searchParams }: PageProps<"/student/courses/[courseId]">) {
  const { courseId } = await params;
  const sp = await searchParams;
  const profile = await requireRole("student");
  const course = (await getCoursesWithProgress(profile.id)).find((c) => c.id === courseId);
  if (!course) notFound();

  const supabase = await createClient();
  const { data: quizzes } = await supabase.from("quizzes").select("id, lesson_id").in("id", course.quizIds.length ? course.quizIds : ["00000000-0000-0000-0000-000000000000"]);
  const quizByLesson = new Map((quizzes ?? []).map((q) => [q.lesson_id as string, q.id as string]));
  const { data: cert } = await supabase.from("certificates").select("code").eq("course_id", courseId).eq("student_id", profile.id).maybeSingle();

  return (
    <>
      <BackLink href="/student/courses">All courses</BackLink>
      <PageHeader title={course.title} subtitle={course.description} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="card mb-6">
        <div className="mb-2 flex justify-between text-sm"><span>Your progress</span><span>{Math.round(course.percent)}%</span></div>
        <ProgressBar value={course.percent} />
      </div>

      <ol className="space-y-3">
        {course.lessons.map((lesson, i) => {
          const done = course.completedLessonIds.has(lesson.id);
          const quizId = quizByLesson.get(lesson.id);
          const passed = quizId ? course.passedQuizIds.has(quizId) : false;
          return (
            <li key={lesson.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {done ? "✓" : i + 1}
                </span>
                <div>
                  <div className="font-semibold">{lesson.title}</div>
                  <div className="mt-1 flex gap-2">
                    {done ? <Badge tone="green">Lesson done</Badge> : <Badge>Not started</Badge>}
                    {quizId ? passed ? <Badge tone="green">Quiz passed</Badge> : <Badge tone="amber">Quiz to do</Badge> : null}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/student/lessons/${lesson.id}`} className="btn-secondary">Open lesson</Link>
                {quizId ? <Link href={`/student/quizzes/${quizId}`} className="btn-primary">Take quiz</Link> : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="card mt-8 text-center">
        {cert ? (
          <>
            <p className="mb-3 font-semibold">🎉 You earned a certificate for this course.</p>
            <Link href={`/certificates/${cert.code}`} className="btn-primary">View certificate</Link>
          </>
        ) : course.percent >= 100 ? (
          <form action={claimCertificate}>
            <input type="hidden" name="course_id" value={course.id} />
            <p className="mb-3 font-semibold">You finished every lesson and passed every quiz!</p>
            <SubmitButton pendingText="Creating certificate…">Get my certificate</SubmitButton>
          </form>
        ) : (
          <p className="text-sm text-slate-600">Finish every lesson and pass every quiz to earn your certificate.</p>
        )}
      </div>
    </>
  );
}
