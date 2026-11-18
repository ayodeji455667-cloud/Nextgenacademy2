import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, Course, Lesson } from "@/lib/types";
import { createAssignment, createLesson, deleteAssignment, deleteCourse, updateCourse } from "../../actions";
import { BackLink, Badge, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function ManageCourse({ params, searchParams }: PageProps<"/manage/courses/[courseId]">) {
  const { courseId } = await params;
  const sp = await searchParams;
  const profile = await requireRole("teacher", "admin");
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (!data) notFound();
  const course = data as Course;
  const canEdit = profile.role === "admin" || (course.school_id !== null && course.school_id === profile.school_id);
  if (!canEdit) notFound();

  const [{ data: lessons }, { data: assignments }] = await Promise.all([
    supabase.from("lessons").select("id, title, position, published, video_path, video_url").eq("course_id", courseId).order("position"),
    supabase.from("assignments").select("*").eq("course_id", courseId).order("created_at"),
  ]);
  const lessonList = (lessons ?? []) as Lesson[];
  const backHref = profile.role === "admin" ? "/admin/courses" : "/teacher/content";

  return (
    <>
      <BackLink href={backHref}>All courses</BackLink>
      <h1 className="mb-4 text-2xl font-bold">{course.title}</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <h2 className="mb-3 font-semibold">Lessons</h2>
            {lessonList.length === 0 ? <p className="text-sm text-slate-500">No lessons yet.</p> : (
              <ol className="divide-y divide-slate-100">
                {lessonList.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2">
                    <Link href={`/manage/lessons/${l.id}`} className="font-medium text-brand-700 hover:underline">{l.position}. {l.title}</Link>
                    <span className="flex gap-1">
                      {l.video_path || l.video_url ? <Badge>Video</Badge> : null}
                      {l.published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <form action={createLesson} className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-6">
              <input type="hidden" name="course_id" value={courseId} />
              <input className="input sm:col-span-1" name="position" type="number" min={1} defaultValue={lessonList.length + 1} aria-label="Position" />
              <input className="input sm:col-span-3" name="title" placeholder="New lesson title" required />
              <div className="sm:col-span-2"><SubmitButton className="btn-primary w-full">Add lesson</SubmitButton></div>
            </form>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Projects and assignments</h2>
            {((assignments ?? []) as Assignment[]).map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-slate-100 py-2">
                <span>{a.title} <span className="text-sm text-slate-500">/ {a.max_score}</span></span>
                <form action={deleteAssignment}>
                  <input type="hidden" name="course_id" value={courseId} />
                  <input type="hidden" name="assignment_id" value={a.id} />
                  <button className="text-xs text-red-700 underline">Delete</button>
                </form>
              </div>
            ))}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-brand-700">Add a project</summary>
              <form action={createAssignment} className="mt-3 space-y-3">
                <input type="hidden" name="course_id" value={courseId} />
                <div><label className="label" htmlFor="a-title">Title</label><input className="input" id="a-title" name="title" required /></div>
                <div>
                  <label className="label" htmlFor="a-lesson">Lesson</label>
                  <select className="input" id="a-lesson" name="lesson_id" defaultValue="">
                    <option value="">Whole course</option>
                    {lessonList.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>
                <div><label className="label" htmlFor="a-instructions">Instructions (Markdown)</label><textarea className="input min-h-32 font-mono text-sm" id="a-instructions" name="instructions_md" /></div>
                <div><label className="label" htmlFor="a-rubric">Marking rubric (Markdown)</label><textarea className="input min-h-24 font-mono text-sm" id="a-rubric" name="rubric_md" /></div>
                <div><label className="label" htmlFor="a-max">Maximum score</label><input className="input" id="a-max" name="max_score" type="number" min={1} defaultValue={20} /></div>
                <SubmitButton>Add project</SubmitButton>
              </form>
            </details>
          </section>
        </div>

        <div className="space-y-4">
          <form action={updateCourse} className="card space-y-3">
            <h2 className="font-semibold">Course details</h2>
            <input type="hidden" name="course_id" value={courseId} />
            <div><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" defaultValue={course.title} required /></div>
            <div><label className="label" htmlFor="description">Description</label><textarea className="input" id="description" name="description" defaultValue={course.description ?? ""} /></div>
            <div><label className="label" htmlFor="category">Category</label><input className="input" id="category" name="category" defaultValue={course.category} /></div>
            <div><label className="label" htmlFor="level">Level</label><input className="input" id="level" name="level" defaultValue={course.level ?? ""} /></div>
            <div><label className="label" htmlFor="age_group">Age group</label><input className="input" id="age_group" name="age_group" defaultValue={course.age_group ?? ""} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={course.published} /> Published (visible to students)</label>
            <SubmitButton>Save course</SubmitButton>
          </form>
          <form action={deleteCourse} className="text-center">
            <input type="hidden" name="course_id" value={courseId} />
            <button className="text-sm text-red-700 underline">Delete course and all its lessons</button>
          </form>
        </div>
      </div>
    </>
  );
}
