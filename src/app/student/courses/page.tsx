import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCoursesWithProgress } from "@/lib/data/courses";
import { Badge, EmptyState, PageHeader, ProgressBar } from "@/components/ui";

export const metadata = { title: "Courses" };

export default async function StudentCourses() {
  const profile = await requireRole("student");
  const courses = await getCoursesWithProgress(profile.id);
  return (
    <>
      <PageHeader title="Courses" subtitle="Courses your school has unlocked for you." />
      {courses.length === 0 ? (
        <EmptyState>No courses yet.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <Link key={c.id} href={`/student/courses/${c.id}`} className="card flex flex-col gap-3 hover:border-brand-500">
              <div className="flex flex-wrap gap-2">
                <Badge tone="green">{c.category}</Badge>
                {c.level ? <Badge>{c.level}</Badge> : null}
                {c.hasCertificate ? <Badge tone="amber">Certificate earned</Badge> : null}
              </div>
              <h2 className="text-lg font-semibold">{c.title}</h2>
              <p className="line-clamp-3 text-sm text-slate-600">{c.description}</p>
              <div className="mt-auto">
                <div className="mb-1 text-xs text-slate-500">{c.lessons.length} lesson{c.lessons.length === 1 ? "" : "s"} · {Math.round(c.percent)}% complete</div>
                <ProgressBar value={c.percent} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
