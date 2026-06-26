import { supabase } from "@/integrations/supabase/client";

const BUCKET = "property-photos";

type Transform = { width?: number; height?: number; quality?: number };

/**
 * Get signed URLs for property photos. Optional transform resizes images
 * server-side (Supabase image transformation) — much smaller payloads for
 * thumbnails on the public portal.
 */
export async function getPhotoUrls(
  paths: string[],
  transform?: Transform,
): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 3600, transform ? { transform } : undefined);
  if (error) {
    console.error("[public-photos] signed url error", error);
    return {};
  }
  const map: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.signedUrl && d.path) map[d.path] = d.signedUrl;
  });
  return map;
}
