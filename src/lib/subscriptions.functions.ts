import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLANS = ["free", "investidor", "imobiliaria"] as const;
type PlanId = (typeof PLANS)[number];
const RANK: Record<PlanId, number> = { free: 0, investidor: 1, imobiliaria: 2 };

async function stripeFetch(path: string, body: Record<string, string>, secret: string) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) params.append(k, v);
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const json = (await res.json()) as { error?: { message?: string } } & Record<string, unknown>;
  if (!res.ok) throw new Error(json.error?.message || `Stripe error ${res.status}`);
  return json;
}

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: sub }, { data: properties }, { data: plans }] = await Promise.all([
      supabase.from("profiles").select("plan, full_name").eq("id", userId).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("properties").select("id, listed_public").eq("user_id", userId),
      supabase.from("plans").select("*").order("sort_order"),
    ]);
    const plan = (profile?.plan ?? "free") as PlanId;
    const propCount = properties?.length ?? 0;
    const listedCount = properties?.filter((p) => p.listed_public).length ?? 0;
    return {
      plan,
      profile,
      subscription: sub,
      usage: { properties: propCount, listings: listedCount },
      plans: plans ?? [],
    };
  });

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: PlanId; origin: string }) =>
    z.object({ planId: z.enum(PLANS), origin: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("Stripe não configurado. Adicione STRIPE_SECRET_KEY nos secrets.");

    const { data: plan } = await supabase.from("plans").select("*").eq("id", data.planId).maybeSingle();
    if (!plan?.stripe_price_id) throw new Error(`Plano ${data.planId} sem stripe_price_id. Configure no painel admin.`);

    const { data: existing } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).not("stripe_customer_id", "is", null).limit(1).maybeSingle();
    const email = (claims as { email?: string })?.email ?? "";

    const body: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": plan.stripe_price_id,
      "line_items[0][quantity]": "1",
      success_url: `${data.origin}/minha-conta/plano?upgrade=success`,
      cancel_url: `${data.origin}/minha-conta/plano?upgrade=cancel`,
      "metadata[user_id]": userId,
      "metadata[plan_type]": data.planId,
      "subscription_data[metadata][user_id]": userId,
      "subscription_data[metadata][plan_type]": data.planId,
      allow_promotion_codes: "true",
    };
    if (existing?.stripe_customer_id) body.customer = existing.stripe_customer_id;
    else if (email) body.customer_email = email;

    const session = (await stripeFetch("/checkout/sessions", body, secret)) as { id: string; url: string };
    return { url: session.url, id: session.id };
  });

export const scheduleDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { newPlan: PlanId }) => z.object({ newPlan: z.enum(PLANS) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
    const current = (profile?.plan ?? "free") as PlanId;
    if (RANK[data.newPlan] >= RANK[current]) throw new Error("Downgrade inválido.");

    const { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (sub?.stripe_subscription_id) {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) throw new Error("Stripe não configurado.");
      await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, { cancel_at_period_end: "true" }, secret);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (sub) {
      await supabaseAdmin.from("subscriptions").update({
        cancel_at_period_end: true,
        scheduled_plan: data.newPlan,
        status: "scheduled_downgrade",
      }).eq("id", sub.id);
    } else {
      // No paid subscription -> apply immediately
      await supabaseAdmin.from("profiles").update({ plan: data.newPlan }).eq("id", userId);
    }
    return { ok: true };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason: string }) =>
    z.object({ reason: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: profile } = await supabase.from("profiles").select("plan, full_name").eq("id", userId).maybeSingle();
    const plan = (profile?.plan ?? "free") as PlanId;

    const { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();

    let effectiveDate = new Date().toISOString();
    if (sub?.stripe_subscription_id) {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) throw new Error("Stripe não configurado.");
      const updated = (await stripeFetch(`/subscriptions/${sub.stripe_subscription_id}`, { cancel_at_period_end: "true" }, secret)) as { current_period_end: number };
      if (updated?.current_period_end) effectiveDate = new Date(updated.current_period_end * 1000).toISOString();
    } else if (sub?.current_period_end) {
      effectiveDate = sub.current_period_end;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (sub) {
      await supabaseAdmin.from("subscriptions").update({
        cancel_at_period_end: true,
        scheduled_plan: "free",
        status: "scheduled_downgrade",
      }).eq("id", sub.id);
    } else {
      await supabaseAdmin.from("profiles").update({ plan: "free" }).eq("id", userId);
    }

    await supabaseAdmin.from("cancellations").insert({
      user_id: userId,
      plan_type: plan,
      reason: data.reason,
      effective_date: effectiveDate,
    });

    // Best-effort email via Resend connector (if configured)
    const email = (claims as { email?: string })?.email;
    const resendKey = process.env.RESEND_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (email && resendKey && lovableKey) {
      const dateStr = new Date(effectiveDate).toLocaleDateString("pt-BR");
      try {
        await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: "AlugaFlow <onboarding@resend.dev>",
            to: [email],
            subject: "Cancelamento de assinatura confirmado",
            html: `<p>Olá ${profile?.full_name ?? ""},</p>
              <p>Recebemos o seu pedido de cancelamento da assinatura <strong>${plan}</strong>.</p>
              <p>Você continuará com acesso aos recursos pagos até <strong>${dateStr}</strong>.</p>
              <p>Seus dados continuam salvos. Caso mude de ideia, basta reativar pelo painel.</p>
              <p>— Equipe AlugaFlow</p>`,
          }),
        });
      } catch (e) {
        console.error("[cancel] email failed", e);
      }
    }

    return { ok: true, effectiveDate };
  });

export const checkLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { resource: "properties" | "listings" }) =>
    z.object({ resource: z.enum(["properties", "listings"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: r, error } = await supabase.rpc("check_plan_limit", { _user_id: userId, _resource: data.resource });
    if (error) throw new Error(error.message);
    return r as { allowed: boolean; current: number; max: number | null; plan: PlanId };
  });
