import { BrandLogo } from "@/components/brand-logo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Bed, Bath, Maximize, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getPhotoUrls } from "@/lib/public-photos";

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

const PAGE_SIZE = 12;
const TYPES = ["apartamento", "casa", "comercial", "kitnet", "terreno", "outro"] as const;

type Listing = {
  id: string;
  ad_title: string | null;
  nickname: string;
  ad_description: string | null;
  address: string;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: number | null;
  rent_amount: number;
  cover_url?: string;
};

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [type, setType] = useState("todos");
  const [bedrooms, setBedrooms] = useState("todos");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  // Don't auto-redirect — owners should still be able to browse the public portal.
  useEffect(() => { /* noop */ }, [user, loading]);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["home-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, ad_title, nickname, ad_description, address, city, state, neighborhood, type, bedrooms, bathrooms, area_m2, rent_amount")
        .eq("listed_public", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const props = (data ?? []) as Listing[];
      if (props.length) {
        const ids = props.map((p) => p.id);
        const { data: photos } = await supabase
          .from("property_photos")
          .select("property_id, storage_path, category, sort_order")
          .in("property_id", ids)
          .order("sort_order", { ascending: true });
        const byProp = new Map<string, string>();
        for (const ph of photos ?? []) {
          if (!byProp.has(ph.property_id)) byProp.set(ph.property_id, ph.storage_path);
          if (ph.category === "fachada") byProp.set(ph.property_id, ph.storage_path);
        }
        const paths = Array.from(byProp.values());
        const urls = await getPhotoUrls(paths);
        props.forEach((p) => {
          const path = byProp.get(p.id);
          p.cover_url = path ? urls[path] : undefined;
        });
      }
      return props;
    },
  });

  const filtered = useMemo(() => {
    return listings.filter((p) => {
      if (city && !(p.city ?? "").toLowerCase().includes(city.toLowerCase()) && !(p.neighborhood ?? "").toLowerCase().includes(city.toLowerCase())) return false;
      if (neighborhood && !(p.neighborhood ?? "").toLowerCase().includes(neighborhood.toLowerCase())) return false;
      if (type !== "todos" && p.type !== type) return false;
      if (bedrooms !== "todos") {
        const n = parseInt(bedrooms, 10);
        const b = p.bedrooms ?? 0;
        if (bedrooms === "4" ? b < 4 : b !== n) return false;
      }
      if (minPrice && p.rent_amount < parseFloat(minPrice)) return false;
      if (maxPrice && p.rent_amount > parseFloat(maxPrice)) return false;
      return true;
    });
  }, [listings, city, neighborhood, type, bedrooms, minPrice, maxPrice]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/"><BrandLogo size={32} /></Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/para-proprietarios">Para proprietários</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/auth" search={{ mode: "signup" }}>Anunciar meu imóvel</Link></Button>
            <Button asChild size="sm">
              <Link to={user ? "/dashboard" : "/auth"}>{user ? "Painel" : "Entrar"}</Link>
            </Button>
          </nav>

        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Encontre seu próximo lar
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Aluguel direto com o proprietário, sem intermediários.
          </p>

          <div className="mx-auto mt-8 grid gap-3 rounded-2xl border bg-card p-4 text-left shadow-lg md:grid-cols-6">
            <div className="space-y-1 md:col-span-2">
              <Label>Cidade ou bairro</Label>
              <Input value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} placeholder="Ex: Cáceres, Centro..." />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quartos</Label>
              <Select value={bedrooms} onValueChange={(v) => { setBedrooms(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Mín (R$)</Label>
              <Input type="number" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Máx (R$)</Label>
              <Input type="number" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} placeholder="∞" />
            </div>
            <div className="md:col-span-6">
              <Button className="w-full gap-2" size="lg" onClick={() => setPage(1)}>
                <Search className="h-4 w-4" /> Buscar imóveis
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Imóveis disponíveis</h2>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Carregando..." : `${filtered.length} imóvel(is) encontrado(s)`}
            </p>
          </div>
        </div>

        {pageItems.length === 0 && !isLoading ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Nenhum imóvel encontrado com esses filtros.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((p) => (
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
                      {[p.neighborhood, p.city, p.state].filter(Boolean).join(", ") || p.address}
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

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        )}
      </section>

      <section className="border-t bg-gradient-to-br from-primary/10 via-background to-background py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">É proprietário ou imobiliária?</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Conheça o AlugaFlow por dentro</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Anuncie grátis, gerencie contratos, cobranças e relatórios em um só lugar.</p>
          <div className="mt-6">
            <Button asChild size="lg"><Link to="/para-proprietarios">Conhecer a ferramenta</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <BrandLogo size={28} />
            <p className="mt-2 text-xs text-muted-foreground">Direto entre proprietários e inquilinos.</p>
            <Link to={user ? "/dashboard" : "/auth"} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Já sou cliente → Entrar
            </Link>
          </div>
          <div>
            <p className="text-sm font-semibold">Institucional</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><Link to="/sobre" className="hover:text-foreground">Sobre</Link></li>
              <li><Link to="/planos" className="hover:text-foreground">Planos</Link></li>
              <li><a href="mailto:contato@alugaflow.com.br" className="hover:text-foreground">Contato</a></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Legal</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><Link to="/privacidade" className="hover:text-foreground">Política de Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-foreground">Termos de Uso</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Contato</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <a href="mailto:contato@alugaflow.com.br" className="hover:text-foreground">contato@alugaflow.com.br</a>
            </p>
            <Link to="/para-proprietarios" className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground">
              Conhecer a ferramenta
            </Link>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">© 2026 AlugaFlow. Todos os direitos reservados.</div>
      </footer>

    </div>
  );
}
