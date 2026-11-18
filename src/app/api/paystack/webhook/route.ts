import { NextResponse, type NextRequest } from "next/server";
import { isPaystackConfigured, verifyPaystackSignature } from "@/lib/billing/paystack";

// STUB: verifies Paystack's signature and acknowledges the event, but does not
// change any subscription yet. See src/lib/billing/paystack.ts for the plan.
export async function POST(request: NextRequest) {
  if (!isPaystackConfigured) {
    return NextResponse.json({ error: "Paystack is not configured" }, { status: 501 });
  }
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: { event?: string } = {};
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  console.info("[paystack] received event (not yet handled):", event.event);
  return NextResponse.json({ received: true });
}
