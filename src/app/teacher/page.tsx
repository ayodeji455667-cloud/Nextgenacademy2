import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Teacher dashboard" };

export default async function TeacherDashboard() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();
  const school = profile.school_id!;
  const [students, pendingConsent, toGrade, workshops, { data: codes }, { data: sub }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", school).eq("role", "student"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", school).eq("role", "student").eq("parental_consent", false),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("school_id", school).is("graded_at", null),
    supabase.from("workshops").select("id", { count: "exact", head: true }).eq("school_id", school),
    supabase.rpc("get_join_codes", { target_school: school }),
    supabase.from("subscriptions").select("plan, status, seats, current_period_end").eq("school_id", school).maybeSingle(),
  ]);
  const studentCode = (codes as { student_join_code: string }[] | null)?.[0]?.student_join_code;

  return (
    <>
      <PageHeader title="Teacher dashboard" subtitle={`Welcome, ${profile.full_name}.`} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={students.count ?? 0} />
        <Stat label="Waiting for consent" value={pendingConsent.count ?? 0} hint="Lessons stay locked until you record it" />
        <Stat label="Work to mark" value={toGrade.count ?? 0} />
        <Stat label="Workshops held" value={workshops.count ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Student join code</h2>
          <p className="mt-1 text-sm text-slate-600">Students type this code when they create their account.</p>
          <div className="mt-3 inline-block rounded-lg bg-slate-100 px-4 py-2 font-mono text-2xl tracking-widest">{studentCode ?? "—"}</div>
        </div>
        <div className="card">
          <h2 className="font-semibold">School subscription</h2>
          {sub ? (
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <div>Plan: <strong className="capitalize">{sub.plan as string}</strong> <Badge tone={sub.status === "active" || sub.status === "trial" ? "green" : "red"}>{sub.status as string}</Badge></div>
              <div>Seats: {sub.seats as number}</div>
              {sub.current_period_end ? <div>Renews or ends: {new Date(sub.current_period_end as string).toLocaleDateString("en-NG")}</div> : null}
            </div>
          ) : <p className="mt-2 text-sm text-slate-600">No subscription found.</p>}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/teacher/students" className="btn-secondary">Manage students</Link>
        <Link href="/teacher/submissions" className="btn-secondary">Mark work</Link>
        <Link href="/teacher/workshops" className="btn-secondary">Record a workshop</Link>
        <Link href="/teacher/content" className="btn-secondary">Add content</Link>
      </div>
    </>
  );
}
