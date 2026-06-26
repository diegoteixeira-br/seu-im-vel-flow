import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, Landmark, Zap, Bell, Palette, ShieldCheck } from "lucide-react";
import { BrandingTab } from "@/components/branding-tab";
import { SecurityTab } from "@/components/security-tab";



export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — AlugaFlow" }] }),
  component: ConfigPage,
});

const schema = z.object({
  full_name: z.string().min(1, "Obrigatório").max(150),
  phone: z.string().max(30).optional().or(z.literal("")),
  cpf: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").max(200).optional().or(z.literal("")),
  address_street: z.string().max(200).optional().or(z.literal("")),
  address_number: z.string().max(20).optional().or(z.literal("")),
  address_neighborhood: z.string().max(120).optional().or(z.literal("")),
  address_city: z.string().max(120).optional().or(z.literal("")),
  address_uf: z.string().max(2).optional().or(z.literal("")),
  address_zip: z.string().max(15).optional().or(z.literal("")),
  bank_name: z.string().max(120).optional().or(z.literal("")),
  bank_agency: z.string().max(30).optional().or(z.literal("")),
  bank_account: z.string().max(30).optional().or(z.literal("")),
  pix_key: z.string().max(200).optional().or(z.literal("")),
  asaas_api_key: z.string().max(500).optional().or(z.literal("")),
  asaas_environment: z.enum(["sandbox", "production"]),
  auto_charge_enabled: z.boolean(),
  auto_charge_days_before: z.coerce.number().int().min(1).max(15),
  auto_charge_message: z.string().max(500).optional().or(z.literal("")),
});
type Values = z.infer<typeof schema>;

function ConfigPage() {
  const qc = useQueryClient();
  const [testing, setTesting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sem sessão");
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (error) throw error;
      return { profile: data, email: u.user.email ?? "", userId: u.user.id };
    },
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "", phone: "", cpf: "", email: "",
      address_street: "", address_number: "", address_neighborhood: "",
      address_city: "", address_uf: "", address_zip: "",
      bank_name: "", bank_agency: "", bank_account: "", pix_key: "",
      asaas_api_key: "", asaas_environment: "sandbox",
      auto_charge_enabled: false, auto_charge_days_before: 3, auto_charge_message: "",
    },
  });

  useEffect(() => {
    if (!data) return;
    const p = (data.profile ?? {}) as Partial<Values> & Record<string, unknown>;
    form.reset({
      full_name: (p.full_name as string) ?? "",
      phone: (p.phone as string) ?? "",
      cpf: (p.cpf as string) ?? "",
      email: (p.email as string) ?? data.email ?? "",
      address_street: (p.address_street as string) ?? "",
      address_number: (p.address_number as string) ?? "",
      address_neighborhood: (p.address_neighborhood as string) ?? "",
      address_city: (p.address_city as string) ?? "",
      address_uf: (p.address_uf as string) ?? "",
      address_zip: (p.address_zip as string) ?? "",
      bank_name: (p.bank_name as string) ?? "",
      bank_agency: (p.bank_agency as string) ?? "",
      bank_account: (p.bank_account as string) ?? "",
      pix_key: (p.pix_key as string) ?? "",
      asaas_api_key: (p.asaas_api_key as string) ?? "",
      asaas_environment: ((p.asaas_environment as Values["asaas_environment"]) ?? "sandbox"),
      auto_charge_enabled: Boolean(p.auto_charge_enabled),
      auto_charge_days_before: Number(p.auto_charge_days_before ?? 3),
      auto_charge_message: (p.auto_charge_message as string) ?? "",
    });
  }, [data, form]);

  const save = useMutation({
    mutationFn: async (v: Values) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const payload: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        if (typeof val === "boolean" || typeof val === "number") payload[k] = val;
        else payload[k] = val === "" || val == null ? null : String(val);
      }
      const { error } = await supabase.from("profiles").update(payload as never).eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Configurações salvas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testSend = async () => {
    if (!data?.userId) return;
    setTesting(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("send-charges", {
        body: { user_id: data.userId },
      });
      if (error) throw error;
      const r = res as { created?: number; failed?: number; results?: Array<{ checked?: number }> };
      const checked = r.results?.[0]?.checked ?? 0;
      toast.success(`Teste concluído — ${checked} pagamento(s) elegível(is), ${r.created ?? 0} cobrança(s) criada(s), ${r.failed ?? 0} falha(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dados do proprietário, bancários e integração ASAAS.</p>
      </div>

      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-6">
        <Tabs defaultValue="pessoal" className="space-y-4">
          <TabsList className="flex flex-wrap justify-center h-auto gap-1 w-full">
            <TabsTrigger value="pessoal" className="gap-1.5"><User className="h-4 w-4" />Dados pessoais</TabsTrigger>
            <TabsTrigger value="endereco" className="gap-1.5"><MapPin className="h-4 w-4" />Endereço</TabsTrigger>
            <TabsTrigger value="bancario" className="gap-1.5"><Landmark className="h-4 w-4" />Dados bancários</TabsTrigger>
            <TabsTrigger value="asaas" className="gap-1.5"><Zap className="h-4 w-4" />Integração ASAAS</TabsTrigger>
            <TabsTrigger value="automacao" className="gap-1.5"><Bell className="h-4 w-4" />Automação</TabsTrigger>
            <TabsTrigger value="identidade" className="gap-1.5"><Palette className="h-4 w-4" />Identidade visual</TabsTrigger>
            <TabsTrigger value="seguranca" className="gap-1.5"><ShieldCheck className="h-4 w-4" />Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="pessoal">
            <Card>
              <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome completo *" error={form.formState.errors.full_name?.message}><Input {...form.register("full_name")} /></Field>
                <Field label="CPF"><Input {...form.register("cpf")} placeholder="000.000.000-00" /></Field>
                <Field label="Telefone"><Input {...form.register("phone")} /></Field>
                <Field label="E-mail" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endereco">
            <Card>
              <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-6">
                <div className="sm:col-span-4"><Field label="Rua"><Input {...form.register("address_street")} /></Field></div>
                <div className="sm:col-span-2"><Field label="Número"><Input {...form.register("address_number")} /></Field></div>
                <div className="sm:col-span-3"><Field label="Bairro"><Input {...form.register("address_neighborhood")} /></Field></div>
                <div className="sm:col-span-2"><Field label="Cidade"><Input {...form.register("address_city")} /></Field></div>
                <div className="sm:col-span-1"><Field label="UF"><Input maxLength={2} {...form.register("address_uf")} /></Field></div>
                <div className="sm:col-span-2"><Field label="CEP"><Input {...form.register("address_zip")} /></Field></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bancario">
            <Card>
              <CardHeader><CardTitle>Dados bancários</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Banco"><Input {...form.register("bank_name")} /></Field>
                <Field label="Agência"><Input {...form.register("bank_agency")} /></Field>
                <Field label="Conta"><Input {...form.register("bank_account")} /></Field>
                <Field label="Chave PIX"><Input {...form.register("pix_key")} /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="asaas">
            <Card>
              <CardHeader>
                <CardTitle>Integração ASAAS</CardTitle>
                <CardDescription>
                  Sua chave de API é usada para gerar cobranças automáticas. Comece no ambiente Sandbox e migre para Produção quando estiver tudo ok.
                  Configure o webhook do ASAAS apontando para <code className="text-xs">/api/public/asaas-webhook</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="ASAAS API Key">
                    <Input type="password" autoComplete="off" placeholder="$aact_..." {...form.register("asaas_api_key")} />
                  </Field>
                </div>
                <Field label="Ambiente">
                  <Select value={form.watch("asaas_environment")} onValueChange={(v) => form.setValue("asaas_environment", v as Values["asaas_environment"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (teste)</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automacao">
            <Card>
              <CardHeader>
                <CardTitle>Automação de cobranças</CardTitle>
                <CardDescription>
                  Quando ativada, o sistema verifica diariamente os pagamentos pendentes e gera a cobrança no ASAAS X dias antes do vencimento.
                  O ASAAS envia o boleto e PIX por e-mail diretamente ao inquilino.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                  <div>
                    <p className="text-sm font-medium">Enviar cobranças automaticamente</p>
                    <p className="text-xs text-muted-foreground">Requer chave ASAAS configurada na aba anterior.</p>
                  </div>
                  <Switch
                    checked={form.watch("auto_charge_enabled")}
                    onCheckedChange={(b) => form.setValue("auto_charge_enabled", b)}
                  />
                </div>
                <Field label="Dias antes do vencimento">
                  <Select
                    value={String(form.watch("auto_charge_days_before"))}
                    onValueChange={(v) => form.setValue("auto_charge_days_before", Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 7].map((d) => <SelectItem key={d} value={String(d)}>{d} dia(s)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Mensagem personalizada (anexada à descrição da cobrança)">
                    <Textarea
                      rows={3}
                      placeholder="Ex.: Olá, segue o boleto referente ao aluguel. Em caso de dúvidas, fale conosco no WhatsApp."
                      {...form.register("auto_charge_message")}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Button type="button" variant="outline" onClick={testSend} disabled={testing}>
                    <PlayCircle className="h-4 w-4" />
                    {testing ? "Testando..." : "Testar envio agora"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="identidade">
            <BrandingTab />
          </TabsContent>

          <TabsContent value="seguranca">
            <SecurityTab />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end sticky bottom-0 bg-background/80 backdrop-blur py-3">
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar configurações"}</Button>
        </div>
      </form>
    </div>

  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
