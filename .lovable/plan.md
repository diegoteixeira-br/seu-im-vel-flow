## Análise: o que falta vs Accordous

Comparando seu Configurações atual com a Accordous, identifiquei estas funcionalidades ausentes (não vou mudar o estilo, só adicionar comportamento):

| Área Accordous | Status no AlugaFlow | Ação proposta |
|---|---|---|
| Perfil (nome, telefone, e-mail) | ✅ já existe | — |
| Segurança (alterar senha, 2FA, Passkeys) | ❌ ausente | adicionar aba |
| Dados de Cobrança (PF/PJ + endereço) | ⚠️ parcial (sem PF/PJ toggle) | adicionar toggle |
| Assinatura / faturas do SaaS | ❌ ausente | fora do escopo (precisa billing próprio) — pular |
| Contas de Recebimento (PIX/ASAAS/Inter) | ⚠️ só ASAAS | adicionar PIX manual + Inter (placeholder) |
| Automações de cobrança | ✅ já existe | — |
| **Identidade Visual (logo + marca d'água + cabeçalho/rodapé)** | ❌ **ausente — pedido explícito** | **implementar agora** |
| Usuários / multi-perfil | ❌ ausente | fora do escopo |

## Foco desta entrega

Implementar **Identidade Visual** e **Segurança** (alterar senha), que são os mais úteis no curto prazo. Faturas SaaS e Usuários ficam para depois.

### 1. Identidade Visual (nova aba na página de Configurações)

Sub-abas internas: **Logotipo**, **Contratos** (marca d'água + cabeçalho + rodapé), **Documentos** (mesmos campos para faturas/recibos).

- Upload de **logotipo** (PNG até 2 MB) → bucket `branding/{user_id}/logo.png`
- Upload de **marca d'água** semitransparente → `branding/{user_id}/watermark.png`
- **Texto do cabeçalho** e **texto do rodapé** (Textarea, salvos em `profiles`)
- Botão "Salvar alterações" + indicador "Todas as alterações estão salvas"
- Preview lateral mostrando como ficaria no PDF (mock simples)

Integração com PDFs existentes: `src/lib/contract-pdf.ts` e `src/lib/contract-templates.ts` passam a ler logo/marca d'água/cabeçalho/rodapé do profile e renderizar no jsPDF (`addImage` para logo no topo, marca d'água centralizada com opacidade, header/footer em cada página).

### 2. Segurança (nova aba)

- **Alterar senha**: senha atual + nova + confirmar → `supabase.auth.updateUser({ password })`
- Aviso sobre 2FA/Passkeys (Supabase já suporta MFA TOTP — adiciono botão "Ativar autenticação em duas etapas" usando `supabase.auth.mfa.enroll`)

### Mudanças técnicas

- **Migração SQL**: adicionar colunas em `profiles` — `logo_url text`, `watermark_url text`, `pdf_header text`, `pdf_footer text`, `person_type text default 'PF'` (PF/PJ), `cnpj text`, `razao_social text`
- **Bucket privado**: `branding` com RLS (`{user_id}/...`)
- **Nova aba "Identidade Visual"** em `configuracoes.tsx` + componente `BrandingTab` (sub-tabs)
- **Nova aba "Segurança"** em `configuracoes.tsx`
- Atualizar `contract-pdf.ts` para aplicar logo/marca d'água/header/footer

Tudo dentro do mesmo layout de Tabs que já está aprovado — sem mudanças de estilo.
