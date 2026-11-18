"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { QuizQuestion, QuizResult } from "@/lib/types";
import { submitQuiz } from "../../actions";

function resultMessage(r: QuizResult) {
  if (r.score === r.total) return "🏆 Perfect score! You are a champion!";
  if (r.passed) return "🎉 Well done! You passed.";
  return "Keep going! Read the explanations, watch the lesson again and try once more.";
}

export function QuizForm({ quizId, lessonId, questions }: { quizId: string; lessonId: string; questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const feedback = new Map(result?.feedback.map((f) => [f.question_id, f]));
  const unanswered = questions.length - Object.keys(answers).length;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitQuiz(quizId, answers);
      if (res.error) setError(res.error);
      else if (res.result) {
        setResult(res.result);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function retry() {
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {result ? (
        <div className={`card text-center ${result.passed ? "border-brand-500 bg-brand-50" : "border-amber-400 bg-amber-50"}`}>
          <div className="text-4xl font-extrabold">{result.score}/{result.total}</div>
          <p className="mt-2 font-semibold">{resultMessage(result)}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={retry} className="btn-secondary">Try again</button>
            <Link href={`/student/lessons/${lessonId}`} className="btn-primary">Back to lesson</Link>
          </div>
        </div>
      ) : null}

      {questions.map((q, qi) => {
        const f = feedback.get(q.id);
        return (
          <fieldset key={q.id} className="card" disabled={!!result}>
            <legend className="mb-3 font-semibold">
              {qi + 1}. {q.prompt}
            </legend>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[q.id] === oi;
                const isCorrect = f && f.correct_index === oi;
                const isWrongChoice = f && chosen && !f.correct;
                return (
                  <label
                    key={oi}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                      isCorrect ? "border-brand-500 bg-brand-50" : isWrongChoice ? "border-red-400 bg-red-50" : chosen ? "border-brand-500" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      className="mt-0.5"
                      checked={chosen}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    />
                    <span>
                      <strong className="mr-1">{String.fromCharCode(65 + oi)})</strong>
                      {opt}
                    </span>
                  </label>
                );
              })}
            </div>
            {f ? (
              <p className={`mt-3 text-sm ${f.correct ? "text-brand-800" : "text-red-800"}`}>
                {f.correct ? "✓ Correct. " : "✗ Not quite. "}
                {f.explanation}
              </p>
            ) : null}
          </fieldset>
        );
      })}

      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {!result ? (
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={pending || unanswered > 0}>
            {pending ? "Marking…" : "Submit answers"}
          </button>
          {unanswered > 0 ? <span className="text-sm text-slate-500">{unanswered} question{unanswered === 1 ? "" : "s"} left</span> : null}
        </div>
      ) : null}
    </form>
  );
}
