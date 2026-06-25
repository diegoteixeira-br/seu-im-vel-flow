import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ASAAS_URLS = {
  sandbox: "https://sandbox.asaas.com/api/v3",
  production: "https://api.asaas.com/v3",
} as const;

function onlyDigits(s: string | null | undefined) {
  return (s ?? "").replace(/\D+/g, "");
}

async function asaasFetch(env: string, key: string, path: string, init?: RequestInit) {
  const base = ASAAS_URLS[(env as keyof typeof ASAAS_URLS) ?? "sandbox"] ?? ASAAS_URLS.sandbox;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: key,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "errors" in body && Array.isArray((body as { errors: unknown[] }).errors)
        ? ((body as { errors: Array<{ description?: string }> }).errors.map((e) => e.description).join("; "))
        : text) || `ASAAS HTTP ${res.status}`;
    throw new Error(`ASAAS: ${msg}`);
  }
  return body as Record<string, unknown>;
}

async function ensureAsaasCustomer(
  ctx: { supabase: ReturnType<typeof requireSupabaseAuth.use> extends never ? never : any }, // typing fallback
  env: string,
  apiKey: string,
  tenant: { id: string; full_name: string; cpf: string | null; email: string | null; phone: string | null; asaas_customer_id: string | null },
) {
  if (tenant.asaas_customer_id) return tenant.asaas_customer_id;
  const cpf = onlyDigits(tenant.cpf);
  if (!cpf) throw new Error("Inquilino sem CPF cadastrado");
  const created = await asaasFetch(env, apiKey, "/customers", {
    method: "POST",
    body: JSON.stringify({
      name: tenant.full_name,
      cpfCnpj: cpf,
      email: tenant.email ?? undefined,
      mobilePhone: onlyDigits(tenant.phone) || undefined,
      notificationDisabled: false,
    }),
  });
  const customerId = String(created.id);
  await ctx.supabase.from("tenants").update({ asaas_customer_id: customerId }).eq("id", tenant.id);
  return customerId;
}

async function loadProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("asaas_api_key, asaas_environment")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.asaas_api_key) throw new Error("Configure sua API Key do ASAAS em Configurações");
  return { key: data.asaas_api_key as string, env: (data.asaas_environment as string) || "sandbox" };
}

export const createAsaasChargeForPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { key, env } = await loadProfile(supabase, userId);

    const { data: payment, error: pErr } = await supabase
      .from("payments")
      .select("id, amount, due_date, asaas_payment_id, asaas_invoice_url, contract_id, reference_month")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!payment) throw new Error("Pagamento não encontrado");
    if (payment.asaas_payment_id && payment.asaas_invoice_url) {
      return { paymentId: payment.asaas_payment_id, invoiceUrl: payment.asaas_invoice_url, reused: true };
    }

    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("id, tenant_id, tenant:tenants(id, full_name, cpf, email, phone, asaas_customer_id)")
      .eq("id", payment.contract_id)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract?.tenant) throw new Error("Inquilino do contrato não encontrado");

    const customerId = await ensureAsaasCustomer({ supabase }, env, key, contract.tenant);
    const refLabel = payment.reference_month ? new Date(payment.reference_month + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "";

    const created = await asaasFetch(env, key, "/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: Number(payment.amount),
        dueDate: payment.due_date,
        description: `Aluguel ${refLabel}`.trim(),
        externalReference: payment.id,
      }),
    });

    const asaasPaymentId = String(created.id);
    const invoiceUrl = (created.invoiceUrl as string) || (created.bankSlipUrl as string) || "";

    const { error: uErr } = await supabase
      .from("payments")
      .update({ asaas_payment_id: asaasPaymentId, asaas_invoice_url: invoiceUrl })
      .eq("id", payment.id);
    if (uErr) throw uErr;

    return { paymentId: asaasPaymentId, invoiceUrl, reused: false };
  });

export const createAsaasChargesForContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ contractId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { key, env } = await loadProfile(supabase, userId);

    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("id, tenant:tenants(id, full_name, cpf, email, phone, asaas_customer_id)")
      .eq("id", data.contractId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract?.tenant) throw new Error("Contrato/inquilino não encontrado");

    const customerId = await ensureAsaasCustomer({ supabase }, env, key, contract.tenant);

    const { data: payments, error: pErr } = await supabase
      .from("payments")
      .select("id, amount, due_date, reference_month, asaas_payment_id")
      .eq("contract_id", data.contractId)
      .is("asaas_payment_id", null)
      .order("due_date", { ascending: true });
    if (pErr) throw pErr;

    let ok = 0; let fail = 0; const errors: string[] = [];
    for (const p of payments ?? []) {
      try {
        const refLabel = p.reference_month ? new Date(p.reference_month + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "";
        const created = await asaasFetch(env, key, "/payments", {
          method: "POST",
          body: JSON.stringify({
            customer: customerId,
            billingType: "BOLETO",
            value: Number(p.amount),
            dueDate: p.due_date,
            description: `Aluguel ${refLabel}`.trim(),
            externalReference: p.id,
          }),
        });
        await supabase.from("payments").update({
          asaas_payment_id: String(created.id),
          asaas_invoice_url: (created.invoiceUrl as string) || (created.bankSlipUrl as string) || "",
        }).eq("id", p.id);
        ok++;
      } catch (e) {
        fail++; errors.push((e as Error).message);
      }
    }
    return { created: ok, failed: fail, errors: errors.slice(0, 3) };
  });
