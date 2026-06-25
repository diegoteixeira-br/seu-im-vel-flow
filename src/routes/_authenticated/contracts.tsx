import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileDown, Send } from "lucide-react";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { createAsaasChargesForContract } from "@/lib/asaas.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({ meta: [{ title: "Contratos — AlugaFlow" }] }),
  component: ContractsPage,
});

const STATUSES = ["ativo", "encerrado", "cancelado", "pendente"] as const;
const ADJ_INDEX = ["nenhum", "igpm", "ipca"] as const;
const ADJ_LABEL: Record<string, string> = { nenhum: "Nenhum", igpm: "IGP-M", ipca: "IPCA" };
const GUARANTEES = ["sem_garantia", "fiador", "caucao", "seguro_fianca"] as const;
const GUARANTEE_LABEL: Record<string, string> = {
  sem_garantia: "Sem garantia", fiador: "Fiador", caucao: "Caução", seguro_fianca: "Seguro fiança",
};

const schema = z.object({
  property_id: z.string().uuid("Selecione um imóvel"),
  tenant_id: z.string().uuid("Selecione um inquilino"),
  start_date: z.string().min(1, "Obrigatório"),
  end_date: z.string().min(1, "Obrigatório"),
  rent_amount: z.coerce.number().min(0),
  due_day: z.coerce.number().int().min(1).max(28),
  deposit_amount: z.coerce.number().min(0).optional(),
  status: z.enum(STATUSES),
  adjustment_index: z.enum(ADJ_INDEX),
  adjustment_frequency_months: z.coerce.number().int().min(1).max(60),
  guarantee_type: z.enum(GUARANTEES),
  guarantee_months: z.coerce.number().int().min(1).max(3).optional(),
  notes: z.string().max(4000).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;
type Contract = FormValues & {
  id: string;
  property?: { nickname: string; address: string; city: string | null; state: string | null; zip_code: string | null; type: string; bedrooms: number | null; area_m2: number | null };
  tenant?: { full_name: string; cpf: string | null; rg: string | null; email: string | null; phone: string | null; address_street: string | null; address_number: string | null; address_neighborhood: string | null; address_city: string | null; address_state: string | null };
};

function displayStatus(c: Contract) {
  if (c.status !== "ativo") return { label: c.status, variant: "secondary" as const, className: "" };
  const end = new Date(c.end_date + "T00:00:00");
  const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Encerrado", variant: "secondary" as const, className: "" };
  if (days <= 30) return { label: "A vencer em 30 dias", variant: "default" as const, className: "bg-orange-500 hover:bg-orange-500 text-white" };
  return { label: "Ativo", variant: "default" as const, className: "bg-green-600 hover:bg-green-600 text-white" };
}

function ContractsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Contract | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, property:properties(nickname,address,city,state,zip_code,type,bedrooms,area_m2), tenant:tenants(full_name,cpf,rg,email,phone,address_street,address_number,address_neighborhood,address_city,address_state)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Contract[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); qc.invalidateQueries({ queryKey: ["payments"] }); toast.success("Contrato excluído"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function downloadPDF(c: Contract) {
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
      generateContractPDF(c, { ...(profile ?? {}), email: u.user?.email ?? "—" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const sendCharges = useMutation({
    mutationFn: async (id: string) => createAsaasChargesForContract({ data: { contractId: id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      if (r.created > 0) toast.success(`${r.created} cobrança(s) gerada(s) no ASAAS`);
      if (r.failed > 0) toast.error(`${r.failed} cobrança(s) falharam: ${r.errors.join(" | ")}`);
      if (r.created === 0 && r.failed === 0) toast.message("Nenhuma cobrança pendente para gerar.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-sm text-muted-foreground">{data.length} cadastrado(s)</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Novo contrato</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-muted-foreground">Carregando...</p>
          : data.length === 0 ? <p className="p-6 text-center text-muted-foreground">Nenhum contrato cadastrado.</p>
          : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Imóvel</TableHead><TableHead>Inquilino</TableHead>
                <TableHead>Vigência</TableHead><TableHead>Aluguel</TableHead>
                <TableHead>Venc.</TableHead><TableHead>Status</TableHead>
                <TableHead className="w-[160px]">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((c) => {
                  const s = displayStatus(c);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.property?.nickname ?? "—"}</TableCell>
                      <TableCell>{c.tenant?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatDate(c.start_date)} → {formatDate(c.end_date)}</TableCell>
                      <TableCell>{formatBRL(c.rent_amount)}</TableCell>
                      <TableCell>Dia {c.due_day}</TableCell>
                      <TableCell><Badge variant={s.variant} className={s.className}>{s.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="Baixar contrato (PDF)" onClick={() => downloadPDF(c)}><FileDown className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Gerar cobranças ASAAS" onClick={() => sendCharges.mutate(c.id)} disabled={sendCharges.isPending}><Send className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                                <AlertDialogDescription>Os pagamentos vinculados também serão removidos.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del.mutate(c.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ContractDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function ContractDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (b: boolean) => void; editing: Contract | null }) {
  const qc = useQueryClient();
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", "select"],
    queryFn: async () => (await supabase.from("properties").select("id, nickname").order("nickname")).data ?? [],
  });
  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants", "select"],
    queryFn: async () => (await supabase.from("tenants").select("id, full_name").order("full_name")).data ?? [],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: editing ? {
      property_id: editing.property_id, tenant_id: editing.tenant_id,
      start_date: editing.start_date, end_date: editing.end_date,
      rent_amount: editing.rent_amount, due_day: editing.due_day,
      deposit_amount: editing.deposit_amount ?? 0, status: editing.status,
      adjustment_index: editing.adjustment_index ?? "nenhum",
      adjustment_frequency_months: editing.adjustment_frequency_months ?? 12,
      guarantee_type: editing.guarantee_type ?? "sem_garantia",
      guarantee_months: editing.guarantee_months ?? undefined,
      notes: editing.notes ?? "",
    } : {
      property_id: "", tenant_id: "", start_date: "", end_date: "",
      rent_amount: 0, due_day: 5, deposit_amount: 0, status: "ativo",
      adjustment_index: "nenhum", adjustment_frequency_months: 12,
      guarantee_type: "sem_garantia", guarantee_months: undefined, notes: "",
    },
  });

  const guarantee = form.watch("guarantee_type");

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const payload = {
        ...values,
        user_id: u.user.id,
        deposit_amount: values.deposit_amount ?? 0,
        guarantee_months: values.guarantee_type === "caucao" ? (values.guarantee_months ?? 1) : null,
      };
      if (editing) {
        const { error } = await supabase.from("contracts").update(payload).eq("id", editing.id);
        if (error) throw error;
        return { id: editing.id, created: false };
      }
      const { data: ins, error } = await supabase.from("contracts").insert(payload).select("id").single();
      if (error) throw error;
      // Gerar pagamentos mensais
      const payments = buildMonthlyPayments({
        contract_id: ins.id, user_id: u.user.id,
        start_date: values.start_date, end_date: values.end_date,
        due_day: values.due_day, amount: values.rent_amount,
      });
      if (payments.length > 0) {
        const { error: pErr } = await supabase.from("payments").insert(payments);
        if (pErr) throw pErr;
      }
      return { id: ins.id, created: true, count: payments.length };
    },
    onSuccess: async (r) => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success(editing ? "Contrato atualizado" : `Contrato criado — ${r.count ?? 0} pagamentos gerados`);
      onOpenChange(false);
      if (r.created && r.id) {
        try {
          const res = await createAsaasChargesForContract({ data: { contractId: r.id } });
          if (res.created > 0) toast.success(`${res.created} cobrança(s) criada(s) no ASAAS`);
          if (res.failed > 0) toast.error(`ASAAS: ${res.errors.join(" | ")}`);
        } catch (e) {
          toast.message("Cobranças ASAAS não geradas: " + (e as Error).message);
        }
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Editar contrato" : "Novo contrato"}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Imóvel *</Label>
            <Select value={form.watch("property_id")} onValueChange={(v) => form.setValue("property_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.nickname}</SelectItem>)}</SelectContent>
            </Select>
            {form.formState.errors.property_id && <p className="text-xs text-destructive">{form.formState.errors.property_id.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Inquilino *</Label>
            <Select value={form.watch("tenant_id")} onValueChange={(v) => form.setValue("tenant_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
            </Select>
            {form.formState.errors.tenant_id && <p className="text-xs text-destructive">{form.formState.errors.tenant_id.message}</p>}
          </div>
          <div className="space-y-1"><Label>Início *</Label><Input type="date" {...form.register("start_date")} /></div>
          <div className="space-y-1"><Label>Término *</Label><Input type="date" {...form.register("end_date")} /></div>
          <div className="space-y-1"><Label>Valor do aluguel (R$) *</Label><Input type="number" step="0.01" {...form.register("rent_amount")} /></div>
          <div className="space-y-1"><Label>Dia do vencimento (1-28) *</Label><Input type="number" min={1} max={28} {...form.register("due_day")} /></div>

          <div className="space-y-1">
            <Label>Índice de reajuste</Label>
            <Select value={form.watch("adjustment_index")} onValueChange={(v) => form.setValue("adjustment_index", v as FormValues["adjustment_index"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ADJ_INDEX.map((s) => <SelectItem key={s} value={s}>{ADJ_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Frequência reajuste (meses)</Label><Input type="number" min={1} max={60} {...form.register("adjustment_frequency_months")} /></div>

          <div className="space-y-1">
            <Label>Tipo de garantia</Label>
            <Select value={form.watch("guarantee_type")} onValueChange={(v) => form.setValue("guarantee_type", v as FormValues["guarantee_type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GUARANTEES.map((s) => <SelectItem key={s} value={s}>{GUARANTEE_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {guarantee === "caucao" ? (
            <div className="space-y-1">
              <Label>Caução (meses, 1-3)</Label>
              <Input type="number" min={1} max={3} {...form.register("guarantee_months")} />
            </div>
          ) : <div />}

          <div className="space-y-1"><Label>Depósito (R$)</Label><Input type="number" step="0.01" {...form.register("deposit_amount")} /></div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as FormValues["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1 sm:col-span-2"><Label>Observações / cláusulas adicionais</Label><Textarea rows={4} {...form.register("notes")} /></div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helpers --------------------------------------------------------------------

function buildMonthlyPayments(args: {
  contract_id: string; user_id: string; start_date: string; end_date: string; due_day: number; amount: number;
}) {
  const out: Array<{ contract_id: string; user_id: string; reference_month: string; due_date: string; amount: number; status: "pendente" }> = [];
  const start = new Date(args.start_date + "T00:00:00");
  const end = new Date(args.end_date + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return out;
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const day = Math.min(args.due_day, lastDay);
    const due = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const ref = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    out.push({ contract_id: args.contract_id, user_id: args.user_id, reference_month: ref, due_date: due, amount: args.amount, status: "pendente" });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

type OwnerProfile = {
  full_name?: string | null; cpf?: string | null; phone?: string | null; email?: string | null;
  address_street?: string | null; address_number?: string | null; address_neighborhood?: string | null;
  address_city?: string | null; address_uf?: string | null; address_zip?: string | null;
  bank_name?: string | null; bank_agency?: string | null; bank_account?: string | null; pix_key?: string | null;
};

function generateContractPDF(c: Contract, owner: OwnerProfile) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;
  const dash = (v: string | null | undefined) => (v && String(v).trim() ? String(v) : "—");

  // Header
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(26, 74, 107);
  doc.text("AlugaFlow", M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(120);
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, W - M, y, { align: "right" });
  y += 10;
  doc.setDrawColor(26, 74, 107); doc.line(M, y, W - M, y);
  y += 24;

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("CONTRATO DE LOCAÇÃO RESIDENCIAL", W / 2, y, { align: "center" });
  y += 24;

  const section = (title: string) => {
    if (y > 760) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(26, 74, 107);
    doc.text(title, M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(20);
  };
  const line = (text: string) => {
    const wrapped = doc.splitTextToSize(text, W - 2 * M);
    for (const w of wrapped) {
      if (y > 780) { doc.addPage(); y = M; }
      doc.text(w, M, y); y += 14;
    }
  };

  section("LOCADOR (Proprietário)");
  line(`Nome: ${dash(owner.full_name)}`);
  line(`CPF: ${dash(owner.cpf)}`);
  line(`E-mail: ${dash(owner.email)}   Telefone: ${dash(owner.phone)}`);
  const oAddr = [owner.address_street, owner.address_number, owner.address_neighborhood, owner.address_city, owner.address_uf].filter(Boolean).join(", ");
  if (oAddr) line(`Endereço: ${oAddr}${owner.address_zip ? ` - CEP ${owner.address_zip}` : ""}`);
  y += 8;

  section("LOCATÁRIO (Inquilino)");
  const t = c.tenant;
  line(`Nome: ${dash(t?.full_name)}`);
  line(`CPF: ${dash(t?.cpf)}   RG: ${dash(t?.rg)}`);
  line(`E-mail: ${dash(t?.email)}   Telefone: ${dash(t?.phone)}`);
  const tAddr = [t?.address_street, t?.address_number, t?.address_neighborhood, t?.address_city, t?.address_state].filter(Boolean).join(", ");
  if (tAddr) line(`Endereço: ${tAddr}`);
  y += 8;

  section("IMÓVEL LOCADO");
  const p = c.property;
  line(`Identificação: ${dash(p?.nickname)}`);
  line(`Endereço: ${dash(p?.address)}${p?.city ? ` - ${p.city}/${p.state ?? ""}` : ""}${p?.zip_code ? ` - CEP ${p.zip_code}` : ""}`);
  line(`Tipo: ${dash(p?.type)}${p?.bedrooms ? ` | ${p.bedrooms} dorm.` : ""}${p?.area_m2 ? ` | ${p.area_m2} m²` : ""}`);
  y += 8;

  section("CONDIÇÕES DA LOCAÇÃO");
  line(`Vigência: ${formatDate(c.start_date)} a ${formatDate(c.end_date)}`);
  line(`Valor do aluguel mensal: ${formatBRL(c.rent_amount)}`);
  line(`Dia de vencimento: todo dia ${c.due_day} de cada mês`);
  line(`Índice de reajuste: ${ADJ_LABEL[c.adjustment_index] ?? "Nenhum"}`);
  line(`Frequência de reajuste: a cada ${c.adjustment_frequency_months} meses`);
  const garantiaTxt = c.guarantee_type === "caucao"
    ? `Caução de ${c.guarantee_months ?? 1} mês(es) (${formatBRL((c.guarantee_months ?? 1) * c.rent_amount)})`
    : GUARANTEE_LABEL[c.guarantee_type];
  line(`Garantia: ${garantiaTxt}`);
  if (c.deposit_amount && c.deposit_amount > 0) line(`Depósito: ${formatBRL(c.deposit_amount)}`);
  y += 8;

  if (owner.bank_name || owner.pix_key) {
    section("DADOS PARA PAGAMENTO");
    if (owner.bank_name) line(`Banco: ${owner.bank_name}   Agência: ${dash(owner.bank_agency)}   Conta: ${dash(owner.bank_account)}`);
    if (owner.pix_key) line(`Chave PIX: ${owner.pix_key}`);
    y += 8;
  }

  section("CLÁUSULAS GERAIS");
  const clauses = [
    "1. O presente contrato é regido pela Lei nº 8.245/91 (Lei do Inquilinato) e demais normas aplicáveis às locações residenciais urbanas.",
    "2. O LOCATÁRIO se obriga a pagar pontualmente o aluguel e demais encargos (IPTU, condomínio, água, luz, gás), no vencimento estipulado.",
    "3. O atraso no pagamento implicará multa de 2% (dois por cento) sobre o valor devido, juros de mora de 1% (um por cento) ao mês e correção monetária pelo IGP-M, sem prejuízo das demais cominações legais.",
    "4. O imóvel destina-se exclusivamente ao uso residencial do LOCATÁRIO e de seu núcleo familiar, sendo vedada cessão, sublocação ou empréstimo, total ou parcial, sem prévia e expressa autorização escrita do LOCADOR.",
    "5. O LOCATÁRIO recebe o imóvel em perfeitas condições de uso e conservação, obrigando-se a devolvê-lo no mesmo estado ao final da locação, sob pena de arcar com os reparos necessários.",
    "6. Quaisquer benfeitorias úteis ou voluptuárias realizadas pelo LOCATÁRIO não serão indenizáveis e poderão ser retiradas, desde que não causem dano ao imóvel, ou incorporar-se-ão a este, a critério do LOCADOR.",
    "7. O reajuste do aluguel observará o índice e a periodicidade descritos nas condições da locação, respeitada a legislação vigente.",
    "8. A rescisão antecipada por iniciativa do LOCATÁRIO sujeita-o ao pagamento de multa proporcional, nos termos do art. 4º da Lei nº 8.245/91.",
    "9. Fica eleito o foro da comarca de situação do imóvel para dirimir quaisquer questões oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.",
  ];
  for (const cl of clauses) { line(cl); y += 2; }
  y += 8;

  if (c.notes) {
    section("OBSERVAÇÕES / CLÁUSULAS ADICIONAIS");
    line(c.notes);
    y += 8;
  }

  // Signatures
  if (y > 640) { doc.addPage(); y = M; }
  y = Math.max(y + 40, 700);
  const cityLine = [owner.address_city, owner.address_uf].filter(Boolean).join("/") || "________________";
  doc.setFontSize(10); doc.setTextColor(20);
  doc.text(`${cityLine}, ${new Date().toLocaleDateString("pt-BR")}.`, M, y);
  y += 36;

  const colW = (W - 2 * M - 40) / 2;
  doc.setDrawColor(20);
  doc.line(M, y, M + colW, y);
  doc.line(M + colW + 40, y, M + 2 * colW + 40, y);
  y += 14;
  doc.setFontSize(10);
  doc.text("LOCADOR", M + colW / 2, y, { align: "center" });
  doc.text("LOCATÁRIO", M + colW + 40 + colW / 2, y, { align: "center" });
  y += 12;
  doc.setTextColor(80);
  doc.text(dash(owner.full_name), M + colW / 2, y, { align: "center" });
  doc.text(dash(t?.full_name), M + colW + 40 + colW / 2, y, { align: "center" });
  y += 12;
  doc.text(`CPF: ${dash(owner.cpf)}`, M + colW / 2, y, { align: "center" });
  doc.text(`CPF: ${dash(t?.cpf)}`, M + colW + 40 + colW / 2, y, { align: "center" });

  doc.save(`contrato-${(c.property?.nickname ?? "alugaflow").replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
