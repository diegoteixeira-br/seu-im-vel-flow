
## Escopo
Refatorar o módulo de Contratos para um wizard de 6 etapas, adicionar cobranças extras, fiador, template completo da Lei 8.245/91 e assinatura eletrônica via link único enviado por email.

---

### 1. Migration (schema)

**`contracts` — novos campos:**
- `contract_type text default 'residencial'` (residencial/comercial)
- `extra_charges jsonb default '[]'` (lista `{label, amount}` — IPTU, condomínio, água, luz)
- `guarantor_name text`, `guarantor_cpf text`, `guarantor_rg text`, `guarantor_phone text`, `guarantor_email text`, `guarantor_address text` (fiador opcional)
- `signature_mode text default 'manual'` (manual/eletronica)
- `signature_status text default 'pendente'` (pendente/parcial/assinado)
- `signed_at timestamptz`
- `signed_pdf_path text` (PDF final no storage)

**Nova tabela `contract_signatures`:**
- `id`, `contract_id` (FK), `role` (locador/locatario/fiador), `name`, `email`, `token` (uuid único), `signed_name`, `signed_cpf`, `signed_at`, `signer_ip`, `created_at`
- RLS: dono do contrato pode ler; INSERT/UPDATE via service_role pelo endpoint público.

**Novo bucket privado `signed-contracts`** para PDFs finais.

### 2. Wizard de Contratos (`src/routes/_authenticated/contracts.tsx`)

Substitui o `ContractDialog` atual por wizard com `Stepper` (barra de progresso) e 6 passos:

1. **Imóvel** — grid de cards com foto/capa (reusar `PropertyCover`) e seleção.
2. **Detalhes** — tipo, prazo (meses), data início, valor, dia vencimento (1-28), reajuste (IGP-M/IPCA/Nenhum), lista dinâmica de cobranças extras.
3. **Participantes** — proprietário (read-only do profile), inquilino (select), toggle "Adicionar fiador" + campos.
4. **Garantia** — radio: Sem garantia / Fiador (link com etapa 3) / Caução em dinheiro (input N meses) / Seguro fiança.
5. **Documento** — preview HTML do contrato + botão "Visualizar PDF" usando `generateContractPDF` atualizado.
6. **Assinatura** — radio Manual vs Eletrônica. Manual = baixar PDF e salvar contrato. Eletrônica = salva contrato, cria registros em `contract_signatures` (um por signatário com email) e dispara envio de email com link.

Cada etapa valida com Zod antes de avançar. Dados acumulados em estado local.

### 3. Template do contrato (PDF)

Reescrever `generateContractPDF` para incluir as 10 cláusulas com texto completo da Lei 8.245/91, dados reais (proprietário, inquilino, fiador, endereço do imóvel, valor por extenso via helper), cobranças adicionais listadas, e bloco de assinaturas (locador/locatário/fiador) com linha, nome, CPF e data.

Helper `numeroPorExtenso(valor)` em `src/lib/extenso.ts` (implementação simples para reais).

### 4. Assinatura eletrônica

**Server function `src/lib/signatures.functions.ts`:**
- `sendSignatureInvites(contractId)` — autenticado, lê signatures pendentes, envia email via Resend connector (ou Lovable Emails se já configurado) com link `https://<host>/assinar/{token}`.
- `finalizeSignedContract(contractId)` — quando todas assinadas: gera PDF com rodapé de assinaturas usando `pdf-lib` ou via `jspdf` no server (usar jsPDF que já existe — invocar em server fn), salva em bucket `signed-contracts`, atualiza `contracts.signed_pdf_path`, `signature_status='assinado'`, `signed_at=now()`, envia email ao proprietário.

**Rota pública `src/routes/api/public/sign-contract.ts`:**
- `GET ?token=...` retorna dados do contrato + signatário (nome, role, contrato resumido).
- `POST {token, signed_name, signed_cpf}` valida CPF, registra IP (`x-forwarded-for`), `signed_at`, e chama `finalizeSignedContract` se todas assinadas.

Usa `supabaseAdmin` (carregado dentro do handler).

**Página pública `src/routes/assinar.$token.tsx`:**
- Busca dados via fetch para `/api/public/sign-contract?token=...`.
- Mostra preview do contrato (iframe do PDF), formulário (nome completo, CPF com máscara), checkbox "Li e concordo", botão "Assinar".
- Após sucesso, tela de confirmação.

### 5. Email

Usar **Lovable Emails** (built-in). Templates React Email em `src/lib/email-templates/`:
- `signature-invite.tsx` — convite para assinar com link.
- `signature-complete.tsx` — notifica proprietário.

Disparo via helper `src/lib/email/send.ts` (rota `/lovable/email/transactional/send`).

Pré-requisito: domínio de email configurado. Se não estiver, mostro o dialog de setup antes.

### 6. Detalhes técnicos

- Wizard como componente novo `src/components/contract-wizard.tsx` para isolar do arquivo principal.
- CPF mask: reusar helpers de `tenant-docs.ts`.
- Geração de PDF no servidor: usar `jspdf` (já instalado) dentro de `*.server.ts` chamado pela function; salvar buffer no Storage via `supabaseAdmin`.
- IP do signatário: `request.headers.get('x-forwarded-for')?.split(',')[0]`.
- Validação Zod em cada etapa; estado mantido em `useState` no wizard.
- Contratos existentes continuam funcionando (campos novos têm defaults).

### Ordem de execução

1. Migration (schema + bucket + RLS).
2. Verificar/instalar Lovable Emails infra + scaffold transactional + templates.
3. Helpers (`extenso.ts`, atualizar `generateContractPDF`).
4. Wizard component + integrar em `contracts.tsx`.
5. Server functions de assinatura + rota pública + página `/assinar/$token`.
6. Build check.

---

**Pontos a confirmar antes de implementar:**
- Email: ok usar Lovable Emails built-in? (precisa configurar domínio se ainda não houver)
- "Seguro fiança" — apenas registro do tipo, sem integração com seguradora?
