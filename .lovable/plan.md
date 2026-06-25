## Escopo

Atualização única cobrindo Pagamentos, Automação ASAAS, Relatórios, Vistoria e Notificações no Dashboard.

---

### 1. Migration (schema)

Tabela `profiles` — novos campos:
- `auto_charge_enabled boolean default false`
- `auto_charge_days_before int default 3` (1/2/3/5/7)
- `auto_charge_message text`

Tabela `payments` — novo campo:
- `charge_sent_at timestamptz` (preenchido quando cobrança ASAAS é criada)

### 2. Página de Pagamentos (`src/routes/_authenticated/payments.tsx`)

- Topo: cards de resumo (Previsto / Recebido / Atrasado) calculados sobre o filtro ativo.
- Filtros: mês/ano (select), status (pendente/pago/atrasado/todos), imóvel (select).
- Ação "Marcar como pago" em linhas pendentes → atualiza `status=pago`, `paid_date=hoje`, `paid_amount=amount`.
- Ação "Enviar cobrança ASAAS" → chama `createAsaasChargeForPayment`, registra `charge_sent_at`, abre invoice em nova aba.
- Badge "Cobrança enviada" quando `asaas_payment_id` ou `charge_sent_at` presentes.

### 3. Automação de cobranças

**Configurações** (`configuracoes.tsx`):
- Nova seção "Automação de cobranças": toggle, select de dias (1/2/3/5/7), textarea de mensagem.
- Botão "Testar envio agora" → invoca a edge function manualmente.

**Edge Function `send-charges`** (Supabase):
- Roda diariamente via `pg_cron` (08:00 BRT = 11:00 UTC).
- Para cada profile com `auto_charge_enabled=true`: busca `payments` com `status='pendente'`, `due_date = hoje + auto_charge_days_before`, `charge_sent_at IS NULL`.
- Para cada um: cria cobrança ASAAS (cliente + payment com `billingType=BOLETO`), atualiza `asaas_payment_id`, `asaas_invoice_url`, `charge_sent_at=now()`.
- ASAAS envia o boleto por email ao inquilino automaticamente.
- Retorna `{ processed, created, failed, errors }`.

`pg_cron` agendado para chamar a function via `pg_net` (anon key como `apikey`).

### 4. Relatórios (`relatorios.tsx`)

- Já existe filtro de período (datas). Manter, mas adicionar atalhos "Mês atual / Mês anterior / Ano".
- Tabela e exportação CSV já existem — só consolidar rótulos: "Receita bruta", "Despesas", "Lucro líquido".

### 5. Vistoria (`vistoria.tsx`)

- Ao selecionar imóvel: carregar `property_photos` e mostrar como referência (galeria collapsible "Fotos do imóvel").
- Garantir campo `observations` por cômodo no formulário (já existe coluna `inspections.notes` por foto; adicionar `room_notes` no fluxo).
- "Gerar PDF" já existe — revisar para incluir observações por cômodo.

### 6. Dashboard — alertas (`dashboard.tsx`)

Nova seção "Avisos" no topo (acima dos cards):
- 🔴 Vermelho: nº de pagamentos com `due_date < hoje - 5 dias` e `status='pendente'`.
- 🟠 Laranja: nº de contratos com `end_date entre hoje e hoje+30`.
- 🔵 Azul: nº de pagamentos onde `due_date = hoje + auto_charge_days_before` e `charge_sent_at IS NULL` e auto-charge habilitado.

---

## Detalhes técnicos

- A Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` para ler profiles/payments/tenants de todos os usuários e atualizar pagamentos.
- A chave ASAAS de cada proprietário fica em `profiles.asaas_api_key` (já existe). A function usa a chave do dono do contrato.
- O agendamento `pg_cron` é criado via `supabase--insert` (contém URL do projeto e anon key).
- Botão "Testar envio agora" invoca a function via `supabase.functions.invoke('send-charges')` no client autenticado.
- Não vou adicionar nova UI de email custom — o ASAAS já dispara email do boleto. A "mensagem personalizada" é incluída como `description` do payment ASAAS.
