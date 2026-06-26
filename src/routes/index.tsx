import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Building2, Users, FileText, Wallet, TrendingUp, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlugaFlow — Gestão imobiliária para proprietários" },
      { name: "description", content: "Controle imóveis, contratos e recebimentos em um só lugar. Para proprietários independentes brasileiros." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandLogo size={36} />

          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
            <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link></Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Gestão de aluguéis,<br />sem planilha.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          O AlugaFlow ajuda proprietários independentes a controlar imóveis, contratos,
          pagamentos e despesas de forma simples e profissional.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">Já tenho conta</Link></Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">
        {[
          { icon: Building2, title: "Imóveis", desc: "Cadastre cada imóvel com endereço, características e status." },
          { icon: Users, title: "Inquilinos", desc: "Mantenha os dados de contato e CPF organizados." },
          { icon: FileText, title: "Contratos", desc: "Vigência, valor e dia de vencimento sempre à mão." },
          { icon: Wallet, title: "Pagamentos", desc: "Acompanhe recebimentos e atrasos por mês." },
          { icon: TrendingUp, title: "Despesas", desc: "Registre IPTU, condomínio, manutenção e reformas." },
          { icon: Shield, title: "Seguro", desc: "Seus dados ficam protegidos com Supabase Auth + RLS." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border bg-card p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Como funciona</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Comece em minutos e organize sua carteira de aluguéis.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", title: "Cadastre seus imóveis", desc: "Adicione cada propriedade com endereço, valor e características." },
              { n: "2", title: "Vincule inquilinos e contratos", desc: "Registre inquilinos e gere contratos com vigência e vencimento." },
              { n: "3", title: "Acompanhe pagamentos automaticamente", desc: "Veja recebimentos, atrasos e despesas em tempo real." },
            ].map((s) => (
              <div key={s.n} className="rounded-lg border bg-card p-6">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-bold">{s.n}</div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Planos para cada momento</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Comece grátis. Evolua quando precisar.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { name: "Gratuito", price: "R$ 0", period: "para sempre", highlight: false, features: ["Até 2 imóveis", "Inquilinos e contratos", "Controle de pagamentos"], cta: "Começar grátis" },
            { name: "Investidor", price: "R$ 49,90", period: "/mês", highlight: true, features: ["Imóveis ilimitados", "Relatórios completos", "Suporte prioritário"], cta: "Assinar Investidor" },
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
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-[hsl(var(--success,142_71%_45%))] text-green-600" />{f}</li>
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
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-muted-foreground">
          © 2025 AlugaFlow. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
