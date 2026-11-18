import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Course, School, Subscription } from "@/lib/types";
import { regenerateCodes, setLicence, updateSchool } from "../../actions";
import { BackLink, Badge, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SubscriptionForm } from "../../billing/subscription-form";

export default async function AdminSchool({ params, searchParams }: PageProps<"/admin/schools/[schoolId]">) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("id, name, state, lga, contact_email, created_at").eq("id", schoolId).maybeSingle();
  if (!data) notFound();
  const school = data as School;
  const [{ data: codes }, { data: courses }, { data: licences }, { data: sub }, { data: people }] = await Promise.all([
    supabase.rpc("get_join_codes", { target_school: schoolId }),
    supabase.from("courses").select("id, title, published").is("school_id", null).order("title"),
    supabase.from("school_courses").select("course_id").eq("school_id", schoolId),
    supabase.from("subscriptions").select("*").eq("school_id", schoolId).maybeSingle(),
    supabase.from("profiles").select("role, parental_consent").eq("school_id", schoolId),
  ]);
  const code = (codes as { student_join_code: string; teacher_join_code: string }[] | null)?.[0];
  const licensed = new Set((licences ?? []).map((l) => l.course_id as string));
  const students = (people ?? []).filter((p) => p.role === "student");

  return (
    <>
      <BackLink href="/admin/schools">All schools</BackLink>
      <h1 className="text-2xl font-bold">{school.name}</h1>
      <p className="mb-5 text-slate-600">
        {students.length} students ({students.filter((s) => s.parental_consent).length} with consent) · {(people ?? []).filter((p) => p.role === "teacher").length} teachers
      </p>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="font-semibold">Join codes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><div className="text-xs text-slate-500">Students</div><div className="font-mono text-xl tracking-widest">{code?.student_join_code}</div></div>
            <div><div className="text-xs text-slate-500">Teachers (keep private)</div><div className="font-mono text-xl tracking-widest">{code?.teacher_join_code}</div></div>
          </div>
          <form action={regenerateCodes}>
            <input type="hidden" name="school_id" value={schoolId} />
            <SubmitButton className="btn-secondary" pendingText="Generating…">Generate new codes</SubmitButton>
          </form>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Unlocked courses</h2>
          <ul className="divide-y divide-slate-100">
            {((courses ?? []) as Course[]).map((c) => {
              const on = licensed.has(c.id);
              return (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{c.title} {!c.published ? <Badge>Draft</Badge> : null}</span>
                  <form action={setLicence}>
                    <input type="hidden" name="school_id" value={schoolId} />
                    <input type="hidden" name="course_id" value={c.id} />
                    <input type="hidden" name="on" value={on ? "false" : "true"} />
                    <button className={on ? "btn-secondary px-3 py-1 text-xs" : "btn-primary px-3 py-1 text-xs"}>{on ? "Remove" : "Unlock"}</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>

        <form action={updateSchool} className="card space-y-3">
          <h2 className="font-semibold">Details</h2>
          <input type="hidden" name="school_id" value={schoolId} />
          <div><label className="label" htmlFor="name">Name</label><input className="input" id="name" name="name" defaultValue={school.name} required /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="state">State</label><input className="input" id="state" name="state" defaultValue={school.state ?? ""} /></div>
            <div><label className="label" htmlFor="lga">LGA</label><input className="input" id="lga" name="lga" defaultValue={school.lga ?? ""} /></div>
          </div>
          <div><label className="label" htmlFor="contact_email">Billing contact email</label><input className="input" id="contact_email" name="contact_email" type="email" defaultValue={school.contact_email ?? ""} /></div>
          <SubmitButton>Save</SubmitButton>
        </form>

        <div className="card">
          <h2 className="mb-3 font-semibold">Subscription</h2>
          {sub ? <SubscriptionForm sub={sub as Subscription} returnTo={`/admin/schools/${schoolId}`} /> : <p className="text-sm text-slate-500">No subscription.</p>}
        </div>
      </div>
    </>
  );
}
