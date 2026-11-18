import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, Submission } from "@/lib/types";
import { BackLink, Badge } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { SubmissionForm } from "./submission-form";

export default async function AssignmentPage({ params }: PageProps<"/student/assignments/[assignmentId]">) {
  const { assignmentId } = await params;
  const profile = await requireRole("student");
  const supabase = await createClient();
  const { data } = await supabase.from("assignments").select("*").eq("id", assignmentId).maybeSingle();
  if (!data) notFound();
  const assignment = data as Assignment;
  const { data: sub } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", profile.id)
    .maybeSingle();
  const submission = sub as Submission | null;

  let fileUrl: string | null = null;
  if (submission?.file_path) {
    const { data: signed } = await supabase.storage.from("submissions").createSignedUrl(submission.file_path, 600);
    fileUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={assignment.lesson_id ? `/student/lessons/${assignment.lesson_id}` : `/student/courses/${assignment.course_id}`}>Back</BackLink>
      <h1 className="mb-1 text-2xl font-bold">{assignment.title}</h1>
      <p className="mb-5 text-slate-600">Project · marked out of {assignment.max_score}</p>

      <div className="card mb-6">
        <Markdown>{assignment.instructions_md}</Markdown>
        {assignment.rubric_md ? (
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-brand-700">How it will be marked</summary>
            <div className="mt-2"><Markdown>{assignment.rubric_md}</Markdown></div>
          </details>
        ) : null}
      </div>

      {submission?.graded_at ? (
        <div className="card border-brand-500 bg-brand-50">
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="green">Marked</Badge>
            <span className="text-xl font-bold">{submission.score}/{assignment.max_score}</span>
          </div>
          {submission.feedback ? <p className="whitespace-pre-wrap text-slate-800"><strong>Teacher&apos;s feedback:</strong> {submission.feedback}</p> : null}
        </div>
      ) : (
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold">{submission ? "Update your submission" : "Submit your work"}</h2>
          {submission ? (
            <p className="mb-3 text-sm text-slate-600">
              Submitted on {new Date(submission.submitted_at).toLocaleDateString("en-NG")}. Waiting for your teacher to mark it.
              {fileUrl ? <> <a href={fileUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">View uploaded photo</a></> : null}
            </p>
          ) : null}
          <SubmissionForm
            assignmentId={assignment.id}
            schoolId={profile.school_id!}
            studentId={profile.id}
            initialText={submission?.text_response ?? ""}
          />
        </div>
      )}
    </div>
  );
}
