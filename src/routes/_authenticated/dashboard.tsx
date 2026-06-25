import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, FileText, Wallet, AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AlugaFlow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = todayISO();
      const [properties, tenants, contracts, payments, expenses] = await Promise.all([
        supabase.from("properties").select("id,status,rent_amount"),
        supabase.from("tenants").select("id"),
        supabase.from("contracts").select("id,status,rent_amount"),
        supabase.from("payments").select("id,amount,paid_amount,status,due_date,reference_month,paid_date"),
        supabase.from("expenses").select("id,amount,expense_date"),
      ]);
      return {
        properties: properties.data ?? [],
        tenants: tenants.data ?? [],
        contracts: contracts.data ?? [],
        payments: payments.data ?? [],
        expenses: expenses.data ?? [],
        today,
      };
    },
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Carregando...</p>;

  const monthStart = new Date(); monthStart.setDate(1);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const activeContracts = data.contracts.filter((c) => c.status === "ativo").length;
  const occupied = data.properties.filter((p) => p.status === "alugado").length;
  const monthlyIncome = data.payments
    .filter((p) => p.paid_date && p.paid_date >= monthIso)
    .reduce((s, p) => s + Number(p.paid_amount || 0), 0);
  const monthlyExpenses = data.expenses
    .filter((e) => e.expense_date >= monthIso)
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const overdue = data.payments.filter(
    (p) => p.status !== "pago" && p.status !== "cancelado" && p.due_date < data.today,
  );
  const pending = data.payments.filter((p) => p.status === "pendente" && p.due_date >= data.today);

  const cards = [
    { label: "Imóveis", value: data.properties.length, sub: `${occupied} alugados`, icon: Building2 },
    { label: "Inquilinos", value: data.tenants.length, sub: `${activeContracts} contratos ativos`, icon: Users },
    { label: "Receita do mês", value: formatBRL(monthlyIncome), sub: "Recebido", icon: TrendingUp, accent: "text-success" },
    { label: "Despesas do mês", value: formatBRL(monthlyExpenses), sub: "Pagas", icon: Wallet, accent: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua operação.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={"h-4 w-4 " + (c.accent ?? "text-primary")} />
            </CardHeader>
            <CardContent>
              <div className={"text-2xl font-bold " + (c.accent ?? "")}>{c.value}</div>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Pagamentos em atraso ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum atraso. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {overdue.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span>Vencido em {formatDate(p.due_date)}</span>
                    <Badge variant="destructive">{formatBRL(p.amount)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Pagamentos a vencer ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pendente.</p>
            ) : (
              <ul className="space-y-2">
                {pending.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span>Vence em {formatDate(p.due_date)}</span>
                    <Badge variant="secondary">{formatBRL(p.amount)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
