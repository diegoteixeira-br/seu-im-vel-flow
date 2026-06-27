import { supabase } from "@/integrations/supabase/client";

export async function uploadBlogCover(args: { data: { base64: string } } | { base64: string }) {
  const base64 = (args as any)?.data?.base64 ?? (args as any)?.base64;
  const { data, error } = await supabase.functions.invoke("blog-cover", {
    body: { base64 },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { url: string };
}
