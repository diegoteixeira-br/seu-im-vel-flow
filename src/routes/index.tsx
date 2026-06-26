import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { PublicListings } from "@/components/public-listings";
import { PublicFooter, PublicHeader } from "./anuncios";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlugaFlow — Imóveis para alugar direto com o proprietário" },
      { name: "description", content: "Portal de aluguel direto com o proprietário. Encontre casas, apartamentos e imóveis comerciais sem taxas de imobiliária." },
      { property: "og:title", content: "AlugaFlow — Aluguel direto com o proprietário" },
      { property: "og:description", content: "Imóveis para alugar, sem intermediários." },
    ],
  }),
  component: Landing,
});

function Landing() {
  useAuth();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <PublicListings variant="home" />

      <section className="border-t bg-gradient-to-br from-primary/10 via-background to-background py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">É proprietário ou imobiliária?</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Conheça o AlugaFlow por dentro</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Anuncie grátis, gerencie contratos, cobranças e relatórios em um só lugar.</p>
          <div className="mt-6">
            <a className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90" href="/para-proprietarios">Conhecer a ferramenta</a>
          </div>
        </div>
      </section>

      <PublicFooter />

    </div>
  );
}
