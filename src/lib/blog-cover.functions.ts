import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const uploadBlogCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { base64: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const path = `${context.userId}/${Date.now()}.png`;
    const { error } = await supabaseAdmin.storage
      .from("blog-covers")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (error) throw new Error(error.message);

    // Long-lived signed URL (10 years) since bucket is private.
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("blog-covers")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signErr || !signed) throw new Error(signErr?.message ?? "Falha ao gerar URL");

    return { url: signed.signedUrl };
  });
