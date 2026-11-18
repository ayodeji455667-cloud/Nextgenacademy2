import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Course, Lesson } from "@/lib/types";

export type CourseProgress = Course & {
  lessons: Pick<Lesson, "id" | "title" | "position">[];
  completedLessonIds: Set<string>;
  quizIds: string[];
  passedQuizIds: Set<string>;
  percent: number;
  hasCertificate: boolean;
};

/** Courses visible to the current student (RLS decides which), with their progress. */
export async function getCoursesWithProgress(studentId: string): Promise<CourseProgress[]> {
  const supabase = await createClient();
  const [{ data: courses }, { data: lessons }, { data: progress }, { data: quizzes }, { data: attempts }, { data: certs }] =
    await Promise.all([
      supabase.from("courses").select("*").eq("published", true).order("title"),
      supabase.from("lessons").select("id, course_id, title, position").eq("published", true).order("position"),
      supabase.from("lesson_progress").select("lesson_id").eq("student_id", studentId),
      supabase.from("quizzes").select("id, lesson_id"),
      supabase.from("quiz_attempts").select("quiz_id").eq("student_id", studentId).eq("passed", true),
      supabase.from("certificates").select("course_id").eq("student_id", studentId),
    ]);

  const done = new Set((progress ?? []).map((p) => p.lesson_id as string));
  const passed = new Set((attempts ?? []).map((a) => a.quiz_id as string));
  const certCourses = new Set((certs ?? []).map((c) => c.course_id as string));
  const lessonCourse = new Map((lessons ?? []).map((l) => [l.id as string, l.course_id as string]));

  return ((courses ?? []) as Course[]).map((course) => {
    const courseLessons = (lessons ?? []).filter((l) => l.course_id === course.id) as CourseProgress["lessons"];
    const quizIds = (quizzes ?? []).filter((q) => lessonCourse.get(q.lesson_id as string) === course.id).map((q) => q.id as string);
    const steps = courseLessons.length + quizIds.length;
    const doneSteps = courseLessons.filter((l) => done.has(l.id)).length + quizIds.filter((q) => passed.has(q)).length;
    return {
      ...course,
      lessons: courseLessons,
      completedLessonIds: done,
      quizIds,
      passedQuizIds: passed,
      percent: steps === 0 ? 0 : (doneSteps / steps) * 100,
      hasCertificate: certCourses.has(course.id),
    };
  });
}

/** A playable URL for a lesson video: signed URL for uploaded files, or the external link. */
export async function getVideoSource(lesson: Pick<Lesson, "video_url" | "video_path">) {
  if (lesson.video_path) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("lesson-videos").createSignedUrl(lesson.video_path, 60 * 60 * 3);
    if (data?.signedUrl) return { kind: "file" as const, url: data.signedUrl };
  }
  if (lesson.video_url) {
    const yt = youTubeId(lesson.video_url);
    if (yt) return { kind: "youtube" as const, url: `https://www.youtube-nocookie.com/embed/${yt}` };
    return { kind: "file" as const, url: lesson.video_url };
  }
  return null;
}

function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
      return u.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}
