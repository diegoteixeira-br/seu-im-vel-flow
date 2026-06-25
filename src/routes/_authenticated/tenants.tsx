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
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tenants")({
  head: () => ({ meta: [{ title: "Inquilinos — AlugaFlow" }] }),
  component: TenantsPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Obrigatório").max(120),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;
type Tenant = FormValues & { id: string };

function TenantsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("full_name");
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Inquilino excluído"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inquilinos</h1>
          <p className="text-sm text-muted-foreground">{data.length} cadastrado(s)</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Novo inquilino</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-muted-foreground">Carregando...</p>
          : data.length === 0 ? <p className="p-6 text-center text-muted-foreground">Nenhum inquilino cadastrado.</p>
          : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nome</TableHead><TableHead>CPF</TableHead><TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead><TableHead>Nascimento</TableHead><TableHead className="w-[100px]">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.full_name}</TableCell>
                    <TableCell>{t.cpf || "—"}</TableCell>
                    <TableCell>{t.email || "—"}</TableCell>
                    <TableCell>{t.phone || "—"}</TableCell>
                    <TableCell>{formatDate(t.birth_date)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir inquilino?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(t.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
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

      <TenantDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function TenantDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (b: boolean) => void; editing: Tenant | null }) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: editing ?? { full_name: "", cpf: "", email: "", phone: "", birth_date: "", notes: "" },
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const payload = {
        ...values,
        birth_date: values.birth_date || null,
        email: values.email || null,
        user_id: u.user.id,
      };
      if (editing) {
        const { error } = await supabase.from("tenants").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenants").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(editing ? "Inquilino atualizado" : "Inquilino criado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{editing ? "Editar inquilino" : "Novo inquilino"}</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2"><Label>Nome completo *</Label>
            <Input {...form.register("full_name")} />
            {form.formState.errors.full_name && <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>}
          </div>
          <div className="space-y-1"><Label>CPF</Label><Input {...form.register("cpf")} /></div>
          <div className="space-y-1"><Label>Data de nascimento</Label><Input type="date" {...form.register("birth_date")} /></div>
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" {...form.register("email")} />
            {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1"><Label>Telefone</Label><Input {...form.register("phone")} /></div>
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
