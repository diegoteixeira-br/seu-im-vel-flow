import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  component: AdminPlans,
});

type Plan = { id: string; name: string; price: number; promo_price: number | null; promo_until: string | null; active: boolean; benefits: string[]; sort_order: number };

function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);

  const load = async () => {
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    setPlans((data ?? []).map((p) => ({ ...p, benefits: Array.isArray(p.benefits) ? p.benefits : [] })) as Plan[]);
  };
  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Plan>) => setPlans((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const save = async (p: Plan) => {
    const { error } = await supabase.from("plans").update({
      name: p.name, price: p.price, promo_price: p.promo_price, promo_until: p.promo_until,
      active: p.active, benefits: p.benefits,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`Plano "${p.name}" salvo`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Planos e preços</h1>
        <p className="text-sm text-muted-foreground">Edite valores, promoções e benefícios.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{p.name}</CardTitle>
              <div className="flex items-center gap-2"><Switch checked={p.active} onCheckedChange={(v) => update(p.id, { active: v })} /><Label>Ativo</Label></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} /></div>
                <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={p.price} onChange={(e) => update(p.id, { price: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço promocional</Label><Input type="number" step="0.01" value={p.promo_price ?? ""} onChange={(e) => update(p.id, { promo_price: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Promoção válida até</Label><Input type="date" value={p.promo_until ?? ""} onChange={(e) => update(p.id, { promo_until: e.target.value || null })} /></div>
              </div>
              <div>
                <Label>Benefícios (um por linha)</Label>
                <Textarea rows={4} value={p.benefits.join("\n")} onChange={(e) => update(p.id, { benefits: e.target.value.split("\n").filter(Boolean) })} />
              </div>
              <div className="rounded-md border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Prévia na landing page</div>
                <div className="mt-2 text-lg font-bold">{p.name}</div>
                <div className="mt-1">
                  {p.promo_price ? (
                    <>
                      <span className="text-2xl font-bold text-primary">{formatBRL(p.promo_price)}</span>
                      <span className="ml-2 text-sm text-muted-foreground line-through">{formatBRL(p.price)}</span>
                      <Badge className="ml-2">Promoção</Badge>
                    </>
                  ) : (
                    <span className="text-2xl font-bold">{formatBRL(p.price)}<span className="text-sm font-normal text-muted-foreground">/mês</span></span>
                  )}
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {p.benefits.map((b, i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 text-emerald-600" />{b}</li>)}
                </ul>
              </div>
              <Button onClick={() => save(p)} className="w-full">Salvar alterações</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
