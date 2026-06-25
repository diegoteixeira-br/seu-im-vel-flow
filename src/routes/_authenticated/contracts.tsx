import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ativo: "default", encerrado: "secondary", cancelado: "destructive", pendente: "outline",
};

const schema = z.object({
  property_id: z.string().uuid("Selecione um imóvel"),
  tenant_id: z.string().uuid("Selecione um inquilino"),
  start_date: z.string().min(1, "Obrigatório"),
  end_date: z.string().min(1, "Obrigatório"),
  rent_amount: z.coerce.number().min(0),
  due_day: z.coerce.number().int().min(1).max(31),
  deposit_amount: z.coerce.number().min(0).optional(),
  status: z.enum(STATUSES),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;
type Contract = FormValues & { id: string; property?: { nickname: string }; tenant?: { full_name: string } };

function ContractsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Contract | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, property:properties(nickname), tenant:tenants(full_name)")
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success("Contrato excluído"); },
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
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.property?.nickname ?? "—"}</TableCell>
                    <TableCell>{c.tenant?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(c.start_date)} → {formatDate(c.end_date)}</TableCell>
                    <TableCell>{formatBRL(c.rent_amount)}</TableCell>
                    <TableCell>Dia {c.due_day}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[c.status]} className="capitalize">{c.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
                ))}
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
      deposit_amount: editing.deposit_amount ?? 0, status: editing.status, notes: editing.notes ?? "",
    } : {
      property_id: "", tenant_id: "", start_date: "", end_date: "",
      rent_amount: 0, due_day: 5, deposit_amount: 0, status: "ativo", notes: "",
    },
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const payload = { ...values, user_id: u.user.id, deposit_amount: values.deposit_amount ?? 0 };
      if (editing) {
        const { error } = await supabase.from("contracts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contracts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success(editing ? "Contrato atualizado" : "Contrato criado");
      onOpenChange(false);
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
          <div className="space-y-1"><Label>Dia do vencimento *</Label><Input type="number" min={1} max={31} {...form.register("due_day")} /></div>
          <div className="space-y-1"><Label>Depósito (R$)</Label><Input type="number" step="0.01" {...form.register("deposit_amount")} /></div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as FormValues["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2"><Label>Observações</Label><Textarea rows={3} {...form.register("notes")} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
