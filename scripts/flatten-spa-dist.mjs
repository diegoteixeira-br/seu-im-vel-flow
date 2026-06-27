#!/usr/bin/env node
// Pós-build SPA: o TanStack Start gera `dist/client/` (assets + _shell.html)
// e `dist/server/` (entry SSR, não usado em produção estática).
// Para Hostinger queremos APENAS uma pasta `dist/` plana, com `index.html`
// na raiz. Este script:
//   1. Move o conteúdo de `dist/client/` para `dist/`
//   2. Renomeia `_shell.html` para `index.html` (SPA fallback)
//   3. Remove `dist/server/` e `dist/client/`
import { rm, rename, readdir, stat, mkdir, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd(), "dist");
const clientDir = join(root, "client");
const serverDir = join(root, "server");

if (!existsSync(clientDir)) {
  console.warn("[flatten-spa-dist] dist/client não encontrado, abortando.");
  process.exit(0);
}

// 1) Move tudo de dist/client/* para dist/
for (const entry of await readdir(clientDir)) {
  const src = join(clientDir, entry);
  const dest = join(root, entry);
  if (existsSync(dest)) await rm(dest, { recursive: true, force: true });
  await rename(src, dest);
}

// 2) _shell.html -> index.html
const shell = join(root, "_shell.html");
if (existsSync(shell)) {
  await rename(shell, join(root, "index.html"));
}

// 3) Limpa client/ e server/
await rm(clientDir, { recursive: true, force: true });
if (existsSync(serverDir)) await rm(serverDir, { recursive: true, force: true });

console.log("[flatten-spa-dist] dist/ pronto para deploy estático.");
