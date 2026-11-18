import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { createCourse } from "@/app/manage/actions";
import { Badge, EmptyState, Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Courses" };

export default async function AdminCourses({ searchParams }: PageProps<"/admin/courses">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: courses }, { data: licences }, { data: lessons }] = await Promise.all([
    supabase.from("courses").select("*").is("school_id", null).order("title"),
    supabase.from("school_courses").select("course_id"),
    supabase.from("lessons").select("course_id"),
  ]);
  const schoolsFor = (id: string) => (licences ?? []).filter((l) => l.course_id === id).length;
  const lessonsFor = (id: string) => (lessons ?? []).filter((l) => l.course_id === id).length;

  return (
    <>
      <PageHeader title="Platform courses" subtitle="Courses you offer to subscribing schools. Unlock them per school on each school's page." />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {(courses ?? []).length === 0 ? <EmptyState>No courses yet.</EmptyState> : (
            <ul className="space-y-2">
              {((courses ?? []) as Course[]).map((c) => (
                <li key={c.id}>
                  <Link href={`/manage/courses/${c.id}`} className="card flex items-center justify-between hover:border-brand-500">
                    <div>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-sm text-slate-500">{lessonsFor(c.id)} lessons · unlocked at {schoolsFor(c.id)} school{schoolsFor(c.id) === 1 ? "" : "s"}</div>
                    </div>
                    {c.published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form action={createCourse} className="card h-fit space-y-3">
          <h2 className="font-semibold">New platform course</h2>
          <div><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" required /></div>
          <div><label className="label" htmlFor="description">Description</label><textarea className="input" id="description" name="description" /></div>
          <div><label className="label" htmlFor="category">Category</label><input className="input" id="category" name="category" defaultValue="Digital Skills" /></div>
          <div><label className="label" htmlFor="level">Level</label><input className="input" id="level" name="level" /></div>
          <div><label className="label" htmlFor="age_group">Age group</label><input className="input" id="age_group" name="age_group" /></div>
          <SubmitButton>Create course</SubmitButton>
        </form>
      </div>
    </>
  );
}
