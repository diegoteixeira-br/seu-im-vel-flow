import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  newPassword: z.string().min(8, "Mínimo de 8 caracteres"),
  confirm: z.string().min(8, "Mínimo de 8 caracteres"),
}).refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "As senhas não conferem" });

type Values = z.infer<typeof schema>;

export function SecurityTab() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirm: "" },
  });

  const onSubmit = async (v: Values) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: v.newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso");
      form.reset();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <EmailCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Alterar senha</CardTitle>
          <CardDescription>Atualize sua senha de acesso. Recomendamos uma senha forte e única.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Nova senha</Label>
              <Input type="password" autoComplete="new-password" {...form.register("newPassword")} />
              {form.formState.errors.newPassword ? (
                <p className="text-xs text-destructive">{form.formState.errors.newPassword.message}</p>
              ) : null}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
              {form.formState.errors.confirm ? (
                <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Alterar senha"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Autenticação em duas etapas</CardTitle>
          <CardDescription>
            Proteja sua conta com um código temporário gerado por apps como Google Authenticator ou Authy.
            Em breve disponível neste painel — por enquanto, ative em
            {" "}
            <a className="underline" href="https://supabase.com/dashboard/project/_/auth/providers" target="_blank" rel="noreferrer">
              Supabase Auth
            </a>.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

const emailSchema = z.object({ email: z.string().trim().email("E-mail inválido").max(255) });
type EmailValues = z.infer<typeof emailSchema>;

function EmailCard() {
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? "";
      setCurrentEmail(e);
      form.reset({ email: e });
    });
  }, [form]);

  const onSubmit = async (v: EmailValues) => {
    if (v.email === currentEmail) { toast.info("Este já é o seu e-mail atual"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: v.email },
        { emailRedirectTo: `${window.location.origin}/dashboard` },
      );
      if (error) throw error;
      toast.success("Enviamos um link de confirmação para o novo e-mail. A alteração será aplicada após a confirmação.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" />Alterar e-mail</CardTitle>
        <CardDescription>
          E-mail atual: <span className="font-medium">{currentEmail || "—"}</span>. Você receberá um link de confirmação no novo e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Novo e-mail</Label>
            <Input type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Alterar e-mail"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

