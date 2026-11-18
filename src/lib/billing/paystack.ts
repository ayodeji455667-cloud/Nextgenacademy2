import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack integration: STUB.
 *
 * Billing model: each school pays per student seat, per term. A school's
 * subscription row (public.subscriptions) controls whether its students can
 * open licensed courses. Today an admin sets the status by hand in
 * Admin > Billing. When Paystack is wired up:
 *
 *   1. Create a Paystack Plan per price point (e.g. "Termly, per seat").
 *   2. initializeSchoolSubscription() calls POST /transaction/initialize with the
 *      school's contact email, amount = seats x price, and the plan code, and
 *      returns the authorization_url for the school's bursar to pay.
 *   3. Paystack calls /api/paystack/webhook. On "charge.success" and
 *      "subscription.create", set status = 'active' and the period dates. On
 *      "invoice.payment_failed" set 'past_due'; on "subscription.disable" set
 *      'cancelled'. Use the service-role key for those writes (server only).
 *
 * Amounts are in kobo (NGN x 100).
 */

export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? "";
export const isPaystackConfigured = PAYSTACK_SECRET_KEY.length > 0;

export type SchoolCheckoutRequest = {
  schoolId: string;
  email: string;
  seats: number;
  pricePerSeatKobo: number;
  planCode?: string;
};

export async function initializeSchoolSubscription(_req: SchoolCheckoutRequest): Promise<{ authorizationUrl: string }> {
  void _req;
  throw new Error("Paystack is not integrated yet. Set the subscription status manually in Admin > Billing.");
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using your secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  if (!isPaystackConfigured || !signature) return false;
  const expected = createHmac("sha512", PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}
