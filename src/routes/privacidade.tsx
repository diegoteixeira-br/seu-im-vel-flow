import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — AlugaFlow" },
      { name: "description", content: "Política de Privacidade do AlugaFlow em conformidade com a LGPD (Lei nº 13.709/2018)." },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/"><BrandLogo size={32} /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: 26 de junho de 2026</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Introdução</h2>
            <p>O AlugaFlow ("nós", "nosso") respeita a sua privacidade e está comprometido com a proteção dos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018). Esta Política descreve como coletamos, usamos, armazenamos e compartilhamos as informações dos usuários da plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Dados coletados</h2>
            <ul className="list-disc pl-6">
              <li><strong>Dados cadastrais:</strong> nome, e-mail, telefone, CPF/CNPJ, endereço.</li>
              <li><strong>Dados de imóveis e contratos:</strong> informações de propriedades, inquilinos, contratos e pagamentos inseridos pelo proprietário.</li>
              <li><strong>Dados financeiros:</strong> dados bancários e chave PIX para emissão de cobranças.</li>
              <li><strong>Dados de navegação:</strong> endereço IP, tipo de dispositivo, cookies e logs de acesso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Finalidade do tratamento</h2>
            <p>Utilizamos os dados para: (i) prestar os serviços contratados de gestão imobiliária; (ii) emitir cobranças via boleto, PIX ou cartão por meio de parceiros como o ASAAS; (iii) cumprir obrigações legais e regulatórias; (iv) melhorar a plataforma; (v) comunicar avisos importantes ao titular.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Base legal (LGPD)</h2>
            <p>O tratamento de dados ocorre com base em: execução de contrato (art. 7º, V), cumprimento de obrigação legal (art. 7º, II), legítimo interesse (art. 7º, IX) e consentimento (art. 7º, I) quando aplicável.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Compartilhamento de dados</h2>
            <p>Compartilhamos dados estritamente com: provedores de infraestrutura em nuvem; gateways de pagamento (ex.: ASAAS); autoridades públicas quando exigido por lei. Não vendemos dados pessoais.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Direitos do titular</h2>
            <p>Você pode, a qualquer momento: confirmar a existência de tratamento; acessar, corrigir, anonimizar, bloquear ou eliminar seus dados; solicitar portabilidade; revogar o consentimento. Para exercer seus direitos, envie um e-mail para <a href="mailto:contato@alugaflow.com.br" className="text-primary hover:underline">contato@alugaflow.com.br</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Segurança e retenção</h2>
            <p>Adotamos medidas técnicas e administrativas para proteger os dados (criptografia, controle de acesso, RLS no banco de dados). Os dados são mantidos pelo período necessário ao cumprimento das finalidades ou por obrigação legal.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Cookies</h2>
            <p>Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Você pode gerenciá-los nas configurações do seu navegador.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Alterações desta política</h2>
            <p>Esta Política pode ser atualizada. Notificaremos alterações relevantes por e-mail ou na plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contato — Encarregado (DPO)</h2>
            <p>Dúvidas, solicitações ou reclamações: <a href="mailto:contato@alugaflow.com.br" className="text-primary hover:underline">contato@alugaflow.com.br</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
