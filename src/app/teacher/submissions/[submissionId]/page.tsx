import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gradeSubmission, returnSubmission } from "../../actions";
import { BackLink, Badge, Flash } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { SubmitButton } from "@/components/submit-button";

export default async function GradeSubmission({ params, searchParams }: PageProps<"/teacher/submissions/[submissionId]">) {
  const { submissionId } = await params;
  const sp = await searchParams;
  await requireRole("teacher");
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("submissions")
    .select("*, profiles!submissions_student_id_fkey(full_name, class_level), assignments(title, max_score, rubric_md)")
    .eq("id", submissionId)
    .maybeSingle();
  if (!s) notFound();
  const student = s.profiles as { full_name: string; class_level: string | null } | null;
  const assignment = s.assignments as { title: string; max_score: number; rubric_md: string | null } | null;

  let fileUrl: string | null = null;
  if (s.file_path) {
    const { data } = await supabase.storage.from("submissions").createSignedUrl(s.file_path as string, 600);
    fileUrl = data?.signedUrl ?? null;
  }
  const isImage = typeof s.file_path === "string" && /\.(jpe?g|png|webp)$/i.test(s.file_path);

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/teacher/submissions">All submissions</BackLink>
      <h1 className="text-2xl font-bold">{assignment?.title}</h1>
      <p className="mb-5 text-slate-600">{student?.full_name} · {student?.class_level ?? ""} · submitted {new Date(s.submitted_at as string).toLocaleString("en-NG")}</p>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="card">
            <h2 className="mb-2 font-semibold">Written answers</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-800">{(s.text_response as string) || "No written answers."}</p>
          </div>
          <div className="card">
            <h2 className="mb-2 font-semibold">Uploaded file</h2>
            {fileUrl ? (
              isImage ? (
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not worth optimising */}
                  <img src={fileUrl} alt="Student's uploaded work" className="max-h-[480px] rounded-lg border" />
                </a>
              ) : (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">Open file</a>
              )
            ) : <p className="text-sm text-slate-500">No file uploaded (the poster may have been handed in on paper).</p>}
          </div>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <form action={gradeSubmission} className="card space-y-3">
            <input type="hidden" name="submission_id" value={submissionId} />
            <input type="hidden" name="max_score" value={assignment?.max_score ?? 20} />
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Mark</h2>
              {s.graded_at ? <Badge tone="green">Marked</Badge> : <Badge tone="amber">Not marked</Badge>}
            </div>
            <div>
              <label className="label" htmlFor="score">Score (out of {assignment?.max_score})</label>
              <input className="input" id="score" name="score" type="number" min={0} max={assignment?.max_score} defaultValue={(s.score as number | null) ?? ""} required />
            </div>
            <div>
              <label className="label" htmlFor="feedback">Feedback for the student</label>
              <textarea className="input min-h-28" id="feedback" name="feedback" defaultValue={(s.feedback as string | null) ?? ""} />
            </div>
            <SubmitButton>Save mark</SubmitButton>
          </form>
          {s.graded_at ? (
            <form action={returnSubmission}>
              <input type="hidden" name="submission_id" value={submissionId} />
              <button className="text-sm text-slate-600 underline">Remove mark so the student can resubmit</button>
            </form>
          ) : null}
          {assignment?.rubric_md ? (
            <div className="card"><h2 className="mb-2 font-semibold">Rubric</h2><Markdown>{assignment.rubric_md}</Markdown></div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
