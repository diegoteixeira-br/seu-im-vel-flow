import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bed, Bath, Maximize, MapPin, Phone, ArrowLeft, MessageCircle } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { getPhotoUrls } from "@/lib/public-photos";
import { PublicHeader, PublicFooter } from "./anuncios";

export const Route = createFileRoute("/anuncios/$id")({
  head: () => ({ meta: [{ title: "Anúncio — AlugaFlow" }] }),
  component: AnuncioDetail,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Erro ao carregar anúncio</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Button asChild className="mt-6"><Link to="/anuncios">Voltar para anúncios</Link></Button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Anúncio não encontrado</h1>
        <Button asChild className="mt-6"><Link to="/anuncios">Voltar</Link></Button>
      </div>
    </div>
  ),
});

const leadSchema = z.object({
  nome_interessado: z.string().trim().min(2, "Informe seu nome").max(120),
  telefone: z.string().trim().min(8, "Informe um telefone válido").max(20),
  mensagem: z.string().max(1000).optional().or(z.literal("")),
});
type LeadValues = z.infer<typeof leadSchema>;

function AnuncioDetail() {
  const { id } = Route.useParams();
  const [openLead, setOpenLead] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-listing", id],
    queryFn: async () => {
      const { data: prop, error } = await supabase
        .from("properties")
        .select("id, user_id, ad_title, nickname, ad_description, notes, address, city, state, neighborhood, zip_code, type, bedrooms, bathrooms, area_m2, rent_amount, listed_public, contact_phone, show_contact_public")
        .eq("id", id)
        .eq("listed_public", true)
        .maybeSingle();
      if (error) throw error;
      if (!prop) throw notFound();

      const [{ data: photos }, { data: owner }] = await Promise.all([
        supabase.from("property_photos").select("storage_path, category, sort_order").eq("property_id", id).order("sort_order"),
        supabase.from("profiles").select("full_name, public_phone, show_phone_public").eq("id", prop.user_id).maybeSingle(),
      ]);
      const paths = (photos ?? []).map((p) => p.storage_path);
      const urls = await getPhotoUrls(paths);
      const photoList = (photos ?? []).map((p) => ({ ...p, url: urls[p.storage_path] }));
      return { prop, photos: photoList, owner: owner ?? null };
    },
  });

  const form = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { nome_interessado: "", telefone: "", mensagem: "" },
  });

  const submitLead = useMutation({
    mutationFn: async (values: LeadValues) => {
      if (!data?.prop) throw new Error("Anúncio indisponível");
      const { error } = await supabase.from("leads").insert({
        property_id: data.prop.id,
        user_id: data.prop.user_id,
        nome_interessado: values.nome_interessado.trim(),
        telefone: values.telefone.trim(),
        mensagem: values.mensagem?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem enviada! O proprietário entrará em contato.");
      setOpenLead(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="min-h-screen bg-background"><PublicHeader /><p className="p-10 text-center">Carregando...</p></div>;
  }
  if (isError || !data) {
    return <div className="min-h-screen bg-background"><PublicHeader /><p className="p-10 text-center">Anúncio não encontrado.</p></div>;
  }

  const { prop, photos, owner } = data;
  const description = prop.ad_description || prop.notes || "Entre em contato com o proprietário para mais informações.";

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/anuncios"><ArrowLeft className="h-4 w-4" /> Voltar</Link></Button>


        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{prop.ad_title ?? prop.nickname}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <MapPin className="mr-1 inline h-4 w-4" />
              {[prop.address, prop.neighborhood, prop.city, prop.state].filter(Boolean).join(", ")}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border px-3 py-1 capitalize">{prop.type}</span>
              <span className="flex items-center gap-1 rounded-full border px-3 py-1"><Bed className="h-4 w-4" /> {prop.bedrooms ?? 0} quartos</span>
              <span className="flex items-center gap-1 rounded-full border px-3 py-1"><Bath className="h-4 w-4" /> {prop.bathrooms ?? 0} banheiros</span>
              {prop.area_m2 ? <span className="flex items-center gap-1 rounded-full border px-3 py-1"><Maximize className="h-4 w-4" /> {prop.area_m2} m²</span> : null}
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold">Descrição</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>

            {photos.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold">Fotos do imóvel ({photos.length})</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {photos.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg bg-muted">
                      {p.url && <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Valor do aluguel</p>
                <p className="text-3xl font-bold text-primary">{formatBRL(prop.rent_amount)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                <Dialog open={openLead} onOpenChange={setOpenLead}>
                  <DialogTrigger asChild>
                    <Button className="mt-4 w-full" size="lg">Tenho interesse</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enviar mensagem ao proprietário</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit((v) => submitLead.mutate(v))} className="space-y-3">
                      <div className="space-y-1">
                        <Label>Seu nome *</Label>
                        <Input {...form.register("nome_interessado")} />
                        {form.formState.errors.nome_interessado && <p className="text-xs text-destructive">{form.formState.errors.nome_interessado.message}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label>Telefone / WhatsApp *</Label>
                        <Input {...form.register("telefone")} placeholder="(65) 99999-9999" />
                        {form.formState.errors.telefone && <p className="text-xs text-destructive">{form.formState.errors.telefone.message}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label>Mensagem (opcional)</Label>
                        <Textarea rows={3} {...form.register("mensagem")} placeholder="Olá, gostaria de mais informações sobre este imóvel..." />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpenLead(false)}>Cancelar</Button>
                        <Button type="submit" disabled={submitLead.isPending}>{submitLead.isPending ? "Enviando..." : "Enviar"}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {(() => {
              const phone = (prop.show_contact_public && prop.contact_phone)
                ? prop.contact_phone
                : (owner?.show_phone_public && owner?.public_phone) ? owner.public_phone : null;
              if (!phone) return null;
              const digits = phone.replace(/\D/g, "");
              const waNumber = digits.length === 11 || digits.length === 10 ? `55${digits}` : digits;
              const waMsg = encodeURIComponent(`Olá! Tenho interesse no imóvel "${prop.ad_title ?? prop.nickname}" anunciado no AlugaFlow.`);
              return (
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold">Fale com o proprietário</p>
                    {owner?.full_name && <p className="mt-1 text-sm text-muted-foreground">{owner.full_name}</p>}
                    <a href={`tel:${phone}`} className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline">
                      <Phone className="h-4 w-4" /> {phone}
                    </a>
                    <Button asChild className="mt-3 w-full gap-2 bg-[#25D366] text-white hover:bg-[#1ebe5b]">
                      <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" /> Chamar no WhatsApp
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
      </div>


      <PublicFooter />
    </div>
  );
}
