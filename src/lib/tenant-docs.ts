import { supabase } from "@/integrations/supabase/client";

export const TENANT_DOC_BUCKET = "tenant-documents";

export const TENANT_DOC_TYPES = [
  "rg_cnh_frente",
  "rg_cnh_verso",
  "comprovante_renda",
  "comprovante_residencia",
] as const;

export type TenantDocType = (typeof TENANT_DOC_TYPES)[number];

export const TENANT_DOC_LABEL: Record<TenantDocType, string> = {
  rg_cnh_frente: "RG/CNH (frente)",
  rg_cnh_verso: "RG/CNH (verso)",
  comprovante_renda: "Comprovante de renda",
  comprovante_residencia: "Comprovante de residência",
};

export async function uploadTenantDoc(params: {
  userId: string;
  tenantId: string;
  file: File;
}): Promise<string> {
  const { userId, tenantId, file } = params;
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${userId}/${tenantId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(TENANT_DOC_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function getTenantDocSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(TENANT_DOC_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteTenantDocFile(path: string) {
  await supabase.storage.from(TENANT_DOC_BUCKET).remove([path]);
}

export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}
