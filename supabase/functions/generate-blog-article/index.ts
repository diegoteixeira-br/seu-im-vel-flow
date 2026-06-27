// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "google/gemini-2.5-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const body = await req.json();
    const action: "suggest_titles" | "generate_article" = body?.action;

    if (action === "suggest_titles") {
      const topic: string = (body?.topic ?? "").toString().trim();
      const count: number = Math.min(Math.max(Number(body?.count ?? 6), 3), 10);
      const sys = "Você é editor-chefe de um blog imobiliário brasileiro. Sugira títulos de artigos atuais, úteis, com foco em SEO, em português do Brasil. Responda APENAS com JSON.";
      const user = `Gere ${count} sugestões de títulos de artigos sobre o mercado imobiliário brasileiro atual${topic ? ` com foco em: "${topic}"` : ""}. Cubra temas como: Lei do Inquilinato, contratos de aluguel, IGP-M e IPCA (reajuste), taxa Selic e financiamento imobiliário, garantias locatícias, ITBI, due diligence, tendências de mercado, gestão para proprietários, vistoria, despejo, distratos, locação por temporada/Airbnb e LGPD para imobiliárias. Retorne JSON no formato: {"titles":[{"title":"...","angle":"breve ângulo/abordagem"}]}.`;
      const r = await callAI(key, sys, user, true);
      const parsed = safeJson(r);
      return json({ titles: parsed?.titles ?? [] });
    }

    if (action === "generate_article") {
      const title: string = (body?.title ?? "").toString().trim();
      const angle: string = (body?.angle ?? "").toString().trim();
      if (!title) return json({ error: "title é obrigatório" }, 400);
      const sys = "Você é redator especialista em mercado imobiliário brasileiro. Escreve com clareza, cita leis quando relevante (ex.: Lei 8.245/91), usa exemplos práticos e linguagem acessível ao proprietário independente. Sempre em português do Brasil. Responda APENAS com JSON válido.";
      const user = `Escreva um artigo de blog completo com o título: "${title}".${angle ? ` Abordagem: ${angle}.` : ""}

Requisitos:
- Resumo (excerpt) de até 150 caracteres, atrativo.
- Conteúdo em Markdown simples: use "## Subtítulo" para seções, "- " para listas e "**negrito**" para destaques. Não use imagens nem links.
- 6 a 9 seções, entre 700 e 1100 palavras no total.
- Inclua uma seção final "## Conclusão" com chamada para ação sutil para proprietários organizarem aluguéis com tecnologia.
- Evite promessas jurídicas absolutas; oriente a procurar um advogado quando necessário.

Retorne JSON: {"title":"...","slug":"slug-em-kebab-case","excerpt":"...","content":"markdown..."}`;
      const r = await callAI(key, sys, user, true);
      const parsed = safeJson(r);
      if (!parsed?.content) return json({ error: "Falha ao gerar artigo" }, 500);
      return json({
        title: parsed.title || title,
        slug: parsed.slug || "",
        excerpt: (parsed.excerpt || "").slice(0, 150),
        content: parsed.content,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

async function callAI(key: string, system: string, user: string, jsonMode: boolean) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function safeJson(s: string): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { /* try to extract */ }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
  return null;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
