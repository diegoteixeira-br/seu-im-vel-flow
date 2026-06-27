import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Menu } from "lucide-react";

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
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-3">
        <Link to="/" className="shrink-0"><BrandLogo size={32} /></Link>

        {/* Desktop nav */}
        <nav className="hidden items-center justify-end gap-2 md:flex">
          <Button asChild variant="ghost" size="sm"><Link to="/blog">Blog</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/sobre">Sobre</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/para-proprietarios">Anunciar meu imóvel</Link></Button>
        </nav>
        <span className="md:hidden" />

        {/* Right cluster: Entrar always visible + hamburger on mobile */}
        <div className="flex items-center justify-end gap-2">
          <Button asChild size="sm"><Link to="/auth">Entrar</Link></Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1">
                <SheetClose asChild><Link to="/blog" className="rounded-md px-3 py-2 text-sm hover:bg-muted">Blog</Link></SheetClose>
                <SheetClose asChild><Link to="/sobre" className="rounded-md px-3 py-2 text-sm hover:bg-muted">Sobre</Link></SheetClose>
                <SheetClose asChild><Link to="/para-proprietarios" className="rounded-md px-3 py-2 text-sm hover:bg-muted">Anunciar meu imóvel</Link></SheetClose>
                <SheetClose asChild><Link to="/auth" className="mt-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Entrar</Link></SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
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
            <li><Link to="/">Imóveis</Link></li>
            <li><Link to="/blog">Blog</Link></li>
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