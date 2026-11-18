import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Admin" };

export default async function AdminOverview() {
  const supabase = await createClient();
  const [schools, students, teachers, courses, active, certs] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("courses").select("id", { count: "exact", head: true }).is("school_id", null),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trial"]),
    supabase.from("certificates").select("id", { count: "exact", head: true }),
  ]);

  return (
    <>
      <PageHeader title="Admin overview" subtitle="The whole programme at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Schools" value={schools.count ?? 0} hint={`${active.count ?? 0} on trial or active`} />
        <Stat label="Students" value={students.count ?? 0} />
        <Stat label="Teachers" value={teachers.count ?? 0} />
        <Stat label="Platform courses" value={courses.count ?? 0} />
        <Stat label="Certificates issued" value={certs.count ?? 0} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/schools" className="btn-secondary">Add a school</Link>
        <Link href="/admin/courses" className="btn-secondary">Manage courses</Link>
        <Link href="/admin/billing" className="btn-secondary">Billing</Link>
      </div>
    </>
  );
}
