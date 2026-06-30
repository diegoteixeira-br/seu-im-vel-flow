import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PublicListings } from "@/components/public-listings";
import { PublicFooter, PublicHeader } from "./anuncios";
import { listPublishedPosts } from "@/lib/posts.functions";
import { formatDateBR } from "@/lib/blog-utils";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlugaFlow | Sistema de Gestão de Aluguéis e Imóveis" },
      { name: "description", content: "Gestão de inquilinos, contratos de aluguel automáticos, cobrança integrada (PIX e boleto) e controle financeiro completo para proprietários e imobiliárias. Anuncie grátis e gerencie tudo em um só lugar." },
      { name: "keywords", content: "gestão de aluguéis, gestão de inquilinos, contratos de aluguel automáticos, cobrança integrada, controle financeiro imobiliário, software para imobiliária, sistema para proprietários" },
      { property: "og:title", content: "AlugaFlow | Sistema de Gestão de Aluguéis e Imóveis" },
      { property: "og:description", content: "Gestão de inquilinos, contratos automáticos, cobrança integrada e controle financeiro para proprietários e imobiliárias." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AlugaFlow | Sistema de Gestão de Aluguéis e Imóveis" },
      { name: "twitter:description", content: "Gestão de inquilinos, contratos automáticos, cobrança integrada e controle financeiro." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

function Landing() {
  useAuth();
  const { data } = useQuery({ queryKey: ["latest-posts"], queryFn: () => listPublishedPosts({ data: { limit: 3 } }) });
  const latest = data?.rows ?? [];

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

      {latest.length > 0 && (
        <section className="border-t py-12">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Últimas notícias</h2>
                <p className="mt-1 text-sm text-muted-foreground">Mercado imobiliário, dicas e novidades.</p>
              </div>
              <Link to="/blog" className="text-sm font-medium text-primary hover:underline">Ver todas →</Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((p) => (
                <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group overflow-hidden rounded-lg border bg-card transition hover:shadow-md">
                  {p.cover_image_url && (
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img src={p.cover_image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-semibold leading-tight">{p.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{formatDateBR(p.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}
