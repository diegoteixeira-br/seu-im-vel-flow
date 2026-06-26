import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Mail, Phone, Eye, Check } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/meus-anuncios")({
  head: () => ({ meta: [{ title: "Meus Anúncios — AlugaFlow" }] }),
  component: MyAdsPage,
});

const FREE_LIMIT = 2;

type Prop = {
  id: string;
  nickname: string;
  ad_title: string | null;
  ad_description: string | null;
  rent_amount: number;
  city: string | null;
  neighborhood: string | null;
  listed_public: boolean;
  contact_phone: string | null;
  show_contact_public: boolean;
};

type Lead = {
  id: string;
  property_id: string;
  nome_interessado: string;
  telefone: string;
  mensagem: string | null;
  visualizado: boolean;
  created_at: string;
};

function MyAdsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Prop | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile-plan"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("plan").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: props = [] } = useQuery({
    queryKey: ["my-properties-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, nickname, ad_title, ad_description, rent_amount, city, neighborhood, listed_public, contact_phone, show_contact_public")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prop[];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["my-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, property_id, nome_interessado, telefone, mensagem, visualizado, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const isFree = (profile?.plan ?? "free") === "free";
  const listedCount = props.filter((p) => p.listed_public).length;

  const toggle = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      if (value && isFree && listedCount >= FREE_LIMIT) {
        throw new Error(`Plano gratuito permite até ${FREE_LIMIT} anúncios. Atualize para o plano Investidor.`);
      }
      const { error } = await supabase.from("properties").update({ listed_public: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-properties-ads"] }); toast.success("Anúncio atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").update({ visualizado: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-leads"] }),
  });

  const unread = leads.filter((l) => !l.visualizado).length;
  const propsById = new Map(props.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus Anúncios</h1>
        <p className="text-sm text-muted-foreground">
          {listedCount} anúncio(s) ativo(s){isFree ? ` de ${FREE_LIMIT} permitidos no plano gratuito` : " — plano Investidor (ilimitado)"}
        </p>
      </div>

      <Tabs defaultValue="anuncios">
        <TabsList>
          <TabsTrigger value="anuncios">Anúncios</TabsTrigger>
          <TabsTrigger value="leads">Leads recebidos {unread > 0 && <Badge variant="destructive" className="ml-2">{unread}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="anuncios" className="space-y-3">
          {props.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Cadastre um imóvel para começar a anunciar.</CardContent></Card>
          ) : props.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{p.ad_title || p.nickname}</p>
                    {p.listed_public && <Badge>Anunciando</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[p.neighborhood, p.city].filter(Boolean).join(", ") || "Sem localização"} · {formatBRL(p.rent_amount)}/mês
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.listed_public}
                      onCheckedChange={(v) => toggle.mutate({ id: p.id, value: v })}
                    />
                    <Label className="text-xs">Anunciar no portal</Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /> Editar anúncio</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="leads" className="space-y-3">
          {leads.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum lead recebido ainda.</CardContent></Card>
          ) : leads.map((l) => {
            const prop = propsById.get(l.property_id);
            return (
              <Card key={l.id} className={l.visualizado ? "" : "border-primary/50 bg-primary/5"}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{l.nome_interessado}</p>
                        {!l.visualizado && <Badge variant="destructive">Novo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Interesse em: {prop?.ad_title || prop?.nickname || "—"} · {formatDate(l.created_at)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm">
                        <a href={`tel:${l.telefone}`} className="flex items-center gap-1 text-primary hover:underline"><Phone className="h-3.5 w-3.5" /> {l.telefone}</a>
                        <a href={`https://wa.me/55${l.telefone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Mail className="h-3.5 w-3.5" /> WhatsApp</a>
                      </div>
                      {l.mensagem && <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm">{l.mensagem}</p>}
                    </div>
                    {!l.visualizado && (
                      <Button size="sm" variant="ghost" onClick={() => markRead.mutate(l.id)}><Check className="h-4 w-4" /> Marcar lido</Button>
                    )}
                    {l.visualizado && <Eye className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <EditAdDialog editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditAdDialog({ editing, onClose }: { editing: Prop | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [adTitle, setAdTitle] = useState(editing?.ad_title ?? "");
  const [adDescription, setAdDescription] = useState(editing?.ad_description ?? "");
  const [contactPhone, setContactPhone] = useState(editing?.contact_phone ?? "");
  const [showContact, setShowContact] = useState(editing?.show_contact_public ?? true);

  const editingId = editing?.id ?? null;
  useEffect(() => {
    setAdTitle(editing?.ad_title ?? "");
    setAdDescription(editing?.ad_description ?? "");
    setContactPhone(editing?.contact_phone ?? "");
    setShowContact(editing?.show_contact_public ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("properties")
        .update({
          ad_title: adTitle.trim() || null,
          ad_description: adDescription.trim() || null,
          contact_phone: contactPhone.trim() || null,
          show_contact_public: showContact,
        })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-properties-ads"] }); toast.success("Anúncio salvo"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar anúncio</DialogTitle></DialogHeader>
        {editing && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Título do anúncio</Label>
              <Input
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                placeholder={editing.nickname}
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição para o anúncio</Label>
              <Textarea
                rows={5}
                value={adDescription}
                onChange={(e) => setAdDescription(e.target.value)}
                placeholder="Descreva o imóvel, diferenciais, localização..."
                maxLength={2000}
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone / WhatsApp de contato</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(65) 99999-9999"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">Aparece na página do anúncio para o interessado ligar ou chamar no WhatsApp.</p>
            </div>
            <div className="flex items-center gap-2 rounded-md border p-3">
              <Switch checked={showContact} onCheckedChange={setShowContact} />
              <Label className="text-sm">Mostrar telefone publicamente no anúncio</Label>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

