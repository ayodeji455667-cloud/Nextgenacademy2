import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { setConsent } from "../actions";
import { Badge, EmptyState, Flash, PageHeader } from "@/components/ui";

export const metadata = { title: "Students" };

export default async function TeacherStudents({ searchParams }: PageProps<"/teacher/students">) {
  const sp = await searchParams;
  const profile = await requireRole("teacher");
  const supabase = await createClient();
  const school = profile.school_id!;
  const [{ data: students }, { data: progress }, { data: attempts }, { data: certs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, class_level, parental_consent, parental_consent_at, created_at").eq("school_id", school).eq("role", "student").order("class_level").order("full_name"),
    supabase.from("lesson_progress").select("student_id").eq("school_id", school),
    supabase.from("quiz_attempts").select("student_id, quiz_id").eq("school_id", school).eq("passed", true),
    supabase.from("certificates").select("student_id").eq("school_id", school),
  ]);
  const count = (rows: { student_id: unknown }[] | null, id: string) => (rows ?? []).filter((r) => r.student_id === id).length;
  const passedQuizzes = (id: string) => new Set((attempts ?? []).filter((a) => a.student_id === id).map((a) => a.quiz_id)).size;

  return (
    <>
      <PageHeader title="Students" subtitle="Record parental consent and follow each student's progress." />
      <Flash ok={sp.ok} error={sp.error} />
      {(students ?? []).length === 0 ? (
        <EmptyState>No students yet. Share your school&apos;s student join code from the dashboard.</EmptyState>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Lessons</th>
                <th className="px-4 py-3">Quizzes passed</th>
                <th className="px-4 py-3">Certificates</th>
                <th className="px-4 py-3">Parental consent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {((students ?? []) as Profile[]).map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{s.full_name}</td>
                  <td className="px-4 py-3">{s.class_level ?? "—"}</td>
                  <td className="px-4 py-3">{count(progress, s.id)}</td>
                  <td className="px-4 py-3">{passedQuizzes(s.id)}</td>
                  <td className="px-4 py-3">{count(certs, s.id)}</td>
                  <td className="px-4 py-3">
                    <form action={setConsent} className="flex items-center gap-2">
                      <input type="hidden" name="student_id" value={s.id} />
                      <input type="hidden" name="consent" value={s.parental_consent ? "false" : "true"} />
                      {s.parental_consent ? (
                        <>
                          <Badge tone="green">Given {s.parental_consent_at ? new Date(s.parental_consent_at).toLocaleDateString("en-NG") : ""}</Badge>
                          <button className="text-xs text-slate-500 underline">Remove</button>
                        </>
                      ) : (
                        <button className="btn-primary px-3 py-1 text-xs">Record consent</button>
                      )}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Only record consent after you have a signed consent form (paper or digital) from the student&apos;s parent or guardian. Keep the form on file at the school.
      </p>
    </>
  );
}
