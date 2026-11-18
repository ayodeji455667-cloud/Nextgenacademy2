import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteWorkshop, saveAttendance } from "../../actions";
import { BackLink, EmptyState, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function WorkshopAttendance({ params, searchParams }: PageProps<"/teacher/workshops/[workshopId]">) {
  const { workshopId } = await params;
  const sp = await searchParams;
  const profile = await requireRole("teacher");
  const supabase = await createClient();
  const { data: workshop } = await supabase.from("workshops").select("*").eq("id", workshopId).maybeSingle();
  if (!workshop) notFound();
  const [{ data: students }, { data: attendance }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, class_level").eq("school_id", profile.school_id!).eq("role", "student").order("class_level").order("full_name"),
    supabase.from("workshop_attendance").select("student_id, present").eq("workshop_id", workshopId),
  ]);
  const recorded = new Map((attendance ?? []).map((a) => [a.student_id as string, a.present as boolean]));

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/teacher/workshops">All workshops</BackLink>
      <h1 className="text-2xl font-bold">{workshop.title as string}</h1>
      <p className="mb-5 text-slate-600">{new Date(workshop.held_on as string).toLocaleDateString("en-NG")}{workshop.facilitator ? ` · ${workshop.facilitator}` : ""}</p>
      <Flash ok={sp.ok} error={sp.error} />
      {(students ?? []).length === 0 ? (
        <EmptyState>No students at your school yet.</EmptyState>
      ) : (
        <form action={saveAttendance} className="card space-y-4">
          <input type="hidden" name="workshop_id" value={workshopId} />
          <p className="text-sm text-slate-600">Tick every student who attended.</p>
          <ul className="divide-y divide-slate-100">
            {(students ?? []).map((s) => (
              <li key={s.id as string} className="flex items-center gap-3 py-2">
                <input type="hidden" name="student_ids" value={s.id as string} />
                <input type="checkbox" id={`p-${s.id}`} name="present" value={s.id as string} defaultChecked={recorded.get(s.id as string) ?? false} className="h-5 w-5" />
                <label htmlFor={`p-${s.id}`} className="flex-1">{s.full_name as string} <span className="text-sm text-slate-500">{(s.class_level as string) ?? ""}</span></label>
              </li>
            ))}
          </ul>
          <SubmitButton>Save attendance</SubmitButton>
        </form>
      )}
      <form action={deleteWorkshop} className="mt-6">
        <input type="hidden" name="workshop_id" value={workshopId} />
        <button className="text-sm text-red-700 underline">Delete this workshop</button>
      </form>
    </div>
  );
}
