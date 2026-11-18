import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, isPaystackConfigured } from "@/lib/billing/paystack";
import type { Subscription } from "@/lib/types";
import { Badge, Flash, PageHeader } from "@/components/ui";

export const metadata = { title: "Billing" };

export default async function AdminBilling({ searchParams }: PageProps<"/admin/billing">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: subs }, { data: schools }] = await Promise.all([
    supabase.from("subscriptions").select("*").order("current_period_end", { ascending: true }),
    supabase.from("schools").select("id, name"),
  ]);
  const names = new Map((schools ?? []).map((s) => [s.id as string, s.name as string]));
  const list = (subs ?? []) as Subscription[];
  const termRevenue = list.filter((s) => s.status === "active").reduce((n, s) => n + s.seats * s.price_per_seat_kobo, 0);

  return (
    <>
      <PageHeader title="Billing" subtitle="Schools pay per student seat, per term." />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="card mb-6 border-amber-300 bg-amber-50 text-sm text-amber-900">
        <strong>Paystack is not connected yet.</strong> Payments are recorded by hand: when a school pays, open the school and set its
        subscription to Active with the new period dates. {isPaystackConfigured ? "A Paystack key is set, and the webhook checks signatures, but it does not update subscriptions yet." : "No Paystack key is set."}
      </div>
      <p className="mb-3 text-sm text-slate-600">Expected revenue this term from active schools: <strong>{formatNaira(termRevenue)}</strong></p>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr><th className="px-4 py-3">School</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Seats</th><th className="px-4 py-3">Per seat</th><th className="px-4 py-3">Period ends</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3"><Link className="font-medium text-brand-700 hover:underline" href={`/admin/schools/${s.school_id}`}>{names.get(s.school_id) ?? "School"}</Link></td>
                <td className="px-4 py-3 capitalize">{s.plan}</td>
                <td className="px-4 py-3"><Badge tone={s.status === "active" || s.status === "trial" ? "green" : "red"}>{s.status}</Badge></td>
                <td className="px-4 py-3">{s.seats}</td>
                <td className="px-4 py-3">{formatNaira(s.price_per_seat_kobo)}</td>
                <td className="px-4 py-3">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("en-NG") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
