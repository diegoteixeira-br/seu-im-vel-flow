import { BrandLogo } from "@/components/brand-logo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/password-input";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Entrar — AlugaFlow" }] }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2, "Informe seu nome").max(100),
  accept_terms: z.literal(true, { errorMap: () => ({ message: "Você precisa aceitar os Termos e a Política de Privacidade" }) }),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode === "signup" ? "signup" : "signin");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <BrandLogo size={48} />
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>Acesse sua conta ou crie uma nova.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-4"><SignInForm /></TabsContent>
              <TabsContent value="signup" className="mt-4"><SignUpForm onDone={() => setTab("signin")} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const onSubmit = async (values: z.infer<typeof signInSchema>) => {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) { toast.error("Falha no login: " + error.message); return; }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  };
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
      </Button>
      <ForgotPasswordDialog defaultEmail={form.watch("email")} />
    </form>
  );
}

function ForgotPasswordDialog({ defaultEmail }: { defaultEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (open) setEmail(defaultEmail ?? ""); }, [open, defaultEmail]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Informe seu e-mail"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Enviamos um link de recuperação para seu e-mail.");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="block w-full text-center text-xs text-primary hover:underline">
          Esqueci minha senha
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recuperar senha</DialogTitle>
          <DialogDescription>Informe seu e-mail para receber o link de redefinição.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="recover_email">E-mail</Label>
            <Input id="recover_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Enviar link"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { full_name: "", email: "", password: "", accept_terms: false as unknown as true },
  });
  const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: values.full_name, accepted_terms_at: new Date().toISOString() },
      },
    });
    if (error) { toast.error("Falha no cadastro: " + error.message); return; }
    toast.success("Conta criada! Verifique seu e-mail se a confirmação estiver ativada.");
    onDone();
  };
  const accepted = form.watch("accept_terms");
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" {...form.register("full_name")} />
        {form.formState.errors.full_name && <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email2">E-mail</Label>
        <Input id="email2" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password2">Senha</Label>
        <Input id="password2" type="password" autoComplete="new-password" {...form.register("password")} />
        {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
      </div>
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
        <input
          id="accept_terms"
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary"
          checked={Boolean(accepted)}
          onChange={(e) => form.setValue("accept_terms", e.target.checked as unknown as true, { shouldValidate: true })}
        />
        <Label htmlFor="accept_terms" className="text-xs font-normal leading-snug text-muted-foreground">
          Li e concordo com os{" "}
          <Link to="/termos" target="_blank" className="text-primary underline">Termos de Uso</Link>{" "}
          e com a{" "}
          <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.
        </Label>
      </div>
      {form.formState.errors.accept_terms && <p className="text-xs text-destructive">{form.formState.errors.accept_terms.message as string}</p>}
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !accepted}>
        {form.formState.isSubmitting ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}
