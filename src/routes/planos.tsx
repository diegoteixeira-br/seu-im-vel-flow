import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — AlugaFlow" },
      { name: "description", content: "Escolha o plano ideal: Gratuito, Investidor ou Imobiliária." },
      { property: "og:title", content: "Planos e preços — AlugaFlow" },
      { property: "og:description", content: "Anuncie e gerencie no plano certo para você." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const plans = [
    { name: "Gratuito", price: "R$ 0", period: "para sempre", highlight: false, features: ["Até 2 anúncios no portal", "Gestão de imóveis e contratos", "Controle de pagamentos"], cta: "Começar grátis" },
    { name: "Investidor", price: "R$ 49,90", period: "/mês", highlight: true, features: ["Anúncios ilimitados", "Relatórios completos", "Cobrança automática"], cta: "Assinar Investidor" },
    { name: "Imobiliária", price: "R$ 197", period: "/mês", highlight: false, features: ["Múltiplos usuários", "Permissões por equipe", "Suporte dedicado"], cta: "Falar com vendas" },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/"><BrandLogo size={32} /></Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/">Imóveis</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/para-proprietarios">Para proprietários</Link></Button>
            <Button asChild size="sm"><Link to={user ? "/dashboard" : "/auth"}>{user ? "Painel" : "Entrar"}</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Planos</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Anuncie e gerencie no plano certo para você.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
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
    </div>
  );
}
