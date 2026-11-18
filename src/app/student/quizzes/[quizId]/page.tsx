import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { QuizQuestion } from "@/lib/types";
import { BackLink } from "@/components/ui";
import { QuizForm } from "./quiz-form";

export default async function QuizPage({ params }: PageProps<"/student/quizzes/[quizId]">) {
  const { quizId } = await params;
  const profile = await requireRole("student");
  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("id, title, pass_mark, lesson_id").eq("id", quizId).maybeSingle();
  if (!quiz) notFound();

  // Questions only: answer keys are not readable by students.
  const [{ data: questions }, { data: best }] = await Promise.all([
    supabase.from("quiz_questions").select("id, quiz_id, position, prompt, options").eq("quiz_id", quizId).order("position"),
    supabase.from("quiz_attempts").select("score, total, passed").eq("quiz_id", quizId).eq("student_id", profile.id).order("score", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={`/student/lessons/${quiz.lesson_id}`}>Back to lesson</BackLink>
      <h1 className="text-2xl font-bold">{quiz.title as string}</h1>
      <p className="mb-6 text-slate-600">
        {(questions ?? []).length} questions · pass mark {quiz.pass_mark as number}
        {best ? ` · your best score: ${best.score}/${best.total}` : ""}
      </p>
      <QuizForm quizId={quizId} lessonId={quiz.lesson_id as string} questions={(questions ?? []) as QuizQuestion[]} />
    </div>
  );
}
