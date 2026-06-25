import { createFileRoute } from "@tanstack/react-router";

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}
function isValidCPF(cpf: string): boolean {
  const c = onlyDigits(cpf);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(c[i]) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(c[9]) && calc(10) === parseInt(c[10]);
}

async function getContractView(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: sig, error } = await supabaseAdmin
    .from("contract_signatures")
    .select("id, role, name, email, signed_at, contract_id")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!sig) return null;

  const { data: contract } = await supabaseAdmin
    .from("contracts")
    .select(`
      id, user_id, contract_type, start_date, end_date, rent_amount, due_day,
      adjustment_index, adjustment_frequency_months, guarantee_type, guarantee_months,
      extra_charges, notes, deposit_amount,
      guarantor_name, guarantor_cpf, guarantor_rg, guarantor_email, guarantor_phone, guarantor_address,
      property:properties(nickname,address,city,state,zip_code,type,bedrooms,area_m2),
      tenant:tenants(full_name,cpf,rg,email,phone,address_street,address_number,address_neighborhood,address_city,address_state)
    `)
    .eq("id", sig.contract_id)
    .maybeSingle();

  if (!contract) return null;

  const { data: ownerProfile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, cpf, phone, address_street, address_number, address_neighborhood, address_city, address_uf, address_zip, bank_name, bank_agency, bank_account, pix_key")
    .eq("id", contract.user_id)
    .maybeSingle();

  const { data: allSigs } = await supabaseAdmin
    .from("contract_signatures")
    .select("role, name, signed_at")
    .eq("contract_id", sig.contract_id)
    .order("created_at", { ascending: true });

  return { signature: sig, contract, owner: ownerProfile, signatures: allSigs ?? [] };
}

export const Route = createFileRoute("/api/public/sign-contract")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        if (!token) return Response.json({ error: "missing token" }, { status: 400 });
        const view = await getContractView(token);
        if (!view) return Response.json({ error: "invalid token" }, { status: 404 });
        return Response.json(view);
      },
      POST: async ({ request }) => {
        let body: { token?: string; signed_name?: string; signed_cpf?: string };
        try { body = await request.json(); } catch { return Response.json({ error: "invalid body" }, { status: 400 }); }
        const token = body.token ?? "";
        const name = (body.signed_name ?? "").trim();
        const cpf = onlyDigits(body.signed_cpf ?? "");
        if (!token || name.length < 3) return Response.json({ error: "Nome obrigatório" }, { status: 400 });
        if (!isValidCPF(cpf)) return Response.json({ error: "CPF inválido" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: sig, error } = await supabaseAdmin
          .from("contract_signatures")
          .select("id, contract_id, signed_at")
          .eq("token", token)
          .maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!sig) return Response.json({ error: "Token inválido" }, { status: 404 });
        if (sig.signed_at) return Response.json({ error: "Já assinado" }, { status: 409 });

        const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
        const { error: uErr } = await supabaseAdmin
          .from("contract_signatures")
          .update({ signed_name: name, signed_cpf: cpf, signed_at: new Date().toISOString(), signer_ip: ip })
          .eq("id", sig.id);
        if (uErr) return Response.json({ error: uErr.message }, { status: 500 });

        // Check if all signed → mark contract
        const { data: all } = await supabaseAdmin
          .from("contract_signatures")
          .select("signed_at")
          .eq("contract_id", sig.contract_id);
        const total = all?.length ?? 0;
        const done = (all ?? []).filter((x) => x.signed_at).length;
        if (total > 0 && done === total) {
          await supabaseAdmin
            .from("contracts")
            .update({ signature_status: "assinado", signed_at: new Date().toISOString() })
            .eq("id", sig.contract_id);
        } else if (done > 0) {
          await supabaseAdmin
            .from("contracts")
            .update({ signature_status: "parcial" })
            .eq("id", sig.contract_id);
        }

        return Response.json({ ok: true, completed: done === total });
      },
    },
  },
});
