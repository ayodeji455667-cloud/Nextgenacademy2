import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createWorkshop } from "../actions";
import { EmptyState, Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Workshops" };

export default async function TeacherWorkshops({ searchParams }: PageProps<"/teacher/workshops">) {
  const sp = await searchParams;
  const profile = await requireRole("teacher");
  const supabase = await createClient();
  const [{ data: workshops }, { data: courses }, { data: attendance }] = await Promise.all([
    supabase.from("workshops").select("id, title, held_on, facilitator").eq("school_id", profile.school_id!).order("held_on", { ascending: false }),
    supabase.from("courses").select("id, title").order("title"),
    supabase.from("workshop_attendance").select("workshop_id, present").eq("school_id", profile.school_id!),
  ]);
  const presentCount = (id: string) => (attendance ?? []).filter((a) => a.workshop_id === id && a.present).length;

  return (
    <>
      <PageHeader title="Workshops" subtitle="Record in-school workshops and who attended." />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {(workshops ?? []).length === 0 ? (
            <EmptyState>No workshops recorded yet.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {(workshops ?? []).map((w) => (
                <li key={w.id as string}>
                  <Link href={`/teacher/workshops/${w.id}`} className="card flex items-center justify-between hover:border-brand-500">
                    <div>
                      <div className="font-semibold">{w.title as string}</div>
                      <div className="text-sm text-slate-500">{new Date(w.held_on as string).toLocaleDateString("en-NG")}{w.facilitator ? ` · ${w.facilitator}` : ""}</div>
                    </div>
                    <span className="text-sm text-slate-600">{presentCount(w.id as string)} present</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form action={createWorkshop} className="card h-fit space-y-3">
          <h2 className="font-semibold">New workshop</h2>
          <div><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" required placeholder="Internet safety assembly" /></div>
          <div><label className="label" htmlFor="held_on">Date</label><input className="input" id="held_on" name="held_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div><label className="label" htmlFor="facilitator">Facilitator</label><input className="input" id="facilitator" name="facilitator" /></div>
          <div>
            <label className="label" htmlFor="course_id">Course (optional)</label>
            <select className="input" id="course_id" name="course_id" defaultValue="">
              <option value="">None</option>
              {(courses ?? []).map((c) => <option key={c.id as string} value={c.id as string}>{c.title as string}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="notes">Notes</label><textarea className="input" id="notes" name="notes" /></div>
          <SubmitButton>Create and take attendance</SubmitButton>
        </form>
      </div>
    </>
  );
}
