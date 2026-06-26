# Plano: "Gerar capa com IA" no editor do blog

Adicionar um botão **"Gerar capa com IA"** dentro do editor de posts em `/admin/blog`. Você escreve um prompt em português, a IA gera a imagem (PNG), o arquivo é salvo no Supabase Storage e o campo `cover_image_url` do post é preenchido automaticamente.

## Como vai funcionar (UX)

No `Dialog` de criar/editar post, ao lado do campo "URL da foto de capa":

1. Botão **"✨ Gerar com IA"** abre um mini-painel com:
   - Campo de prompt (textarea), já pré-preenchido com uma sugestão baseada no título do post (ex.: "Foto profissional para artigo sobre [título], estilo fotografia imobiliária brasileira, iluminação natural, 16:9").
   - Seletor de estilo rápido: Fotografia / Ilustração / Minimalista.
   - Botão **"Gerar"**.
2. Durante a geração, mostra uma prévia desfocada que vai ganhando nitidez (streaming progressivo).
3. Quando finaliza, mostra a imagem final + 2 botões: **"Usar esta capa"** (salva no Storage e preenche `cover_image_url`) ou **"Gerar outra"**.

## Onde os arquivos vão ficar

- Novo bucket público no Supabase Storage: **`blog-covers`** (criado via tool).
- Arquivos salvos como `blog-covers/{post_id_ou_timestamp}.png`.
- A URL pública do bucket vira o `cover_image_url`.

## Mudanças técnicas

### 1. Backend (TanStack server route — streaming)
- **Novo arquivo:** `src/routes/api/generate-blog-cover.ts`
  - Server route POST que recebe `{ prompt }`.
  - Chama `https://ai.gateway.lovable.dev/v1/images/generations` com:
    - `model: "openai/gpt-image-2"`
    - `quality: "low"` (padrão — rápido e barato)
    - `size: "1536x1024"` (formato 16:9 ideal pra capa de blog)
    - `stream: true`, `partial_images: 1`
  - Retorna o body SSE direto pro cliente (passthrough).
  - Usa `LOVABLE_API_KEY` do `process.env`.
- **Novo arquivo:** `src/lib/stream-image.ts`
  - Helper cliente com `eventsource-parser` + `flushSync` (padrão obrigatório da documentação) pra consumir o stream e devolver frames parciais e finais.

### 2. Server function pra upload final
- **Novo arquivo:** `src/lib/blog-cover.functions.ts`
  - `createServerFn` com `.middleware([requireSupabaseAuth])` + verificação de role `admin` via `has_role`.
  - Recebe `{ base64, postId? }`, faz upload no bucket `blog-covers` via `supabaseAdmin` (carregado dinamicamente dentro do handler) e retorna `{ url }`.

### 3. Storage
- Criar bucket público `blog-covers` (via tool `supabase--storage_create_bucket`).
- Política RLS em `storage.objects`: SELECT público; INSERT/UPDATE/DELETE só pra admin (usando `has_role`).

### 4. Frontend
- **Novo componente:** `src/components/ai-cover-generator.tsx`
  - Dialog/popover acionado por um botão dentro do editor.
  - Estado: `prompt`, `isStreaming`, `currentImage` (data URL), `isFinal`.
  - Aplica `blur-2xl` nos frames parciais e remove no final (conforme regra da doc).
  - Chama a server function de upload e dispara callback `onCoverReady(url)` que preenche `editing.cover_image_url`.
- **Editar:** `src/routes/_authenticated/admin.blog.tsx`
  - Adicionar `<AiCoverGenerator title={editing.title} onCoverReady={url => setEditing({...editing, cover_image_url: url})} />` logo abaixo do input "URL da foto de capa".

### 5. Pacote npm
- Instalar `eventsource-parser` (~4kb) via `bun add eventsource-parser`.

### 6. Dependência: `LOVABLE_API_KEY`
- A key Lovable AI Gateway precisa existir no projeto. Se não existir, vou provisionar automaticamente. Cobrança: cada geração consome créditos da workspace (model `gpt-image-2` em quality `low` — barato).

## O que NÃO vou mudar

- As 5 capas atuais (Unsplash) continuam como estão. Você pode trocá-las uma a uma editando cada post e clicando em "Gerar com IA".
- Nenhuma alteração no blog público, listagem, ou demais módulos.

## Resultado

Você abre `/admin/blog` → edita ou cria um post → clica em "✨ Gerar com IA" → escreve algo tipo "Família feliz recebendo as chaves de um apartamento novo, estilo fotografia editorial" → vê a imagem aparecer em tempo real → clica em "Usar esta capa" e pronto, o post está com capa nova gerada por IA.
