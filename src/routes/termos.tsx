import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — AlugaFlow" },
      { name: "description", content: "Termos de Uso da plataforma AlugaFlow — SaaS de gestão imobiliária." },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/"><BrandLogo size={32} /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: 26 de junho de 2026</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. Aceitação dos termos</h2>
            <p>Ao criar uma conta ou utilizar o AlugaFlow, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso e com a nossa <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Descrição do serviço</h2>
            <p>O AlugaFlow é uma plataforma SaaS de gestão imobiliária destinada a proprietários independentes e imobiliárias, oferecendo cadastro de imóveis, inquilinos, contratos, cobranças, vistorias, relatórios e portal público de anúncios.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Cadastro e conta</h2>
            <p>O usuário deve fornecer informações verdadeiras e atualizadas. É responsável pela guarda das credenciais e por todas as atividades realizadas na sua conta.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Planos e pagamentos</h2>
            <p>O AlugaFlow oferece planos gratuito e pagos, com limites e funcionalidades distintos. Valores, formas de pagamento e renovação automática são informados na página de Planos. A inadimplência poderá implicar suspensão da conta.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Uso aceitável</h2>
            <p>É vedado: (i) publicar anúncios falsos ou de imóveis sem autorização; (ii) utilizar a plataforma para fins ilícitos; (iii) tentar acessar dados de terceiros; (iv) reproduzir, descompilar ou comercializar o software.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Conteúdo do usuário</h2>
            <p>O usuário é o único responsável pelos dados, fotos e textos inseridos na plataforma, garantindo possuir todos os direitos necessários e isentando o AlugaFlow de qualquer responsabilidade por conteúdo de terceiros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Cobranças e gateway de pagamento</h2>
            <p>A emissão de boletos, PIX e cartão é intermediada por gateways como o ASAAS. O AlugaFlow não retém valores recebidos; os repasses ocorrem diretamente ao proprietário, conforme regras do gateway.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Limitação de responsabilidade</h2>
            <p>O AlugaFlow é uma ferramenta de apoio à gestão e não substitui consultoria jurídica, contábil ou imobiliária. Não nos responsabilizamos por prejuízos decorrentes de decisões tomadas com base nas informações geradas pela plataforma, falhas de terceiros (gateways, internet) ou uso indevido.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Propriedade intelectual</h2>
            <p>Todos os direitos sobre marca, layout, código-fonte e materiais do AlugaFlow são reservados. Os dados inseridos pelo usuário permanecem de sua titularidade.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Cancelamento</h2>
            <p>O usuário pode cancelar a conta a qualquer momento pelas Configurações. Após o cancelamento, os dados serão retidos pelo prazo legal e posteriormente eliminados, conforme a Política de Privacidade.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Alterações</h2>
            <p>Estes Termos podem ser atualizados. A continuidade de uso após a publicação das alterações implica concordância com a nova versão.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">12. Foro</h2>
            <p>Fica eleito o foro da comarca do domicílio do usuário, com renúncia a qualquer outro, para dirimir controvérsias decorrentes destes Termos. Aplica-se a legislação brasileira.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">13. Contato</h2>
            <p><a href="mailto:contato@alugaflow.com.br" className="text-primary hover:underline">contato@alugaflow.com.br</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
