import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getVideoSource } from "@/lib/data/courses";
import { createClient } from "@/lib/supabase/server";
import type { Lesson } from "@/lib/types";
import { markLessonComplete } from "../../actions";
import { BackLink, Flash } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { SubmitButton } from "@/components/submit-button";
import { VideoPlayer } from "@/components/video-player";

export default async function LessonPage({ params, searchParams }: PageProps<"/student/lessons/[lessonId]">) {
  const { lessonId } = await params;
  const sp = await searchParams;
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (!data) notFound();
  const lesson = data as Lesson;

  const [{ data: course }, { data: progress }, { data: quiz }, { data: assignments }, video] = await Promise.all([
    supabase.from("courses").select("id, title").eq("id", lesson.course_id).maybeSingle(),
    supabase.from("lesson_progress").select("completed_at").eq("lesson_id", lessonId).eq("student_id", profile.id).maybeSingle(),
    supabase.from("quizzes").select("id, title, pass_mark").eq("lesson_id", lessonId).maybeSingle(),
    supabase.from("assignments").select("id, title").eq("lesson_id", lessonId),
    getVideoSource(lesson),
  ]);

  return (
    <article className="mx-auto max-w-3xl">
      <BackLink href={`/student/courses/${lesson.course_id}`}>{course?.title ?? "Course"}</BackLink>
      <h1 className="mb-1 text-2xl font-bold">{lesson.title}</h1>
      {lesson.summary ? <p className="mb-5 text-slate-600">{lesson.summary}</p> : null}
      <Flash ok={sp.ok} error={sp.error} />

      <VideoPlayer source={video} title={lesson.title} />
      {lesson.ai_disclosure ? <p className="mt-2 text-xs text-slate-500">ℹ️ {lesson.ai_disclosure}</p> : null}

      <div className="card mt-6">
        <Markdown>{lesson.content_md}</Markdown>
      </div>

      <div className="card mt-6 flex flex-col gap-4">
        {progress ? (
          <p className="font-medium text-brand-700">✓ You completed this lesson.</p>
        ) : (
          <form action={markLessonComplete}>
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <SubmitButton pendingText="Saving…">I have finished this lesson</SubmitButton>
          </form>
        )}
        <div className="flex flex-wrap gap-2">
          {quiz ? <Link href={`/student/quizzes/${quiz.id}`} className="btn-primary">Take the quiz (pass mark {quiz.pass_mark})</Link> : null}
          {(assignments ?? []).map((a) => (
            <Link key={a.id as string} href={`/student/assignments/${a.id}`} className="btn-secondary">Project: {a.title as string}</Link>
          ))}
        </div>
      </div>
    </article>
  );
}
