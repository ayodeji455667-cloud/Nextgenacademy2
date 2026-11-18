"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { back, friendlyError, optStr, str } from "@/lib/redirect";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "course";
}

function int(form: FormData, key: string, fallback: number) {
  const n = Number(str(form, key));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function createCourse(form: FormData) {
  const profile = await requireRole("teacher", "admin");
  const title = str(form, "title");
  const listPage = profile.role === "admin" ? "/admin/courses" : "/teacher/content";
  if (title.length < 2) back(listPage, "error", "Give the course a title.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      // Teachers create courses for their own school; admins create platform courses.
      school_id: profile.role === "admin" ? null : profile.school_id,
      title,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      description: optStr(form, "description"),
      category: str(form, "category") || "Digital Skills",
      level: optStr(form, "level"),
      age_group: optStr(form, "age_group"),
      published: false,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) back(listPage, "error", friendlyError(error.message));
  redirect(`/manage/courses/${data.id}?ok=${encodeURIComponent("Course created. Add lessons, then publish it.")}`);
}

export async function updateCourse(form: FormData) {
  await requireRole("teacher", "admin");
  const id = str(form, "course_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      title: str(form, "title"),
      description: optStr(form, "description"),
      category: str(form, "category") || "Digital Skills",
      level: optStr(form, "level"),
      age_group: optStr(form, "age_group"),
      published: form.get("published") === "on",
    })
    .eq("id", id);
  if (error) back(`/manage/courses/${id}`, "error", friendlyError(error.message));
  revalidatePath("/", "layout");
  back(`/manage/courses/${id}`, "ok", "Course saved.");
}

export async function deleteCourse(form: FormData) {
  const profile = await requireRole("teacher", "admin");
  const id = str(form, "course_id");
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) back(`/manage/courses/${id}`, "error", friendlyError(error.message));
  back(profile.role === "admin" ? "/admin/courses" : "/teacher/content", "ok", "Course deleted.");
}

export async function createLesson(form: FormData) {
  await requireRole("teacher", "admin");
  const courseId = str(form, "course_id");
  const title = str(form, "title");
  if (title.length < 2) back(`/manage/courses/${courseId}`, "error", "Give the lesson a title.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .insert({ course_id: courseId, title, position: int(form, "position", 1), summary: optStr(form, "summary"), published: false })
    .select("id")
    .single();
  if (error) back(`/manage/courses/${courseId}`, "error", friendlyError(error.message));
  redirect(`/manage/lessons/${data.id}?ok=${encodeURIComponent("Lesson created. Add the text and video.")}`);
}

export async function updateLesson(form: FormData) {
  await requireRole("teacher", "admin");
  const id = str(form, "lesson_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({
      title: str(form, "title"),
      position: int(form, "position", 1),
      summary: optStr(form, "summary"),
      content_md: optStr(form, "content_md"),
      video_url: optStr(form, "video_url"),
      duration_minutes: optStr(form, "duration_minutes") ? int(form, "duration_minutes", 1) : null,
      ai_disclosure: optStr(form, "ai_disclosure"),
      published: form.get("published") === "on",
    })
    .eq("id", id);
  if (error) back(`/manage/lessons/${id}`, "error", friendlyError(error.message));
  revalidatePath("/", "layout");
  back(`/manage/lessons/${id}`, "ok", "Lesson saved.");
}

/** Called after the browser has uploaded a video to storage. */
export async function setLessonVideo(lessonId: string, videoPath: string | null): Promise<{ error?: string }> {
  await requireRole("teacher", "admin");
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("video_path").eq("id", lessonId).maybeSingle();
  const { error } = await supabase.from("lessons").update({ video_path: videoPath }).eq("id", lessonId);
  if (error) return { error: friendlyError(error.message) };
  // Remove the old file so storage does not fill up with replaced videos.
  const old = lesson?.video_path as string | null | undefined;
  if (old && old !== videoPath) await supabase.storage.from("lesson-videos").remove([old]);
  revalidatePath(`/manage/lessons/${lessonId}`);
  return {};
}

export async function deleteLesson(form: FormData) {
  await requireRole("teacher", "admin");
  const id = str(form, "lesson_id");
  const courseId = str(form, "course_id");
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) back(`/manage/lessons/${id}`, "error", friendlyError(error.message));
  back(`/manage/courses/${courseId}`, "ok", "Lesson deleted.");
}

export async function createQuiz(form: FormData) {
  await requireRole("teacher", "admin");
  const lessonId = str(form, "lesson_id");
  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").insert({ lesson_id: lessonId, title: str(form, "title") || "Lesson quiz", pass_mark: int(form, "pass_mark", 1) });
  if (error) back(`/manage/lessons/${lessonId}`, "error", friendlyError(error.message));
  back(`/manage/lessons/${lessonId}`, "ok", "Quiz created. Add questions below.");
}

export async function updateQuiz(form: FormData) {
  await requireRole("teacher", "admin");
  const lessonId = str(form, "lesson_id");
  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").update({ title: str(form, "title") || "Lesson quiz", pass_mark: int(form, "pass_mark", 1) }).eq("id", str(form, "quiz_id"));
  if (error) back(`/manage/lessons/${lessonId}`, "error", friendlyError(error.message));
  back(`/manage/lessons/${lessonId}`, "ok", "Quiz saved.");
}

export async function addQuestion(form: FormData) {
  await requireRole("teacher", "admin");
  const lessonId = str(form, "lesson_id");
  const quizId = str(form, "quiz_id");
  const prompt = str(form, "prompt");
  const options = [0, 1, 2, 3, 4, 5].map((i) => str(form, `option_${i}`)).filter(Boolean);
  const correct = Number(str(form, "correct_index"));
  if (!prompt) back(`/manage/lessons/${lessonId}`, "error", "Write the question.");
  if (options.length < 2) back(`/manage/lessons/${lessonId}`, "error", "Add at least two answer options.");
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) back(`/manage/lessons/${lessonId}`, "error", "Choose which option is correct.");

  const supabase = await createClient();
  const { count } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  const { data: q, error } = await supabase
    .from("quiz_questions")
    .insert({ quiz_id: quizId, prompt, options, position: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error) back(`/manage/lessons/${lessonId}`, "error", friendlyError(error.message));
  const { error: keyError } = await supabase.from("quiz_answer_keys").insert({ question_id: q.id, correct_index: correct, explanation: optStr(form, "explanation") });
  if (keyError) {
    await supabase.from("quiz_questions").delete().eq("id", q.id);
    back(`/manage/lessons/${lessonId}`, "error", friendlyError(keyError.message));
  }
  back(`/manage/lessons/${lessonId}`, "ok", "Question added.");
}

export async function deleteQuestion(form: FormData) {
  await requireRole("teacher", "admin");
  const lessonId = str(form, "lesson_id");
  const supabase = await createClient();
  const { error } = await supabase.from("quiz_questions").delete().eq("id", str(form, "question_id"));
  if (error) back(`/manage/lessons/${lessonId}`, "error", friendlyError(error.message));
  back(`/manage/lessons/${lessonId}`, "ok", "Question deleted.");
}

export async function createAssignment(form: FormData) {
  await requireRole("teacher", "admin");
  const courseId = str(form, "course_id");
  const title = str(form, "title");
  if (!title) back(`/manage/courses/${courseId}`, "error", "Give the project a title.");
  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    course_id: courseId,
    lesson_id: optStr(form, "lesson_id"),
    title,
    instructions_md: optStr(form, "instructions_md"),
    rubric_md: optStr(form, "rubric_md"),
    max_score: int(form, "max_score", 20),
  });
  if (error) back(`/manage/courses/${courseId}`, "error", friendlyError(error.message));
  back(`/manage/courses/${courseId}`, "ok", "Project added.");
}

export async function deleteAssignment(form: FormData) {
  await requireRole("teacher", "admin");
  const courseId = str(form, "course_id");
  const supabase = await createClient();
  const { error } = await supabase.from("assignments").delete().eq("id", str(form, "assignment_id"));
  if (error) back(`/manage/courses/${courseId}`, "error", friendlyError(error.message));
  back(`/manage/courses/${courseId}`, "ok", "Project deleted.");
}
