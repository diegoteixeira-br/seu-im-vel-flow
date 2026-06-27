// SPA build configuration — gera pasta `dist/` com arquivos estáticos (HTML/CSS/JS)
// pronta para hospedagem compartilhada (Hostinger public_html).
//
// O que mudou em relação ao modo SSR original:
//  - `nitro: false`  → desliga o build do worker/Cloudflare e não gera `.output/`.
//  - `tanstackStart.spa.enabled: true` → TanStack Start gera um shell HTML único
//    que hidrata no cliente (sem SSR). Todas as rotas são servidas pelo mesmo
//    index.html.
//  - `vite.build.outDir: "dist"` → saída final em `dist/`.
//
// IMPORTANTE: Server Functions (`createServerFn`) e rotas `/api/public/*`
// continuam no código-fonte, mas NÃO funcionarão em produção até serem
// migradas para Supabase Edge Functions (próxima etapa).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: false,
  tanstackStart: {
    // Mantém o wrapper de erro de SSR para dev local; em produção SPA não é usado.
    server: { entry: "server" },
    // SPA mode: renderiza um shell estático e hidrata no cliente.
    spa: { enabled: true },
  },
  vite: {
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  },
});
