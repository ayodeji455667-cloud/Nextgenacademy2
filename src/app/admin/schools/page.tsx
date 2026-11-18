import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { School } from "@/lib/types";
import { createSchool } from "../actions";
import { Badge, EmptyState, Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Schools" };

export default async function AdminSchools({ searchParams }: PageProps<"/admin/schools">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: schools }, { data: subs }, { data: profiles }] = await Promise.all([
    supabase.from("schools").select("id, name, state, lga, contact_email, created_at").order("name"),
    supabase.from("subscriptions").select("school_id, status"),
    supabase.from("profiles").select("school_id, role"),
  ]);
  const status = new Map((subs ?? []).map((s) => [s.school_id as string, s.status as string]));
  const students = (id: string) => (profiles ?? []).filter((p) => p.school_id === id && p.role === "student").length;

  return (
    <>
      <PageHeader title="Schools" />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {(schools ?? []).length === 0 ? <EmptyState>No schools yet.</EmptyState> : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3">School</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Subscription</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {((schools ?? []) as School[]).map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3"><Link href={`/admin/schools/${s.id}`} className="font-medium text-brand-700 hover:underline">{s.name}</Link></td>
                      <td className="px-4 py-3">{[s.lga, s.state].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-4 py-3">{students(s.id)}</td>
                      <td className="px-4 py-3"><Badge tone={["active", "trial"].includes(status.get(s.id) ?? "") ? "green" : "red"}>{status.get(s.id) ?? "none"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <form action={createSchool} className="card h-fit space-y-3">
          <h2 className="font-semibold">Add a school</h2>
          <div><label className="label" htmlFor="name">Name</label><input className="input" id="name" name="name" required /></div>
          <div><label className="label" htmlFor="state">State</label><input className="input" id="state" name="state" placeholder="Lagos" /></div>
          <div><label className="label" htmlFor="lga">LGA</label><input className="input" id="lga" name="lga" /></div>
          <div><label className="label" htmlFor="contact_email">Billing contact email</label><input className="input" id="contact_email" name="contact_email" type="email" /></div>
          <SubmitButton>Add school</SubmitButton>
          <p className="text-xs text-slate-500">New schools start on a 30-day trial with join codes for students and teachers.</p>
        </form>
      </div>
    </>
  );
}
