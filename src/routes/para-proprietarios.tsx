import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/para-proprietarios")({
  head: () => ({
    meta: [
      { title: "Para proprietários — AlugaFlow" },
      { name: "description", content: "Gestão completa de aluguéis: imóveis, inquilinos, contratos e cobrança automática." },
      { property: "og:title", content: "Para proprietários — AlugaFlow" },
      { property: "og:description", content: "Gestão completa de aluguéis em um só lugar." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/"><BrandLogo size={32} /></Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/">Imóveis</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/planos">Planos</Link></Button>
            <Button asChild size="sm"><Link to={user ? "/dashboard" : "/auth"}>{user ? "Painel" : "Entrar"}</Link></Button>
          </nav>
        </div>
      </header>

      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Para proprietários</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Gestão completa dos seus aluguéis</h1>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Anuncie grátis e ainda controle imóveis, contratos, pagamentos e despesas em um só lugar.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
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
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/planos">Ver planos</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
