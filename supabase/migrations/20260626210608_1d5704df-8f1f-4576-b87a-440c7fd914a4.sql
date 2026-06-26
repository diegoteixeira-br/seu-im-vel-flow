
-- USER ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Bootstrap first user as admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users ORDER BY created_at LIMIT 1
ON CONFLICT DO NOTHING;

-- POSTS
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  cover_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'Equipe AlugaFlow',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read published" ON public.posts FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "admin read all" ON public.posts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update" ON public.posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete" ON public.posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED 5 POSTS
INSERT INTO public.posts (title, slug, excerpt, cover_image_url, author_name, published, content) VALUES
('Mercado imobiliário em Cáceres-MT: o que esperar para 2025',
 'mercado-imobiliario-caceres-mt-2025',
 'Análise do mercado imobiliário de Cáceres em 2025: tendências de aluguel, valorização e oportunidades para proprietários.',
 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200',
 'Equipe AlugaFlow', true,
'Cáceres, no Pantanal mato-grossense, vive um momento de transformação imobiliária em 2025. Com o crescimento do agronegócio regional e a expansão do turismo no Pantanal, a demanda por imóveis para locação aumentou significativamente nos últimos anos.

## Cenário atual

Os bairros centrais como Centro, Cavalhada e DNER concentram a maior demanda por imóveis residenciais. O valor médio do aluguel residencial em Cáceres ficou entre R$ 900 e R$ 2.500 dependendo da localização e do padrão do imóvel.

## Tendências para 2025

- **Valorização de imóveis comerciais** próximos à BR-070 e ao porto.
- **Crescimento da procura por casas com quintal**, impulsionado pelo home office.
- **Reajustes moderados** seguindo o IPCA em vez do IGP-M.

## Oportunidade para proprietários

Proprietários que investem em manutenção, fotos profissionais e anúncios bem feitos conseguem alugar até 40% mais rápido. Plataformas como o AlugaFlow ajudam a profissionalizar essa gestão sem custos altos.'),

('Como calcular o valor justo do aluguel do seu imóvel',
 'como-calcular-valor-justo-aluguel',
 'Aprenda métodos práticos para definir o valor de aluguel do seu imóvel sem perder rentabilidade nem espantar inquilinos.',
 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200',
 'Equipe AlugaFlow', true,
'Definir o valor correto do aluguel é um dos pontos mais importantes para o proprietário. Cobrar a mais afasta interessados; cobrar a menos reduz sua rentabilidade.

## Método 1: Percentual sobre o valor do imóvel

A regra clássica é cobrar entre **0,4% e 0,7% do valor de mercado** do imóvel por mês. Um imóvel avaliado em R$ 300.000 teria aluguel entre R$ 1.200 e R$ 2.100.

## Método 2: Pesquisa de mercado

Pesquise imóveis semelhantes na mesma região (bairro, metragem, padrão). Sites de anúncios e plataformas como AlugaFlow ajudam nessa comparação.

## Método 3: Custos + lucro

Some IPTU, condomínio, manutenção e depreciação. Adicione a margem desejada (geralmente 8% a 12% ao ano sobre o capital investido).

## Dica final

Reajuste anualmente conforme o índice previsto em contrato (IPCA ou IGP-M).'),

('Direitos e deveres do inquilino: o que diz a Lei do Inquilinato',
 'direitos-deveres-inquilino-lei-inquilinato',
 'Resumo prático da Lei nº 8.245/91: o que o inquilino pode, deve e o que não pode fazer durante a locação.',
 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200',
 'Equipe AlugaFlow', true,
'A Lei do Inquilinato (Lei nº 8.245/91) regula a relação entre proprietários e inquilinos no Brasil. Conhecê-la evita conflitos.

## Principais deveres do inquilino

- Pagar pontualmente o aluguel e encargos (condomínio, IPTU se previsto).
- Conservar o imóvel como se fosse seu.
- Comunicar danos ao proprietário imediatamente.
- Devolver o imóvel no estado em que recebeu, salvo desgaste natural.

## Principais direitos do inquilino

- Receber o imóvel em boas condições de uso.
- Ter garantida a vigência do contrato pelo prazo acordado.
- Preferência na compra caso o imóvel seja colocado à venda.
- Não sofrer reajustes acima do índice contratado.

## Multas e rescisão

A rescisão antecipada gera multa proporcional ao tempo restante. Após 12 meses, a multa pode ser dispensada em casos de transferência de trabalho.'),

('5 documentos essenciais antes de alugar um imóvel',
 'documentos-essenciais-antes-de-alugar',
 'Checklist completo de documentos que o proprietário deve exigir do candidato a inquilino para evitar problemas.',
 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200',
 'Equipe AlugaFlow', true,
'Análise documental é o primeiro filtro contra inadimplência. Veja os 5 documentos indispensáveis.

## 1. RG e CPF
Confirme identidade e situação na Receita Federal.

## 2. Comprovante de renda
O ideal é renda mensal de **3x o valor do aluguel**. Aceite holerites, extratos bancários ou declaração de IR.

## 3. Comprovante de residência atual
Conta de luz, água ou telefone dos últimos 3 meses.

## 4. Referências (pessoais e comerciais)
Telefone de antigos locadores ajuda a entender o histórico.

## 5. Documentos do fiador (se aplicável)
Mesma documentação acima + escritura do imóvel dado em garantia.

## Bônus: consulta SPC/Serasa
Sempre faça a consulta com autorização escrita do candidato.'),

('IGP-M ou IPCA: qual índice usar no reajuste do seu contrato de locação',
 'igpm-ou-ipca-reajuste-locacao',
 'Entenda a diferença entre IGP-M e IPCA e escolha o índice mais vantajoso para o reajuste anual do aluguel.',
 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1200',
 'Equipe AlugaFlow', true,
'O reajuste anual do aluguel pode usar diferentes índices. Os mais comuns são IGP-M e IPCA. Saiba qual escolher.

## O que é o IGP-M

Calculado pela FGV, o **Índice Geral de Preços do Mercado** historicamente foi o índice padrão para aluguéis. Em alguns anos, como 2021, atingiu mais de 30% — gerando grande desconforto entre inquilinos.

## O que é o IPCA

O **Índice Nacional de Preços ao Consumidor Amplo**, do IBGE, mede a inflação oficial do país. Costuma ser mais estável e menor que o IGP-M.

## Qual escolher

- **IPCA**: melhor para manter o inquilino satisfeito e reduzir inadimplência.
- **IGP-M**: pode favorecer o proprietário em períodos de alta do dólar e commodities.

## Recomendação

Para contratos novos, a tendência do mercado em 2024-2025 é usar **IPCA** por ser mais previsível. Sempre defina o índice no contrato.');
