import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

const PLAN_RANK: Record<string, number> = { free: 0, investidor: 1, imobiliaria: 2 };

function verifySignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const ts = parts.t;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const signedPayload = `${ts}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const a = Buffer.from(v1, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handleEvent(event: StripeEvent) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const obj = event.data.object as Record<string, unknown>;

  if (event.type === "checkout.session.completed") {
    const userId = (obj.metadata as Record<string, string> | undefined)?.user_id;
    const planType = (obj.metadata as Record<string, string> | undefined)?.plan_type;
    const subId = obj.subscription as string | undefined;
    const customerId = obj.customer as string | undefined;
    if (!userId || !planType) return;

    // Fetch subscription to get periods
    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    if (subId && process.env.STRIPE_SECRET_KEY) {
      const r = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      });
      if (r.ok) {
        const s = (await r.json()) as { current_period_start?: number; current_period_end?: number };
        if (s.current_period_start) periodStart = new Date(s.current_period_start * 1000).toISOString();
        if (s.current_period_end) periodEnd = new Date(s.current_period_end * 1000).toISOString();
      }
    }

    await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_type: planType,
        stripe_subscription_id: subId ?? null,
        stripe_customer_id: customerId ?? null,
        status: "active",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        scheduled_plan: null,
      },
      { onConflict: "stripe_subscription_id" },
    );
    await supabaseAdmin.from("profiles").update({ plan: planType }).eq("id", userId);
    return;
  }

  if (event.type === "customer.subscription.updated") {
    const subId = obj.id as string;
    const status = obj.status as string;
    const cancelAtEnd = obj.cancel_at_period_end as boolean;
    const periodStart = obj.current_period_start ? new Date((obj.current_period_start as number) * 1000).toISOString() : null;
    const periodEnd = obj.current_period_end ? new Date((obj.current_period_end as number) * 1000).toISOString() : null;
    await supabaseAdmin.from("subscriptions").update({
      status: status === "past_due" ? "past_due" : (cancelAtEnd ? "scheduled_downgrade" : "active"),
      cancel_at_period_end: cancelAtEnd,
      current_period_start: periodStart,
      current_period_end: periodEnd,
    }).eq("stripe_subscription_id", subId);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const subId = obj.id as string;
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("user_id, scheduled_plan").eq("stripe_subscription_id", subId).maybeSingle();
    if (!sub) return;
    const newPlan = sub.scheduled_plan ?? "free";
    await supabaseAdmin.from("subscriptions").update({
      status: "cancelled",
      plan_type: newPlan,
      cancel_at_period_end: false,
      scheduled_plan: null,
    }).eq("stripe_subscription_id", subId);
    await supabaseAdmin.from("profiles").update({ plan: newPlan }).eq("id", sub.user_id);
    return;
  }

  if (event.type === "invoice.payment_failed") {
    const subId = obj.subscription as string | undefined;
    if (!subId) return;
    await supabaseAdmin.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId);
    return;
  }
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const body = await request.text();
        if (secret) {
          const sig = request.headers.get("stripe-signature");
          if (!verifySignature(body, sig, secret)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }
        let event: StripeEvent;
        try { event = JSON.parse(body); } catch { return new Response("Bad JSON", { status: 400 }); }
        try {
          await handleEvent(event);
        } catch (e) {
          console.error("[stripe-webhook]", e);
          return new Response("error", { status: 500 });
        }
        // touch rank so import isn't dead
        void PLAN_RANK;
        return new Response("ok");
      },
    },
  },
});
