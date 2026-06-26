import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listAllPostSlugs } from "@/lib/posts.functions";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = await listAllPostSlugs();
        const staticEntries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/anuncios", priority: "0.9", changefreq: "daily" },
          { path: "/blog", priority: "0.8", changefreq: "weekly" },
          { path: "/para-proprietarios", priority: "0.7", changefreq: "monthly" },
          { path: "/sobre", priority: "0.5", changefreq: "yearly" },
        ];
        const postEntries = posts.map((p: { slug: string; updated_at: string }) => ({
          path: `/blog/${p.slug}`,
          lastmod: p.updated_at,
          changefreq: "monthly",
          priority: "0.7",
        }));
        const all = [...staticEntries, ...postEntries];
        const urls = all.map((e) => [
          `  <url>`,
          `    <loc>${BASE_URL}${e.path}</loc>`,
          "lastmod" in e && e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
          `    <changefreq>${e.changefreq}</changefreq>`,
          `    <priority>${e.priority}</priority>`,
          `  </url>`,
        ].filter(Boolean).join("\n"));
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
