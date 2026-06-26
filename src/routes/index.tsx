import { BrandLogo } from "@/components/brand-logo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Bed, Bath, Maximize, MapPin, Building2, Users, FileText, Wallet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getPhotoUrls } from "@/lib/public-photos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlugaFlow — Encontre seu próximo lar em Cáceres e região" },
      { name: "description", content: "Portal de aluguel direto com o proprietário. Encontre casas, apartamentos e imóveis comerciais em Cáceres e região." },
      { property: "og:title", content: "AlugaFlow — Aluguel direto com o proprietário" },
      { property: "og:description", content: "Imóveis para alugar em Cáceres e região, sem taxas de imobiliária." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, ad_title, nickname, neighborhood, city, state, bedrooms, bathrooms, area_m2, rent_amount")
        .eq("listed_public", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      const list = data ?? [];
      if (list.length) {
        const { data: photos } = await supabase
          .from("property_photos")
          .select("property_id, storage_path, sort_order")
          .in("property_id", list.map((p) => p.id))
          .order("sort_order");
        const byProp = new Map<string, string>();
        for (const ph of photos ?? []) if (!byProp.has(ph.property_id)) byProp.set(ph.property_id, ph.storage_path);
        const urls = await getPhotoUrls(Array.from(byProp.values()));
        return list.map((p) => ({ ...p, cover_url: byProp.get(p.id) ? urls[byProp.get(p.id)!] : undefined }));
      }
      return list as Array<typeof list[number] & { cover_url?: string }>;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandLogo size={36} />
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/anuncios">Anúncios</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/auth" search={{ mode: "signup" }}>Anunciar imóvel</Link></Button>
            <Button asChild size="sm"><Link to="/auth">Entrar</Link></Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Encontre seu próximo lar<br />em Cáceres e região
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Imóveis para alugar direto com o proprietário, sem intermediários.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/anuncios" });
            }}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border bg-card p-3 shadow-lg sm:flex-row"
          >
            <Input
              placeholder="Cidade ou bairro"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="flex-1 border-0 shadow-none focus-visible:ring-0"
            />
            <Input
              placeholder="Tipo (casa, apartamento...)"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex-1 border-0 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="lg" className="gap-2"><Search className="h-4 w-4" /> Buscar</Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Imóveis recentes</h2>
            <p className="text-sm text-muted-foreground">Anunciados nos últimos dias</p>
          </div>
          <Button asChild variant="outline"><Link to="/anuncios">Ver todos</Link></Button>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Nenhum imóvel anunciado ainda. <Link to="/auth" search={{ mode: "signup" }} className="text-primary hover:underline">Seja o primeiro a anunciar.</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <Link key={p.id} to="/anuncios/$id" params={{ id: p.id }} className="group">
                <Card className="overflow-hidden transition hover:shadow-md">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt={p.ad_title ?? p.nickname} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">Sem foto</div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="text-lg font-bold text-primary">{formatBRL(p.rent_amount)}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                    <h3 className="mt-1 line-clamp-1 font-semibold">{p.ad_title ?? p.nickname}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {[p.neighborhood, p.city, p.state].filter(Boolean).join(", ")}
                    </p>
                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" /> {p.bedrooms ?? 0}</span>
                      <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {p.bathrooms ?? 0}</span>
                      {p.area_m2 ? <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" /> {p.area_m2} m²</span> : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Para proprietários</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Gestão completa dos seus aluguéis</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Anuncie grátis e ainda controle imóveis, contratos, pagamentos e despesas em um só lugar.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              { icon: Building2, title: "Imóveis", desc: "Cadastre e organize sua carteira." },
              { icon: Users, title: "Inquilinos", desc: "Dados completos e documentos." },
              { icon: FileText, title: "Contratos", desc: "Modelos prontos e assinatura digital." },
              { icon: Wallet, title: "Pagamentos", desc: "Cobrança automática via ASAAS." },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6">
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Planos</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Anuncie e gerencie no plano certo para você.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { name: "Gratuito", price: "R$ 0", period: "para sempre", highlight: false, features: ["Até 2 anúncios no portal", "Gestão de imóveis e contratos", "Controle de pagamentos"], cta: "Começar grátis" },
            { name: "Investidor", price: "R$ 49,90", period: "/mês", highlight: true, features: ["Anúncios ilimitados", "Relatórios completos", "Cobrança automática"], cta: "Assinar Investidor" },
            { name: "Imobiliária", price: "R$ 197", period: "/mês", highlight: false, features: ["Múltiplos usuários", "Permissões por equipe", "Suporte dedicado"], cta: "Falar com vendas" },
          ].map((p) => (
            <div key={p.name} className={`rounded-lg border bg-card p-6 ${p.highlight ? "border-primary shadow-lg ring-1 ring-primary" : ""}`}>
              {p.highlight && <div className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Mais popular</div>}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" />{f}</li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={p.highlight ? "default" : "outline"}>
                <Link to="/auth" search={{ mode: "signup" }}>{p.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <BrandLogo size={28} />
            <p className="mt-2 text-xs text-muted-foreground">Direto entre proprietários e inquilinos.</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Sobre</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><Link to="/">Sobre o AlugaFlow</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Para proprietários</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><Link to="/anuncios">Anúncios</Link></li>
              <li><Link to="/auth" search={{ mode: "signup" }}>Anunciar grátis</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Contato</p>
            <p className="mt-2 text-sm text-muted-foreground">contato@alugaflow.com.br</p>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">© 2025 AlugaFlow. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}
