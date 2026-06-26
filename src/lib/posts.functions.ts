import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listPublishedPosts = createServerFn({ method: "GET" })
  .inputValidator((d: { page?: number; pageSize?: number; limit?: number }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    if (data.limit) {
      const { data: rows } = await sb.from("posts").select("id,title,slug,excerpt,cover_image_url,author_name,created_at").eq("published", true).order("created_at", { ascending: false }).limit(data.limit);
      return { rows: rows ?? [], total: rows?.length ?? 0 };
    }
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 9;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: rows, count } = await sb.from("posts").select("id,title,slug,excerpt,cover_image_url,author_name,created_at", { count: "exact" }).eq("published", true).order("created_at", { ascending: false }).range(from, to);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const getPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: post } = await sb.from("posts").select("*").eq("slug", data.slug).eq("published", true).maybeSingle();
    if (!post) return { post: null, related: [] };
    const { data: related } = await sb.from("posts").select("id,title,slug,excerpt,cover_image_url,created_at").eq("published", true).neq("id", post.id).order("created_at", { ascending: false }).limit(3);
    return { post, related: related ?? [] };
  });

export const listAllPostSlugs = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("posts").select("slug,updated_at").eq("published", true);
  return data ?? [];
});
