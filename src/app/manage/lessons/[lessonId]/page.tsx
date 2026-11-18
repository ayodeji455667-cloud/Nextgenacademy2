import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Lesson, QuizQuestion } from "@/lib/types";
import { addQuestion, createQuiz, deleteLesson, deleteQuestion, updateLesson, updateQuiz } from "../../actions";
import { BackLink, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { VideoUpload } from "./video-upload";

export default async function ManageLesson({ params, searchParams }: PageProps<"/manage/lessons/[lessonId]">) {
  const { lessonId } = await params;
  const sp = await searchParams;
  await requireRole("teacher", "admin");
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (!data) notFound();
  const lesson = data as Lesson;
  const { data: quiz } = await supabase.from("quizzes").select("id, title, pass_mark").eq("lesson_id", lessonId).maybeSingle();
  const { data: questions } = quiz
    ? await supabase.from("quiz_questions").select("id, quiz_id, position, prompt, options").eq("quiz_id", quiz.id).order("position")
    : { data: [] };
  const questionIds = (questions ?? []).map((q) => q.id as string);
  const { data: keys } = questionIds.length
    ? await supabase.from("quiz_answer_keys").select("question_id, correct_index, explanation").in("question_id", questionIds)
    : { data: [] };
  const keyMap = new Map((keys ?? []).map((k) => [k.question_id as string, k as { correct_index: number; explanation: string | null }]));

  return (
    <>
      <BackLink href={`/manage/courses/${lesson.course_id}`}>Back to course</BackLink>
      <h1 className="mb-4 text-2xl font-bold">{lesson.title}</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-5">
        <form action={updateLesson} className="card space-y-3 lg:col-span-3">
          <h2 className="font-semibold">Lesson</h2>
          <input type="hidden" name="lesson_id" value={lessonId} />
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-3"><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" defaultValue={lesson.title} required /></div>
            <div><label className="label" htmlFor="position">Order</label><input className="input" id="position" name="position" type="number" min={1} defaultValue={lesson.position} /></div>
          </div>
          <div><label className="label" htmlFor="summary">Short summary</label><textarea className="input" id="summary" name="summary" defaultValue={lesson.summary ?? ""} /></div>
          <div>
            <label className="label" htmlFor="content_md">Lesson text (Markdown: ## headings, **bold**, - lists, tables)</label>
            <textarea className="input min-h-80 font-mono text-sm" id="content_md" name="content_md" defaultValue={lesson.content_md ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="video_url">Video link (YouTube or other URL), used if no file is uploaded</label>
            <input className="input" id="video_url" name="video_url" type="url" defaultValue={lesson.video_url ?? ""} placeholder="https://www.youtube.com/watch?v=…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="duration_minutes">Length (minutes)</label><input className="input" id="duration_minutes" name="duration_minutes" type="number" min={1} defaultValue={lesson.duration_minutes ?? ""} /></div>
            <div><label className="label" htmlFor="ai_disclosure">AI disclosure note</label><input className="input" id="ai_disclosure" name="ai_disclosure" defaultValue={lesson.ai_disclosure ?? ""} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={lesson.published} /> Published (visible to students)</label>
          <SubmitButton>Save lesson</SubmitButton>
        </form>

        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="mb-2 font-semibold">Video file</h2>
            <VideoUpload lessonId={lessonId} courseId={lesson.course_id} currentPath={lesson.video_path} />
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Quiz</h2>
            {!quiz ? (
              <form action={createQuiz} className="space-y-3">
                <input type="hidden" name="lesson_id" value={lessonId} />
                <div><label className="label" htmlFor="q-title">Quiz title</label><input className="input" id="q-title" name="title" defaultValue={`${lesson.title} quiz`} /></div>
                <div><label className="label" htmlFor="q-pass">Pass mark (number of correct answers)</label><input className="input" id="q-pass" name="pass_mark" type="number" min={1} defaultValue={7} /></div>
                <SubmitButton>Create quiz</SubmitButton>
              </form>
            ) : (
              <>
                <form action={updateQuiz} className="grid grid-cols-3 gap-2">
                  <input type="hidden" name="lesson_id" value={lessonId} />
                  <input type="hidden" name="quiz_id" value={quiz.id as string} />
                  <input className="input col-span-2" name="title" defaultValue={quiz.title as string} aria-label="Quiz title" />
                  <input className="input" name="pass_mark" type="number" min={1} defaultValue={quiz.pass_mark as number} aria-label="Pass mark" />
                  <div className="col-span-3"><SubmitButton className="btn-secondary">Save quiz settings</SubmitButton></div>
                </form>
                <ol className="space-y-3">
                  {((questions ?? []) as QuizQuestion[]).map((q, i) => {
                    const key = keyMap.get(q.id);
                    return (
                      <li key={q.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <div className="font-medium">{i + 1}. {q.prompt}</div>
                        <ul className="mt-1 space-y-0.5">
                          {q.options.map((o, oi) => (
                            <li key={oi} className={key?.correct_index === oi ? "font-semibold text-brand-700" : "text-slate-600"}>
                              {String.fromCharCode(65 + oi)}) {o} {key?.correct_index === oi ? "✓" : ""}
                            </li>
                          ))}
                        </ul>
                        {key?.explanation ? <p className="mt-1 text-xs text-slate-500">{key.explanation}</p> : null}
                        <form action={deleteQuestion} className="mt-1">
                          <input type="hidden" name="lesson_id" value={lessonId} />
                          <input type="hidden" name="question_id" value={q.id} />
                          <button className="text-xs text-red-700 underline">Delete</button>
                        </form>
                      </li>
                    );
                  })}
                </ol>
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-brand-700">Add a question</summary>
                  <form action={addQuestion} className="mt-3 space-y-2">
                    <input type="hidden" name="lesson_id" value={lessonId} />
                    <input type="hidden" name="quiz_id" value={quiz.id as string} />
                    <textarea className="input" name="prompt" placeholder="Question" required />
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="radio" name="correct_index" value={i} required aria-label={`Option ${String.fromCharCode(65 + i)} is correct`} />
                        <input className="input" name={`option_${i}`} placeholder={`Option ${String.fromCharCode(65 + i)}${i > 1 ? " (optional)" : ""}`} required={i < 2} />
                      </div>
                    ))}
                    <p className="text-xs text-slate-500">Tick the circle next to the correct answer.</p>
                    <textarea className="input" name="explanation" placeholder="Explanation shown after answering" />
                    <SubmitButton>Add question</SubmitButton>
                  </form>
                </details>
              </>
            )}
          </div>

          <form action={deleteLesson} className="text-center">
            <input type="hidden" name="lesson_id" value={lessonId} />
            <input type="hidden" name="course_id" value={lesson.course_id} />
            <button className="text-sm text-red-700 underline">Delete this lesson</button>
          </form>
        </div>
      </div>
    </>
  );
}
