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
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">A</div>
            <span className="text-lg font-semibold">AlugaFlow</span>
          </div>
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

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} AlugaFlow
      </footer>
    </div>
  );
}
