import { supabase } from "@/integrations/supabase/client";

const BUCKET = "property-photos";

type Transform = { width?: number; height?: number; quality?: number };

/**
 * Get signed URLs for property photos. Optional transform appends Supabase
 * image-render query params to deliver smaller, resized thumbnails.
 */
export async function getPhotoUrls(
  paths: string[],
  transform?: Transform,
): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  if (error) {
    console.error("[public-photos] signed url error", error);
    return {};
  }
  const map: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.signedUrl && d.path) {
      let url = d.signedUrl;
      if (transform) {
        const params: string[] = [];
        if (transform.width) params.push(`width=${transform.width}`);
        if (transform.height) params.push(`height=${transform.height}`);
        if (transform.quality) params.push(`quality=${transform.quality}`);
        if (params.length) url += (url.includes("?") ? "&" : "?") + params.join("&");
      }
      map[d.path] = url;
    }
  });
  return map;
}
