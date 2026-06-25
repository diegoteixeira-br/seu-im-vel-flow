# Plano de implementação

Cinco frentes em uma atualização. Estimativa: 1 migração + ~7 arquivos novos/editados.

## 1. Banco de dados (1 migração)

**Expandir `profiles`** com campos do proprietário usados no PDF e cobrança:
- `cpf`, `address_street`, `address_number`, `address_neighborhood`, `address_city`, `address_uf`, `address_zip`
- `bank_name`, `bank_agency`, `bank_account`, `pix_key`
- `asaas_api_key` (texto; RLS já isola por dono — apenas o próprio usuário lê)
- `asaas_environment` (`sandbox` | `production`, default `sandbox`)

**Expandir `payments`** com referência ao ASAAS:
- `asaas_payment_id` (text, unique nullable) — para baixa via webhook
- `asaas_invoice_url` (text) — link da cobrança

**Expandir `tenants`** (somente leitura no PDF): já tem CPF/endereço — ok.

## 2. Servidor (TanStack server fns + 1 server route)

Arquivos em `src/lib/`:
- `asaas.functions.ts` — `createAsaasCharge({ paymentId })` e `createAsaasChargesForContract({ contractId })`. Usa `requireSupabaseAuth`, lê `asaas_api_key` do profile do usuário autenticado, chama `POST /v3/payments` no ASAAS (sandbox/prod), salva `asaas_payment_id` + `asaas_invoice_url` no payment. Cria/reutiliza customer ASAAS por CPF do inquilino (cache em coluna `tenants.asaas_customer_id` — adiciono na migração).
- Server route `src/routes/api/public/asaas-webhook.ts` — recebe `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`, valida header `asaas-access-token` contra secret `ASAAS_WEBHOOK_TOKEN`, usa `supabaseAdmin` para marcar payment como `pago` com `paid_date` e `paid_amount`.

**Secret necessária:** `ASAAS_WEBHOOK_TOKEN` (gero via `generate_secret`). Configurar no painel ASAAS apontando para `https://project--b49e3448-...lovable.app/api/public/asaas-webhook`.

## 3. Frontend

**Nova página `/configuracoes`** (`src/routes/_authenticated/configuracoes.tsx`):
- Form com dados pessoais, endereço, bancários, ASAAS (key + ambiente). Zod + RHF. Item no sidebar.

**Contratos** (`src/routes/_authenticated/contracts.tsx`):
- Ao criar contrato, após gerar payments locais, chamar `createAsaasChargesForContract` (best-effort, com toast). Botão "Enviar cobrança" por contrato.
- PDF: buscar profile completo, incluir cláusulas residenciais padrão (10 cláusulas comuns), bloco de assinatura com nome+CPF de ambos.

**Pagamentos** (`src/routes/_authenticated/payments.tsx`):
- Coluna com botão "Enviar cobrança" (gera no ASAAS se ainda não existe `asaas_payment_id`), e link "Ver fatura" se houver `asaas_invoice_url`.

**Dashboard** (`src/routes/_authenticated/dashboard.tsx`):
- Cards: Recebido mês, Previsto mês, Em atraso (valor total), Receita líquida.
- Lista 5 próximos vencimentos.
- BarChart Recharts dos últimos 6 meses (recebido vs previsto).

**Nova página `/relatorios`** (`src/routes/_authenticated/relatorios.tsx`):
- Filtro de período (de/até). Tabela com receitas e despesas. Totais e saldo. Botão "Exportar CSV".

## 4. Cláusulas do contrato (PDF)

Conjunto fixo PT-BR cobrindo: objeto, prazo, valor e reajuste (usando campos do contrato), forma de pagamento, garantia, conservação, benfeitorias, multa por rescisão, foro. Geradas dinamicamente a partir dos dados do contrato.

## Observações

- ASAAS API key fica no `profiles` (criptografia em repouso do Postgres + RLS por dono). Aviso o usuário que para produção é recomendado usar Edge Secrets — posso migrar depois se quiser.
- Webhook é público (`/api/public/`) e autenticado por token compartilhado no header.
- Não vou alterar autenticação nem schema existente além do listado.

Posso prosseguir?
