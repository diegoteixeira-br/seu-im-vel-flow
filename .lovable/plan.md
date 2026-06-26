# Painel Admin AlugaFlow — Plano de Implementação

Vou construir o painel admin em **uma única atualização**, mas preciso confirmar algumas decisões importantes antes, porque parte do escopo entra em conflito com a arquitetura atual do projeto e com boas práticas de segurança.

---

## ⚠️ Pontos que preciso ajustar do pedido original

### 1. Roles: usar tabela `user_roles` (NÃO coluna em `profiles`)
O projeto já tem a tabela `user_roles` + enum `app_role` + função `has_role()` exatamente para isso. Guardar `role` em `profiles` é uma vulnerabilidade conhecida (privilege escalation) — qualquer policy de UPDATE em `profiles` permitiria o usuário se auto-promover a admin. **Vou usar a infra já existente** e apenas inserir uma linha `('alugueisteixeira@gmail.com', 'admin')` via migration.

### 2. Stack server-side: TanStack Server Functions, não Edge Functions
O projeto é TanStack Start. A diretriz oficial é usar `createServerFn` para lógica interna (check-admin, create-checkout, envio de email) e **server routes em `/api/public/*`** apenas para webhooks externos (Stripe webhook). Vou seguir esse padrão — Edge Functions só onde realmente precisam (webhook do Stripe pode ficar em server route público com verificação HMAC).

### 3. Email: usar Lovable Emails (não Resend direto)
A diretriz manda recomendar Lovable Emails antes de Resend. Vou implementar com a infra de email do Lovable (queue + templates React Email). Se você insistir em Resend, troco — me avise.

### 4. Pagamentos: usar Stripe nativo do Lovable, não BYOK
A diretriz é clara: **nunca** recomendar BYOK Stripe (pedir chave do usuário). Vou usar `enable_stripe_payments` que já cuida de checkout, webhook e atualização de plano automaticamente, sem você precisar gerenciar chaves. Mais seguro e menos código.

### 5. Coluna `plan` em `profiles`
Hoje não existe campo de plano no banco. Vou adicionar `plan` (`free`|`investidor`|`imobiliaria`) e `active` (bool, para desativar conta sem deletar) em `profiles`.

---

## 📦 O que será entregue

### Banco (1 migração)
- `profiles`: adicionar `plan`, `active`, `last_sign_in_at`
- `user_roles`: seed `alugueisteixeira@gmail.com` como admin (via trigger no signup OU lookup direto em auth.users)
- Nova tabela `plans` (nome, preço, preço_promocional, válido_até, ativo, benefícios JSONB)
- Nova tabela `admin_finance_entries` (descrição, tipo, valor, categoria, data)
- Nova tabela `admin_email_log` (assunto, plano_alvo, total_destinatarios, sent_at)
- Nova tabela `admin_logs` (user_id, ação, detalhes JSONB)
- RLS: todas as tabelas admin-only via `has_role(auth.uid(), 'admin')`
- Trigger atualizado em `handle_new_user` para promover o email-seed a admin automaticamente

### Server Functions (`src/lib/admin.functions.ts`)
- `requireAdmin` middleware (estende `requireSupabaseAuth` + checa `has_role`)
- `getAdminDashboard` — métricas
- `listUsers`, `updateUserPlan`, `toggleUserAdmin`, `toggleUserActive`
- `listFinance`, `createFinanceEntry`, `getFinanceChart`
- `listPlans`, `updatePlan`
- `sendBroadcastEmail`, `listEmailHistory`
- Todas chamam `logAdminAction()` internamente

### Server Route público
- `src/routes/api/public/stripe-webhook.ts` (se Stripe BYOK confirmado) OU usar webhook automático do `enable_stripe_payments`

### Páginas (todas em `src/routes/_authenticated/admin/`)
- `_authenticated/admin/route.tsx` — layout admin com sidebar própria + gate `has_role` no `beforeLoad`
- `admin/index.tsx` — dashboard com cards e gráficos
- `admin/usuarios.tsx`
- `admin/financeiro.tsx`
- `admin/planos.tsx`
- `admin/emails.tsx`
- `admin/blog.tsx` — mover/reaproveitar o existente
- `admin/pagamentos.tsx` — status do Stripe + link da dashboard

### UI
- Sidebar admin separada (não mistura com sidebar do usuário comum)
- Item "Admin" aparece no menu principal só se `has_role('admin')`
- Redirect automático `/admin/*` → `/dashboard` para não-admins

---

## ❓ Decisões que preciso confirmar antes de codar

1. **Stripe**: posso usar `enable_stripe_payments` (recomendado, sem chaves)? Ou você **exige** BYOK com sua própria conta Stripe?
2. **Email**: posso usar Lovable Emails (recomendado)? Ou exige Resend?
3. **Promoção do admin inicial**: posso fazer via SQL que busca o `id` em `auth.users WHERE email = 'alugueisteixeira@gmail.com'` no momento da migration? (Funciona só se a conta já existir — se ainda não existir, crio um trigger que promove no momento do signup.)

Responde essas 3 e eu implemento tudo de uma vez.
