import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminSendBroadcast } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Info, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/emails")({
  component: AdminEmails,
});

type Row = { id: string; subject: string; target_plan: string; recipients_count: number; status: string; created_at: string };

function AdminEmails() {
  const send = useServerFn(adminSendBroadcast);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "free" | "investidor" | "imobiliaria">("all");
  const [history, setHistory] = useState<Row[]>([]);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("admin_email_log").select("*").order("created_at", { ascending: false }).limit(50);
    setHistory((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const onSend = async () => {
    if (!subject || !body) return toast.error("Preencha assunto e corpo");
    setSending(true);
    try {
      const r = await send({ data: { subject, body, targetPlan: target } });
      toast.success(`Email enfileirado para ${r.recipients} destinatário(s)`);
      setSubject(""); setBody(""); load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Erro");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Emails em massa</h1>
        <p className="text-sm text-muted-foreground">Comunique-se com seus usuários.</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Envio</AlertTitle>
        <AlertDescription>
          Os emails são registrados aqui e enfileirados. Para envio real, configure o provedor de email (Lovable Emails ou Resend) e o webhook de envio. Por padrão eles ficam como <code>queued</code> no log.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle>Novo envio</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Assunto</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div><Label>Corpo do email</Label><Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Destinatários</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  <SelectItem value="free">Plano Free</SelectItem>
                  <SelectItem value="investidor">Plano Investidor</SelectItem>
                  <SelectItem value="imobiliaria">Plano Imobiliária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button onClick={onSend} disabled={sending} className="w-full"><Send className="mr-2 h-4 w-4" /> {sending ? "Enviando…" : "Enfileirar envio"}</Button></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Assunto</TableHead><TableHead>Alvo</TableHead><TableHead>Destinatários</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {history.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum envio.</TableCell></TableRow> :
                history.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.created_at)}</TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell className="capitalize">{r.target_plan}</TableCell>
                    <TableCell>{r.recipients_count}</TableCell>
                    <TableCell className="capitalize">{r.status}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
