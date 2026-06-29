
CREATE TABLE public.legal_pages (
  slug text PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_pages TO anon;
GRANT SELECT, INSERT, UPDATE ON public.legal_pages TO authenticated;
GRANT ALL ON public.legal_pages TO service_role;

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read legal pages"
  ON public.legal_pages FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert legal pages"
  ON public.legal_pages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update legal pages"
  ON public.legal_pages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_legal_pages_updated_at
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.legal_pages (slug, content) VALUES
('termos', '<h2>1. Aceitação dos termos</h2><p>Ao criar uma conta ou utilizar o AlugaFlow, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso e com a nossa Política de Privacidade.</p><h2>2. Descrição do serviço</h2><p>O AlugaFlow é uma plataforma SaaS de gestão imobiliária destinada a proprietários independentes e imobiliárias, oferecendo cadastro de imóveis, inquilinos, contratos, cobranças, vistorias, relatórios e portal público de anúncios.</p><h2>3. Cadastro e conta</h2><p>O usuário deve fornecer informações verdadeiras e atualizadas. É responsável pela guarda das credenciais e por todas as atividades realizadas na sua conta.</p><h2>4. Planos e pagamentos</h2><p>O AlugaFlow oferece planos gratuito e pagos, com limites e funcionalidades distintos. Valores, formas de pagamento e renovação automática são informados na página de Planos. A inadimplência poderá implicar suspensão da conta.</p><h2>5. Uso aceitável</h2><p>É vedado: (i) publicar anúncios falsos ou de imóveis sem autorização; (ii) utilizar a plataforma para fins ilícitos; (iii) tentar acessar dados de terceiros; (iv) reproduzir, descompilar ou comercializar o software.</p><h2>6. Conteúdo do usuário</h2><p>O usuário é o único responsável pelos dados, fotos e textos inseridos na plataforma, garantindo possuir todos os direitos necessários e isentando o AlugaFlow de qualquer responsabilidade por conteúdo de terceiros.</p><h2>7. Cobranças e gateway de pagamento</h2><p>A emissão de boletos, PIX e cartão é intermediada por gateways como o ASAAS. O AlugaFlow não retém valores recebidos; os repasses ocorrem diretamente ao proprietário, conforme regras do gateway.</p><h2>8. Limitação de responsabilidade</h2><p>O AlugaFlow é uma ferramenta de apoio à gestão e não substitui consultoria jurídica, contábil ou imobiliária. Não nos responsabilizamos por prejuízos decorrentes de decisões tomadas com base nas informações geradas pela plataforma, falhas de terceiros (gateways, internet) ou uso indevido.</p><h2>9. Propriedade intelectual</h2><p>Todos os direitos sobre marca, layout, código-fonte e materiais do AlugaFlow são reservados. Os dados inseridos pelo usuário permanecem de sua titularidade.</p><h2>10. Cancelamento</h2><p>O usuário pode cancelar a conta a qualquer momento pelas Configurações. Após o cancelamento, os dados serão retidos pelo prazo legal e posteriormente eliminados, conforme a Política de Privacidade.</p><h2>11. Alterações</h2><p>Estes Termos podem ser atualizados. A continuidade de uso após a publicação das alterações implica concordância com a nova versão.</p><h2>12. Foro</h2><p>Fica eleito o foro da comarca do domicílio do usuário, com renúncia a qualquer outro, para dirimir controvérsias decorrentes destes Termos. Aplica-se a legislação brasileira.</p><h2>13. Contato</h2><p><a href="mailto:contato@alugaflow.com.br">contato@alugaflow.com.br</a></p>'),
('privacidade', '<h2>1. Introdução</h2><p>O AlugaFlow ("nós", "nosso") respeita a sua privacidade e está comprometido com a proteção dos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018). Esta Política descreve como coletamos, usamos, armazenamos e compartilhamos as informações dos usuários da plataforma.</p><h2>2. Dados coletados</h2><ul><li><strong>Dados cadastrais:</strong> nome, e-mail, telefone, CPF/CNPJ, endereço.</li><li><strong>Dados de imóveis e contratos:</strong> informações de propriedades, inquilinos, contratos e pagamentos inseridos pelo proprietário.</li><li><strong>Dados financeiros:</strong> dados bancários e chave PIX para emissão de cobranças.</li><li><strong>Dados de navegação:</strong> endereço IP, tipo de dispositivo, cookies e logs de acesso.</li></ul><h2>3. Finalidade do tratamento</h2><p>Utilizamos os dados para: (i) prestar os serviços contratados de gestão imobiliária; (ii) emitir cobranças via boleto, PIX ou cartão por meio de parceiros como o ASAAS; (iii) cumprir obrigações legais e regulatórias; (iv) melhorar a plataforma; (v) comunicar avisos importantes ao titular.</p><h2>4. Base legal (LGPD)</h2><p>O tratamento de dados ocorre com base em: execução de contrato (art. 7º, V), cumprimento de obrigação legal (art. 7º, II), legítimo interesse (art. 7º, IX) e consentimento (art. 7º, I) quando aplicável.</p><h2>5. Compartilhamento de dados</h2><p>Compartilhamos dados estritamente com: provedores de infraestrutura em nuvem; gateways de pagamento (ex.: ASAAS); autoridades públicas quando exigido por lei. Não vendemos dados pessoais.</p><h2>6. Direitos do titular</h2><p>Você pode, a qualquer momento: confirmar a existência de tratamento; acessar, corrigir, anonimizar, bloquear ou eliminar seus dados; solicitar portabilidade; revogar o consentimento. Para exercer seus direitos, envie um e-mail para <a href="mailto:contato@alugaflow.com.br">contato@alugaflow.com.br</a>.</p><h2>7. Segurança e retenção</h2><p>Adotamos medidas técnicas e administrativas para proteger os dados (criptografia, controle de acesso, RLS no banco de dados). Os dados são mantidos pelo período necessário ao cumprimento das finalidades ou por obrigação legal.</p><h2>8. Cookies</h2><p>Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Você pode gerenciá-los nas configurações do seu navegador.</p><h2>9. Alterações desta política</h2><p>Esta Política pode ser atualizada. Notificaremos alterações relevantes por e-mail ou na plataforma.</p><h2>10. Contato — Encarregado (DPO)</h2><p>Dúvidas, solicitações ou reclamações: <a href="mailto:contato@alugaflow.com.br">contato@alugaflow.com.br</a>.</p>')
ON CONFLICT (slug) DO NOTHING;
