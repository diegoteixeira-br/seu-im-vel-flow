import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SignerInput = { role: "locador" | "locatario" | "fiador"; name: string; email: string };

export const createSignatureInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      contractId: z.string().uuid(),
      signers: z.array(
        z.object({
          role: z.enum(["locador", "locatario", "fiador"]),
          name: z.string().min(2),
          email: z.string().email(),
        }),
      ).min(1).max(5),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Ensure caller owns the contract
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("id, user_id")
      .eq("id", data.contractId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract || contract.user_id !== userId) throw new Error("Contrato não encontrado");

    // Reset signatures: delete existing pending ones (idempotent), then insert
    await supabase.from("contract_signatures").delete().eq("contract_id", data.contractId);

    const rows = data.signers.map((s: SignerInput) => ({
      contract_id: data.contractId,
      role: s.role,
      name: s.name,
      email: s.email,
    }));
    const { data: inserted, error: iErr } = await supabase
      .from("contract_signatures")
      .insert(rows)
      .select("id, role, name, email, token");
    if (iErr) throw iErr;

    await supabase
      .from("contracts")
      .update({ signature_mode: "eletronica", signature_status: "pendente" })
      .eq("id", data.contractId);

    return { signatures: inserted ?? [] };
  });

export const listContractSignatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ contractId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("contract_signatures")
      .select("id, role, name, email, token, signed_at, signed_name, signed_cpf, signer_ip")
      .eq("contract_id", data.contractId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { signatures: rows ?? [] };
  });
