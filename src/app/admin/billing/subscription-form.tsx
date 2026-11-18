import type { Subscription } from "@/lib/types";
import { updateSubscription } from "../actions";
import { SubmitButton } from "@/components/submit-button";

export function SubscriptionForm({ sub, returnTo }: { sub: Subscription; returnTo: string }) {
  return (
    <form action={updateSubscription} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="school_id" value={sub.school_id} />
      <input type="hidden" name="return_to" value={returnTo} />
      <div><label className="label">Plan</label><input className="input" name="plan" defaultValue={sub.plan} /></div>
      <div>
        <label className="label">Status</label>
        <select className="input" name="status" defaultValue={sub.status}>
          <option value="trial">Trial</option>
          <option value="active">Active (paid)</option>
          <option value="past_due">Past due</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div><label className="label">Seats (students)</label><input className="input" name="seats" type="number" min={0} defaultValue={sub.seats} /></div>
      <div><label className="label">Price per seat per term (₦)</label><input className="input" name="price_per_seat_naira" type="number" min={0} step="0.01" defaultValue={sub.price_per_seat_kobo / 100} /></div>
      <div><label className="label">Period start</label><input className="input" name="current_period_start" type="date" defaultValue={sub.current_period_start ?? ""} /></div>
      <div><label className="label">Period end</label><input className="input" name="current_period_end" type="date" defaultValue={sub.current_period_end ?? ""} /></div>
      <div className="sm:col-span-2"><SubmitButton>Save subscription</SubmitButton></div>
      <p className="text-xs text-slate-500 sm:col-span-2">Students lose access to unlocked courses when the status is past due or cancelled, or the period has ended.</p>
    </form>
  );
}
