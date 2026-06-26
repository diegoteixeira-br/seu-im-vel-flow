import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKETS = [
  "property-photos",
  "tenant-documents",
  "signed-contracts",
  "branding",
  "blog-covers",
  "lead-documents",
];

async function deleteUserFolder(admin: any, bucket: string, prefix: string) {
  const toDelete: string[] = [];
  const stack: string[] = [prefix];
  while (stack.length) {
    const dir = stack.pop()!;
    const { data, error } = await admin.storage.from(bucket).list(dir, { limit: 1000 });
    if (error || !data) continue;
    for (const item of data) {
      const path = `${dir}/${item.name}`;
      if (item.id === null || !item.metadata) {
        stack.push(path);
      } else {
        toDelete.push(path);
      }
    }
  }
  if (toDelete.length) {
    // remove in chunks of 100
    for (let i = 0; i < toDelete.length; i += 100) {
      await admin.storage.from(bucket).remove(toDelete.slice(i, i + 100));
    }
  }
}

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Delete storage objects owned by this user
    for (const bucket of BUCKETS) {
      try {
        await deleteUserFolder(supabaseAdmin, bucket, userId);
      } catch {
        // continue
      }
    }

    // 2. Delete database rows. Most child rows cascade from parents via FK,
    // but we delete explicitly to be safe.
    // Delete contract_signatures via contract ids (no user_id column)
    const { data: contractRows } = await supabaseAdmin
      .from("contracts").select("id").eq("user_id", userId);
    const contractIds = (contractRows ?? []).map((r: { id: string }) => r.id);
    if (contractIds.length) {
      await supabaseAdmin.from("contract_signatures").delete().in("contract_id", contractIds);
    }

    const tables = [
      "inspection_photos",
      "inspections",
      "payments",
      "expenses",
      "property_photos",
      "tenant_documents",
      "contracts",
      "tenants",
      "properties",
      "leads",
      "user_roles",

    ] as const;

    for (const t of tables) {
      await supabaseAdmin.from(t).delete().eq("user_id", userId);
    }

    await supabaseAdmin.from("profiles").delete().eq("id", userId);



    // 3. Delete the auth user (this also signs them out everywhere)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
