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

async function deleteUserFolder(client: any, bucket: string, prefix: string) {
  const toDelete: string[] = [];
  const stack: string[] = [prefix];
  while (stack.length) {
    const dir = stack.pop()!;
    const { data, error } = await client.storage.from(bucket).list(dir, { limit: 1000 });
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
    for (let i = 0; i < toDelete.length; i += 100) {
      await client.storage.from(bucket).remove(toDelete.slice(i, i + 100));
    }
  }
}

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    // 1. Storage cleanup (best-effort, scoped to user's folder via RLS)
    for (const bucket of BUCKETS) {
      try {
        await deleteUserFolder(supabase, bucket, userId);
      } catch {
        // continue
      }
    }

    // 2. Delete all DB rows + auth user via SECURITY DEFINER RPC
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw new Error(error.message);

    return { ok: true };
  });
