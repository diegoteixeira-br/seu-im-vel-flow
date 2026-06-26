import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, Wallet, Check, Camera, BarChart3, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/para-proprietarios")({
  head: () => ({
    meta: [
      { title: "Para proprietários — AlugaFlow" },
      { name: "description", content: "Gestão completa de aluguéis: imóveis, inquilinos, contratos e cobrança automática. Conheça a ferramenta e os planos." },
      { property: "og:title", content: "Para proprietários — AlugaFlow" },
      { property: "og:description", content: "Gestão completa de aluguéis em um só lugar." },
    ],
  }),
  component: Page,
});

const FEATURES = [
  { icon: Building2, title: "Imóveis", desc: "Cadastre e organize sua carteira com fotos e detalhes." },
  { icon: Users, title: "Inquilinos", desc: "Dados completos, documentos e fiador." },
  { icon: FileText, title: "Contratos", desc: "Modelos prontos e assinatura digital." },
  { icon: Wallet, title: "Pagamentos", desc: "Cobrança automática via ASAAS e PIX." },
  { icon: Camera, title: "Vistorias", desc: "Vistoria por cômodo com geração de PDF." },
  { icon: BarChart3, title: "Relatórios", desc: "Receitas, despesas e exportação CSV." },
  { icon: ShieldCheck, title: "Portal de anúncios", desc: "Divulgue seus imóveis e receba leads." },
  { icon: FileText, title: "Documentos prontos", desc: "Distrato, confissão de dívida e mais." },
];

const PLANS = [
  { name: "Gratuito", price: "R$ 0", period: "para sempre", highlight: false, features: ["Até 2 anúncios no portal", "Gestão de imóveis e contratos", "Controle de pagamentos"], cta: "Começar grátis" },
  { name: "Investidor", price: "R$ 49,90", period: "/mês", highlight: true, features: ["Anúncios ilimitados", "Relatórios completos", "Cobrança automática via ASAAS"], cta: "Assinar Investidor" },
  { name: "Imobiliária", price: "R$ 197", period: "/mês", highlight: false, features: ["Múltiplos usuários", "Permissões por equipe", "Suporte dedicado"], cta: "Falar com vendas" },
];

function Page() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/"><BrandLogo size={32} /></Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/">Imóveis</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/sobre">Sobre</Link></Button>
            <Button asChild size="sm"><Link to={user ? "/dashboard" : "/auth"}>{user ? "Painel" : "Entrar"}</Link></Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Para proprietários</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Gestão completa dos seus aluguéis</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-lg">
            Anuncie grátis e ainda controle imóveis, contratos, pagamentos e despesas em um só lugar — sem planilhas, sem dor de cabeça.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link></Button>
            <Button asChild size="lg" variant="outline"><a href="#planos">Ver planos</a></Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Tudo o que você precisa</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Da captação do inquilino à cobrança do aluguel.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Planos e preços</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Escolha o plano certo para o seu momento.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
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
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Pronto para simplificar sua gestão?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Crie sua conta gratuita em menos de 1 minuto.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Criar conta grátis</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/">Ver imóveis</Link></Button>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2"><BrandLogo size={20} /> © 2025 AlugaFlow</div>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground">Imóveis</Link>
            <Link to="/sobre" className="hover:text-foreground">Sobre</Link>
            <Link to="/planos" className="hover:text-foreground">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
