"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { back, friendlyError, str } from "@/lib/redirect";
import type { QuizResult } from "@/lib/types";

export async function markLessonComplete(form: FormData) {
  const profile = await requireRole("student");
  const lessonId = str(form, "lesson_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("lesson_progress")
    .upsert({ student_id: profile.id, lesson_id: lessonId, school_id: profile.school_id }, { onConflict: "student_id,lesson_id", ignoreDuplicates: true });
  if (error) back(`/student/lessons/${lessonId}`, "error", friendlyError(error.message));
  revalidatePath("/student", "layout");
  back(`/student/lessons/${lessonId}`, "ok", "Lesson marked as complete. Well done!");
}

export async function submitQuiz(quizId: string, answers: Record<string, number>): Promise<{ result?: QuizResult; error?: string }> {
  await requireRole("student");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz", { target_quiz: quizId, answers });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/student", "layout");
  return { result: data as QuizResult };
}

export async function submitAssignment(input: { assignmentId: string; textResponse: string; filePath: string | null }): Promise<{ error?: string }> {
  const profile = await requireRole("student");
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, graded_at, file_path")
    .eq("assignment_id", input.assignmentId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (existing?.graded_at) return { error: "This work has already been marked." };

  const row = {
    text_response: input.textResponse.trim() || null,
    file_path: input.filePath ?? (existing?.file_path as string | null) ?? null,
    submitted_at: new Date().toISOString(),
  };
  if (!row.text_response && !row.file_path) return { error: "Add some text or a photo before submitting." };

  const { error } = existing
    ? await supabase.from("submissions").update(row).eq("id", existing.id)
    : await supabase.from("submissions").insert({ ...row, assignment_id: input.assignmentId, student_id: profile.id, school_id: profile.school_id });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath(`/student/assignments/${input.assignmentId}`);
  return {};
}

export async function claimCertificate(form: FormData) {
  await requireRole("student");
  const courseId = str(form, "course_id");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_certificate", { target_course: courseId });
  if (error) back(`/student/courses/${courseId}`, "error", friendlyError(error.message));
  revalidatePath("/student", "layout");
  redirect(`/certificates/${(data as { code: string }).code}`);
}
