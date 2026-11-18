import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, EmptyState, Flash, PageHeader } from "@/components/ui";

export const metadata = { title: "Grading" };

export default async function TeacherSubmissions({ searchParams }: PageProps<"/teacher/submissions">) {
  const sp = await searchParams;
  const profile = await requireRole("teacher");
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select("id, submitted_at, score, graded_at, profiles!submissions_student_id_fkey(full_name, class_level), assignments(title, max_score)")
    .eq("school_id", profile.school_id!)
    .order("graded_at", { ascending: true, nullsFirst: true })
    .order("submitted_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader title="Grading" subtitle="Work waiting to be marked is shown first." />
      <Flash ok={sp.ok} error={sp.error} />
      {(data ?? []).length === 0 ? (
        <EmptyState>No submissions yet.</EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data ?? []).map((s) => {
                const student = s.profiles as unknown as { full_name: string; class_level: string | null } | null;
                const assignment = s.assignments as unknown as { title: string; max_score: number } | null;
                return (
                  <tr key={s.id as string}>
                    <td className="px-4 py-3 font-medium">{student?.full_name} <span className="text-slate-500">{student?.class_level}</span></td>
                    <td className="px-4 py-3">{assignment?.title}</td>
                    <td className="px-4 py-3">{new Date(s.submitted_at as string).toLocaleDateString("en-NG")}</td>
                    <td className="px-4 py-3">{s.graded_at ? <Badge tone="green">{s.score as number}/{assignment?.max_score}</Badge> : <Badge tone="amber">To mark</Badge>}</td>
                    <td className="px-4 py-3 text-right"><Link className="font-medium text-brand-700 hover:underline" href={`/teacher/submissions/${s.id}`}>{s.graded_at ? "View" : "Mark"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
