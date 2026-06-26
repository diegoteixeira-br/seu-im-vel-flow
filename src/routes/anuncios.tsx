import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bed, Bath, Maximize, MapPin, Search } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { getPhotoUrls } from "@/lib/public-photos";

export const Route = createFileRoute("/anuncios")({
  head: () => ({
    meta: [
      { title: "Imóveis para alugar — AlugaFlow" },
      { name: "description", content: "Encontre casas, apartamentos e imóveis comerciais para alugar diretamente com o proprietário." },
      { property: "og:title", content: "Imóveis para alugar — AlugaFlow" },
      { property: "og:description", content: "Portal de anúncios diretamente com proprietários." },
    ],
  }),
  component: AnunciosPage,
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
  cover_path?: string | null;
  cover_url?: string;
};

function AnunciosPage() {
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [type, setType] = useState<string>("todos");
  const [bedrooms, setBedrooms] = useState<string>("todos");
  const [bathrooms, setBathrooms] = useState<string>("todos");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["public-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, ad_title, nickname, ad_description, address, city, state, neighborhood, type, bedrooms, bathrooms, area_m2, rent_amount")
        .eq("listed_public", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const props = (data ?? []) as Listing[];
      // Fetch first photo for each
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
          p.cover_path = path ?? null;
          p.cover_url = path ? urls[path] : undefined;
        });
      }
      return props;
    },
  });

  const filtered = useMemo(() => {
    return listings.filter((p) => {
      if (city && !(p.city ?? "").toLowerCase().includes(city.toLowerCase())) return false;
      if (neighborhood && !(p.neighborhood ?? "").toLowerCase().includes(neighborhood.toLowerCase())) return false;
      if (type !== "todos" && p.type !== type) return false;
      if (bedrooms !== "todos") {
        const n = parseInt(bedrooms, 10);
        const b = p.bedrooms ?? 0;
        if (bedrooms === "4" ? b < 4 : b !== n) return false;
      }
      if (bathrooms !== "todos") {
        const n = parseInt(bathrooms, 10);
        const b = p.bathrooms ?? 0;
        if (bathrooms === "4" ? b < 4 : b !== n) return false;
      }
      if (minPrice && p.rent_amount < parseFloat(minPrice)) return false;
      if (maxPrice && p.rent_amount > parseFloat(maxPrice)) return false;
      return true;
    });
  }, [listings, city, neighborhood, type, bedrooms, bathrooms, minPrice, maxPrice]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <section className="border-b bg-muted/30 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Imóveis para alugar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Direto com o proprietário, sem intermediários.</p>

          <div className="mt-6 grid gap-3 rounded-xl border bg-background p-4 shadow-sm md:grid-cols-4">
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} placeholder="Ex: Cáceres" />
            </div>
            <div className="space-y-1">
              <Label>Bairro</Label>
              <Input value={neighborhood} onChange={(e) => { setNeighborhood(e.target.value); setPage(1); }} placeholder="Ex: Centro" />
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
              <Label>Banheiros</Label>
              <Select value={bathrooms} onValueChange={(v) => { setBathrooms(v); setPage(1); }}>
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
              <Label>Valor mínimo (R$)</Label>
              <Input type="number" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Valor máximo (R$)</Label>
              <Input type="number" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} placeholder="∞" />
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-2" variant="default"><Search className="h-4 w-4" /> Buscar</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <p className="mb-4 text-sm text-muted-foreground">
          {isLoading ? "Carregando..." : `${filtered.length} imóvel(is) encontrado(s)`}
        </p>
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

      <PublicFooter />
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/"><BrandLogo size={32} /></Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/anuncios">Anúncios</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/auth" search={{ mode: "signup" }}>Anunciar meu imóvel</Link></Button>
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
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Para proprietários</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li><Link to="/auth" search={{ mode: "signup" }}>Anunciar grátis</Link></li>
            <li><Link to="/auth">Entrar</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Contato</p>
          <p className="mt-2 text-sm text-muted-foreground">contato@alugaflow.com.br</p>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">© 2025 AlugaFlow. Todos os direitos reservados.</div>
    </footer>
  );
}
