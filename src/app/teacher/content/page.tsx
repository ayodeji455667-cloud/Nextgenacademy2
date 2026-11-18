import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { createCourse } from "@/app/manage/actions";
import { Badge, EmptyState, Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Content" };

export default async function TeacherContent({ searchParams }: PageProps<"/teacher/content">) {
  const sp = await searchParams;
  const profile = await requireRole("teacher");
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("*").order("title");
  const courses = (data ?? []) as Course[];
  const own = courses.filter((c) => c.school_id === profile.school_id);
  const licensed = courses.filter((c) => c.school_id === null);

  return (
    <>
      <PageHeader title="Content" subtitle="Create your own lessons for your school, alongside the courses your school subscribes to." />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 font-semibold">Your school&apos;s courses</h2>
            {own.length === 0 ? <EmptyState>None yet. Create one with the form.</EmptyState> : (
              <ul className="space-y-2">
                {own.map((c) => (
                  <li key={c.id}>
                    <Link href={`/manage/courses/${c.id}`} className="card flex items-center justify-between hover:border-brand-500">
                      <span className="font-medium">{c.title}</span>
                      {c.published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-3 font-semibold">Courses included in your subscription</h2>
            {licensed.length === 0 ? <EmptyState>No subscribed courses.</EmptyState> : (
              <ul className="space-y-2">
                {licensed.map((c) => (
                  <li key={c.id} className="card flex items-center justify-between">
                    <span className="font-medium">{c.title}</span>
                    <Badge>Read only</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <form action={createCourse} className="card h-fit space-y-3">
          <h2 className="font-semibold">New course</h2>
          <div><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" required /></div>
          <div><label className="label" htmlFor="description">Description</label><textarea className="input" id="description" name="description" /></div>
          <div><label className="label" htmlFor="level">Level</label><input className="input" id="level" name="level" placeholder="Level 1" /></div>
          <div><label className="label" htmlFor="age_group">Age group</label><input className="input" id="age_group" name="age_group" placeholder="11–14" /></div>
          <SubmitButton>Create course</SubmitButton>
        </form>
      </div>
    </>
  );
}
