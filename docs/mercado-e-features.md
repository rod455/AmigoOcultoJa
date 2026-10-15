# Mercado, features e aquisição (pessoa física, empresas e IAs)

Pesquisa de 15/10/2026, feita a partir de buscas na web, com links para as fontes. Os preços de concorrentes tirados de matérias de 2020 a 2024 podem estar desatualizados e estão marcados como *(não verificado)*. Quando algo é inferência nossa, o texto diz.

## 1. Quem disputa a mesma busca

| Nome | Plataformas | Modelo | O que tem de diferente |
|---|---|---|---|
| amigosecreto.com.br | Web | Grátis, com extras pagos *(2021, não verificado: R$ 19 para excluir pares, R$ 49 para escolher quem tirar)* | É o mais antigo do Brasil. Pede cadastro de todos e oferece valor mínimo e máximo, mensagens anônimas e uma vitrine de produtos. [Olhar Digital](https://olhardigital.com.br/2021/12/06/internet-e-redes-sociais/amigo-secreto-site-gratuito-realiza-sorteios-veja-como-usar/) |
| Migo Secreto | Web, iOS | Grátis | É o mais parecido conosco: link no WhatsApp e cada pessoa toca no próprio nome. Tem **senha no grupo**. [Canaltech](https://canaltech.com.br/apps/amigo-secreto-online-sites-e-apps-para-organizar-o-sorteio/) |
| Gifwe | Web, iOS, Android | Grátis | **Chat anônimo** e **dependentes sem conta** (crianças, idosos, pets). [Mobills](https://www.mobills.com.br/?p=224375) |
| Papelzinho | iOS, Android | Freemium (US$ 3,99 por grupo premium) | Lista de 3 presentes e chat anônimo. O envio pelo WhatsApp é pago. [App Store](https://apps.apple.com/br/app/papelzinho-amigo-secreto/id1133660909) |
| Amigo Secreto 22 | iOS, Android | Anúncios + premium *(não verificado)* | Restrições e WhatsApp só na versão paga. |
| Meu Amigo Oculto | iOS | ? | **Link pessoal e intransferível** para cada participante. |
| Elfster / secretsanta.com | Web, iOS, Android | Grátis (afiliados + marcas) | Líder global. Perguntas anônimas, endereço de entrega, grupos grandes, outros formatos de brincadeira. Publica `llms.txt`. |
| DrawNames | Web, iOS, Android | Grátis | Não pede cadastro, tem exclusões, ideias de presente e uma página para grupos grandes. |
| Giftster | Web, iOS, Android | Grátis | Lista de desejos o ano todo, "marcar como comprado" e **repetir o sorteio do ano anterior**. |
| Trivia, Smarter Secret Santa | Slack, Teams | Pago, grátis | Amigo secreto dentro da ferramenta de trabalho. |
| Snappy, Giftogram, Pluxee, Ticket | Web (B2B) | Taxa ou valor do vale | Presentes e vale-presente pagos pela empresa. Não fazem sorteio. |

**Onde já ganhamos:** restrições e envio pelo WhatsApp grátis (amigosecreto.com.br, Amigo Secreto 22 e Papelzinho cobram por um ou outro), quem participa não se cadastra, sorteio refeito com a menor troca possível e lista de presentes com link de compra.

**O sinal mais importante:** as listas brasileiras de "melhores sites e apps para amigo secreto" (Tecnoblog, Canaltech, TecMundo, Olhar Digital, Mobills, Buscapé) citam sempre os mesmos 6 ou 7 nomes, e nós não aparecemos em nenhuma. Os assistentes de IA tendem a responder com base nessas listas. Isso é inferência: não há dado sobre respostas em português.

## 2. Features que agregam, em ordem de impacto

| # | Feature | Quem tem | Pessoa física | Empresa | Esforço |
|---|---|---|---|---|---|
| 1 | **Proteção do nome**: código ou PIN por pessoa, ou link pessoal, para ninguém tocar no nome de outra | Meu Amigo Oculto, Migo Secreto | alto | muito alto (anonimato) | baixo/médio |
| 2 | **Perguntas anônimas ao amigo sorteado** ("prefere livro ou caneca?") | Elfster, Gifwe, Papelzinho | alto (mais visitas até a troca, mais cliques de afiliado) | médio | médio |
| 3 | **Repetir o grupo no ano seguinte**, sem repetir o par do ano anterior | Giftster | alto (recorrência anual) | médio | baixo |
| 4 | **Vale-presente na lista** (vale da Amazon como item) | Pluxee, Ticket, Elfster | médio | alto | baixo |
| 5 | **Endereço de entrega e "presente recebido"** para quem é remoto | Elfster, MySanta | médio | alto | médio (LGPD: endereço é dado pessoal) |
| 6 | **Modo empresa**: vários grupos numa conta, colar a lista de nomes de uma planilha, mais de 50 pessoas, painel consolidado para o RH | DrawNames, Elfster | baixo | muito alto | alto |
| 7 | **Dependentes sem celular** (criança, avó): alguém da família abre por ela | Gifwe, Giftster | médio | baixo | baixo |
| 8 | **Outros formatos** (amigo da onça, "rouba-presente") | Elfster, Amigo Rouba | médio | médio | médio |
| 9 | **Integração com Slack ou Teams** | Trivia, Smarter Secret Santa | baixo | médio (o WhatsApp domina no Brasil) | médio/alto |
| 10 | **Empresa paga os presentes** (vale-presente comprado pela empresa) | Snappy, Giftogram | — | alto, e é uma nova receita | alto |

Recomendação até o Natal de 2026:
- **Entra agora:** 1, 3 e 4.
- **Logo depois:** 2.
- **Antes de construir o 6:** medir a procura pela página de empresas (`contact_clicked`, seção 4).
- **O 10 só com parceiro:** fale primeiro com Pluxee ou Ticket.

## 3. O que a empresa procura

Dados citados pela pesquisa:
- **Tamanho:** 28% de quem participa de amigo secreto faz no trabalho. Presente médio de cerca de R$ 72 (CNDL/SPC, 2025). [Diário do Comércio](https://diariodocomercio.com.br/negocios/amigo-secreto-deve-movimentar-r-67-bilhoes-natal/)
- **Pressão social:** 14% participam só para não parecer antissociais. A empresa quer teto de gasto claro e adesão opcional. [Citation HR](https://www.citation.co.uk/news/hr-and-employment-law/secret-santa-tips-to-avoid-an-hr-headache/)
- **Grupos grandes:** o sorteio manual falha acima de cerca de 30 pessoas, e os guias sugerem dividir por área ou escalonar o valor. [Elfster](https://www.elfster.com/blog/secret-santa-large-groups)
- **Equipes remotas:** os guias recomendam combinar a entrega, marcar a data de envio de 7 a 10 dias antes e fazer a revelação por vídeo. [GiftList](https://giftlist.com/blog/how-to-host-a-virtual-secret-santa-for-remote-employees)
- **Vale-presente:** o RH vem trocando a cesta pelo cartão-presente digital. [Pluxee](https://www.pluxee.com.br/blog/guia-do-vale-presente-para-empresas/)

Brecha de mercado: não achamos nenhum serviço brasileiro que junte sorteio, vale-presente e painel do RH. Isso vale pelo que a pesquisa encontrou; pode existir algo que ela não pegou.

## 4. O que já foi feito (15/10/2026)

**Página `/empresas`**, voltada para RH, líderes de time e comitê da festa:
- **Conteúdo:** promessa, resumo factual, dores da empresa, 3 passos, para quem é, guia rápido e FAQ para RH, TI e jurídico.
- **Contato:** o que ainda não existe (sorteio com mais de 50 pessoas, empresa pagando os presentes) virou "Fale com a gente" por e-mail.
- **Medição:** cada clique nesse contato gera o evento `contact_clicked`, com a origem do botão. Ele é o termômetro do modo empresa.
- **Fonte do texto:** `src/content/empresas.json`.

**Para as IAs:**
- `llms.txt` e `llms-full.txt` ganharam a seção de empresas e o FAQ de empresas.
- `/empresas` tem dados estruturados: WebPage, BreadcrumbList, HowTo e FAQPage.
- O `robots.txt` cita um por um os robôs das IAs (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended e outros), liberando as páginas públicas e mantendo os convites de fora.
- `/empresas` entrou no sitemap.

**Ligações:** a página inicial agora aponta para `/empresas` no topo, no cartão "Trabalho" e no rodapé.

## 4b. Marca da empresa no grupo (15/10/2026)

**O que faz:** quem organiza abre o painel, toca em "É o amigo secreto da empresa?", sobe o logo e escolhe a cor principal (o site sugere a cor a partir do logo), a secundária (opcional) e o nome da empresa. A partir daí, a escolha do nome, o "você tirou", a lista de presentes e o painel mostram o logo e usam a cor da empresa. No pé dessas telas fica o crédito "Sorteio feito com Amigo Oculto Já!".

Como foi feito:
- **Banco:** migração 0009. A marca fica em `groups.theme`, e só a função `rpc_set_group_brand` grava nela. Ela valida as cores e aceita apenas logo dentro da pasta do próprio grupo.
- **Logos:** ficam no bucket público `group-logos`. Só a conta de quem criou o grupo, logada, envia e apaga, e só na pasta daquele grupo. Isso foi testado no banco: dono, outra conta, anônimo e caminho fora da pasta.
- **Arquivo:** o logo é reduzido no navegador para 512 px e convertido para WebP antes de subir.
- **Contraste:** com qualquer cor escolhida, o texto do botão vira branco ou carvão, e os textos na cor da marca são escurecidos até passar no AA (testes em `tests/brand.test.ts`).
- **Grupos sem marca** continuam exatamente iguais.
- **Logo pelo app:** só se envia o logo pelo site (computador ou navegador do celular). No app dá para trocar as cores; o envio do logo pelo app ficaria para depois, porque exige biblioteca nativa nova.
- **Medição:** `group_branded` (catálogo + migração 0010), o sinal de uso corporativo.

## 4c. Planilha da empresa e painel do RH (15/10/2026)

**Onde:** `/empresas/importar`, só no site.

Passo a passo:
1. A empresa baixa o modelo (`public/modelos/amigo-secreto-empresa.xlsx` ou `.csv`, gerados por `scripts/modelo-planilha.py`). As colunas são Nome (obrigatória) e Área (opcional).
2. Envia o arquivo ou cola direto do Excel.
3. Confere a prévia:
   - áreas com menos de 3 pessoas entram juntas em "Outras áreas";
   - áreas com mais de 50 são divididas em blocos seguidos;
   - nomes repetidos são apontados, com a opção de manter só um.
4. Escolhe o nome dos grupos, o valor e a data.
5. O site cria e sorteia um grupo por área. A regra de leitura e divisão está em `src/lib/planilha.ts` (testes em `tests/planilha.test.ts`).

**Onde a planilha é lida:** no navegador. O arquivo não sobe; só os nomes vão para os grupos.

**Lote:** os grupos de uma importação ficam num lote (`organizations`, migração 0011), ligado à conta de quem importou.

**Painel do RH:** `/empresas/lote/[id]` mostra o andamento geral e por grupo e os links de cada grupo (copiar, WhatsApp, baixar planilha com todos). Permite aplicar a marca da empresa em todos os grupos de uma vez.

**Medição:**
- `template_downloaded`: modelo baixado;
- `batch_imported`: importação concluída, com quantos grupos e pessoas.

## 5. Próximos passos de aquisição

### Pessoa física: páginas por intenção de busca
Mesmo modelo da página de empresas: conteúdo em JSON, dados estruturados, FAQ própria e CTA para criar o grupo.
- `/amigo-secreto-online`: o termo de maior volume (estimativa de 130 a 230 mil buscas por mês, não verificada).
- `/sorteio-amigo-secreto-whatsapp`
- `/amigo-secreto-virtual`: à distância, família em outras cidades.
- `/amigo-oculto-familia`
- `/presente-amigo-secreto-ate-50-reais` e `/ate-100-reais`: guias de presente com links de afiliado. É a página que mais converte em receita.
- `/brincadeiras-amigo-secreto`: amigo da onça, rouba-presente, regras.
- `/comparativo`: "qual o melhor site de amigo secreto", honesto, com a tabela da seção 1. As IAs citam muito páginas de comparação.

### Aparecer nas IAs (ChatGPT, Gemini, Perplexity, Claude)
1. **Bing Webmaster Tools:** cadastrar o site e enviar o sitemap. A busca do ChatGPT e o Copilot usam o índice do Bing.
2. **Google Search Console:** enviar o sitemap e pedir a indexação de `/empresas`. Isso alimenta o Gemini e as respostas com IA do Google.
3. **Entrar nas listas brasileiras:** escrever para os autores das matérias de Tecnoblog, Canaltech, TecMundo, Olhar Digital e Mobills antes de novembro, quando elas são atualizadas. Hoje é o maior gargalo.
4. **Fichas nas lojas** (Play e App Store) com "amigo secreto" e "amigo oculto". Quando as duas forem aprovadas, ligar os links no site e nos dados estruturados (`sameAs`).
5. **Medir:** `session_started` já guarda a origem. Visitas vindas de chatgpt.com, perplexity.ai e gemini.google.com aparecem em `analytics.origens()`.
