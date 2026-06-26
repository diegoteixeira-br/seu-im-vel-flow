import { supabase } from "@/integrations/supabase/client";

const BUCKET = "property-photos";

/**
 * Get URLs for property photos. Uses signed URLs which work for both
 * authenticated and anonymous users (storage policy allows public SELECT).
 */
export async function getPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
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
