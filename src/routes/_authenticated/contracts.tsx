import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, FileDown, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createAsaasChargesForContract } from "@/lib/asaas.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatBRL, formatDate } from "@/lib/format";
import { ContractWizard } from "@/components/contract-wizard";
import { downloadContractPDF, type ContractPDFData, type OwnerProfile, type SignatureFooter } from "@/lib/contract-pdf";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({ meta: [{ title: "Contratos — AlugaFlow" }] }),
  component: ContractsPage,
});

type Contract = Omit<ContractPDFData, "guarantor"> & {
  id: string;
  property_id: string;
  tenant_id: string;
  status: string;
  signature_mode: string;
  signature_status: string;
  signed_at: string | null;
  guarantor_name: string | null;
  guarantor_cpf: string | null;
  guarantor_rg: string | null;
  guarantor_email: string | null;
  guarantor_phone: string | null;
  guarantor_address: string | null;
};

function displayStatus(c: Contract) {
  if (c.signature_status === "assinado") return { label: "Assinado", className: "bg-green-700 hover:bg-green-700 text-white" };
  if (c.signature_status === "parcial") return { label: "Assinatura parcial", className: "bg-amber-500 hover:bg-amber-500 text-white" };
  if (c.status !== "ativo") return { label: c.status, className: "" };
  const end = new Date(c.end_date + "T00:00:00");
  const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Encerrado", className: "" };
  if (days <= 30) return { label: "A vencer em 30 dias", className: "bg-orange-500 hover:bg-orange-500 text-white" };
  return { label: "Ativo", className: "bg-green-600 hover:bg-green-600 text-white" };
}

function ContractsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          id, property_id, tenant_id, start_date, end_date, rent_amount, due_day, deposit_amount,
          status, adjustment_index, adjustment_frequency_months, guarantee_type, guarantee_months,
          contract_type, extra_charges, notes, signature_mode, signature_status, signed_at,
          guarantor_name, guarantor_cpf, guarantor_rg, guarantor_email, guarantor_phone, guarantor_address,
          property:properties(nickname,address,city,state,zip_code,type,bedrooms,area_m2),
          tenant:tenants(full_name,cpf,rg,email,phone,address_street,address_number,address_neighborhood,address_city,address_state)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Contract[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contracts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); qc.invalidateQueries({ queryKey: ["payments"] }); toast.success("Contrato excluído"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function downloadPDF(c: Contract) {
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
      const owner: OwnerProfile = { ...(profile ?? {}), email: u.user?.email ?? "—" };
      let signatures: SignatureFooter[] | undefined;
      if (c.signature_status === "assinado" || c.signature_status === "parcial") {
        const { data: sigs } = await supabase
          .from("contract_signatures")
          .select("role, signed_name, signed_cpf, signed_at, signer_ip")
          .eq("contract_id", c.id)
          .not("signed_at", "is", null);
        signatures = (sigs ?? []).map((s) => ({
          role: s.role as SignatureFooter["role"],
          name: s.signed_name ?? "",
          cpf: s.signed_cpf ?? "",
          signed_at: s.signed_at ?? "",
          ip: s.signer_ip,
        }));
      }
      const payload: ContractPDFData = {
        contract_type: c.contract_type, property: c.property, tenant: c.tenant,
        guarantor: c.guarantor_name ? {
          name: c.guarantor_name, cpf: c.guarantor_cpf, rg: c.guarantor_rg,
          email: c.guarantor_email, phone: c.guarantor_phone, address: c.guarantor_address,
        } : null,
        start_date: c.start_date, end_date: c.end_date,
        rent_amount: c.rent_amount, due_day: c.due_day, deposit_amount: c.deposit_amount,
        adjustment_index: c.adjustment_index, adjustment_frequency_months: c.adjustment_frequency_months,
        guarantee_type: c.guarantee_type, guarantee_months: c.guarantee_months,
        extra_charges: c.extra_charges, notes: c.notes,
      };
      downloadContractPDF(c.property?.nickname ?? "contrato", payload, owner, signatures);
    } catch (e) { toast.error((e as Error).message); }
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
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo contrato</Button>
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
                <TableHead>Status</TableHead><TableHead className="w-[160px]">Ações</TableHead>
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
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={s.className}>{s.label}</Badge>
                          {c.signature_mode === "eletronica" && c.signature_status !== "assinado" && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Assinatura eletrônica</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="Baixar PDF do contrato" onClick={() => downloadPDF(c)}><FileDown className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Gerar cobranças ASAAS" onClick={() => sendCharges.mutate(c.id)} disabled={sendCharges.isPending}><Send className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                                <AlertDialogDescription>Os pagamentos e assinaturas vinculados também serão removidos.</AlertDialogDescription></AlertDialogHeader>
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

      <ContractWizard open={open} onOpenChange={setOpen} />
    </div>
  );
}
