# Sistema de Gestão de Planos — AlugaFlow

Implementação completa de gestão de assinaturas com Stripe (Lovable Payments), limites por plano, fluxo de upgrade/downgrade/cancelamento e bloqueios automáticos.

## Pré-requisito: ativar Stripe Payments

Vou usar **Lovable Stripe Payments** (built-in, sem precisar de conta Stripe própria). Esse passo precisa ser feito antes do código de checkout funcionar. Vou rodar a verificação de elegibilidade e ativar.

---

## 1. Banco de dados (migration)

### Tabela `subscriptions`
- `user_id`, `plan_type` (free/investidor/imobiliaria), `stripe_subscription_id`, `stripe_customer_id`, `status` (active/cancelled/past_due/scheduled_downgrade), `current_period_start`, `current_period_end`, `cancel_at_period_end`, `scheduled_plan` (próximo plano se downgrade agendado)
- RLS: usuário lê o próprio; service_role total
- GRANT SELECT a `authenticated`, ALL a `service_role`

### Tabela `cancellations`
- `user_id`, `plan_type`, `reason` (texto), `cancelled_at`, `effective_date`
- RLS: usuário insere/lê o próprio; service_role total

### Função `get_plan_limits(plan text)` 
Retorna jsonb com `max_properties`, `max_listings`, `asaas_enabled`, `advanced_reports`, `max_users`.

### Função `check_plan_limit(_user_id uuid, _resource text)`
SECURITY DEFINER, retorna `{ allowed: bool, current: int, max: int, plan: text }`. Conta imóveis ou anúncios ativos e compara com limite do plano.

---

## 2. Server functions (TanStack)

`src/lib/subscriptions.functions.ts`:
- `getMySubscription` — retorna assinatura ativa + uso atual (imóveis, anúncios)
- `createCheckoutSession` — cria sessão Stripe Checkout para upgrade (usa SDK Stripe via Lovable Payments)
- `scheduleDowngrade` — marca `cancel_at_period_end=true` no Stripe e salva `scheduled_plan` no Supabase
- `cancelSubscription` — cancela no Stripe `at_period_end:true`, insere em `cancellations`, dispara email Resend
- `checkLimit` — wrapper para RPC `check_plan_limit`

## 3. Webhook Stripe

`src/routes/api/public/stripe-webhook.ts` — verifica signature, processa eventos:
- `checkout.session.completed` → cria/atualiza `subscriptions`, atualiza `profiles.plan`
- `customer.subscription.updated` → atualiza períodos e status
- `customer.subscription.deleted` → volta `profiles.plan='free'` (ou aplica `scheduled_plan`)
- `invoice.payment_failed` → status `past_due`

## 4. Página `/minha-conta/plano`

Rota `src/routes/_authenticated/minha-conta.plano.tsx`:
- Card "Plano atual" com badge colorido (cinza/azul/dourado), data de início e próxima cobrança
- Barra de uso: `X de Y imóveis`, `X de Y anúncios ativos` (Progress)
- 3 cards de planos lado a lado (lendo da tabela `plans` para refletir admin)
  - Plano atual: badge "Seu plano atual"
  - Superior: botão primário "Fazer upgrade" → checkout
  - Inferior: botão outline "Fazer downgrade" → modal confirmação
- Seção "Cancelar assinatura" no rodapé (link discreto vermelho) → modal com select de motivo

Modais (AlertDialog): upgrade success, downgrade confirm, cancel confirm com motivo obrigatório.

## 5. Bloqueios automáticos

`src/components/plan-limit-guard.tsx` — hook `usePlanLimit(resource)` + componente `<UpgradeRequiredDialog />`.

Aplicar em:
- `properties.tsx` — botão "Novo imóvel" verifica antes de abrir dialog
- `meus-anuncios.tsx` — toggle "listar publicamente" verifica
- `configuracoes.tsx` aba ASAAS — bloqueia salvar se `plan=free`

## 6. Menu do usuário

No sidebar `_authenticated/route.tsx`:
- Adicionar item "Meu plano" com ícone CreditCard
- Mostrar badge do plano ao lado do email no footer do sidebar

## 7. Email de cancelamento

Função `cancelSubscription` envia via Resend (já configurado) confirmação com data efetiva.

---

## Detalhes técnicos

- **Stripe**: vou usar `enable_stripe_payments` (Lovable-managed). Os price IDs ficam ligados aos planos da tabela `plans` (adiciono coluna `stripe_price_id`).
- **Limites**: aplicados via RPC server-side + verificação client-side para UX (modal antes de abrir form).
- **Tabela `plans`**: adiciono colunas `max_properties`, `max_listings`, `asaas_enabled`, `advanced_reports`, `max_users`, `stripe_price_id` para deixar config no admin.
- **Permissão admin**: já tem painel `/admin/planos` — vai poder editar limites/preços/price_id sem deploy.

## Arquivos a criar/editar

Novos:
- `src/routes/_authenticated/minha-conta.plano.tsx`
- `src/lib/subscriptions.functions.ts`
- `src/routes/api/public/stripe-webhook.ts`
- `src/components/plan-limit-guard.tsx`
- `src/components/cancel-subscription-dialog.tsx`

Editar:
- `src/routes/_authenticated/route.tsx` (menu + badge)
- `src/routes/_authenticated/properties.tsx` (limite)
- `src/routes/_authenticated/meus-anuncios.tsx` (limite)
- `src/routes/_authenticated/configuracoes.tsx` (bloqueio ASAAS free)
- Migration SQL

## Confirmações antes de implementar

1. **Stripe**: confirma que posso ativar Lovable Stripe Payments? (necessário para checkout funcionar). Se já tiver conta Stripe BYOK, me diz.
2. **Price IDs**: depois de ativar Stripe e criar produtos, vou linkar os `stripe_price_id` aos planos. Você prefere que eu crie os produtos automaticamente (Investidor R$147,90 e Imobiliária R$497,90 mensais) ou você cria no painel Stripe e me passa os IDs?
3. **Email de cancelamento**: usar Resend (já configurado)? Domínio remetente?
