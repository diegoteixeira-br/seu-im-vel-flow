import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/anuncios")({
  head: () => ({
    meta: [
      { title: "Imóveis para alugar — AlugaFlow" },
      { name: "description", content: "Encontre casas, apartamentos e imóveis comerciais para alugar diretamente com o proprietário." },
      { property: "og:title", content: "Imóveis para alugar — AlugaFlow" },
      { property: "og:description", content: "Portal de anúncios diretamente com proprietários." },
    ],
  }),
  component: () => <Outlet />,
});

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/"><BrandLogo size={32} /></Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/anuncios">Anúncios</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/para-proprietarios">Anunciar meu imóvel</Link></Button>
          <Button asChild size="sm"><Link to="/auth">Entrar</Link></Button>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <BrandLogo size={28} />
          <p className="mt-2 text-xs text-muted-foreground">Direto entre proprietários e inquilinos.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Navegar</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li><Link to="/">Início</Link></li>
            <li><Link to="/anuncios">Anúncios</Link></li>
            <li><Link to="/sobre">Sobre</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Para proprietários</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li><Link to="/para-proprietarios">Anunciar meu imóvel</Link></li>
            <li><Link to="/auth">Já sou cliente → Entrar</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Contato</p>
          <p className="mt-2 text-sm text-muted-foreground">contato@alugaflow.com.br</p>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p><Link to="/privacidade">Política de Privacidade</Link></p>
            <p><Link to="/termos">Termos de Uso</Link></p>
          </div>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">© 2026 AlugaFlow. Todos os direitos reservados.</div>
    </footer>
  );
}